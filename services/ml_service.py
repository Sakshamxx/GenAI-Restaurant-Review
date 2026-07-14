"""
ReviewFlow AI — ML Inference Service

Loads and serves the three trained models at startup:
  1. Sentiment Analysis  (LogisticRegression + TF-IDF)
  2. Severity Prediction (LogisticRegression + TF-IDF)
  3. Complaint Classifier (Custom Transformer, PyTorch)

Public API
----------
analyze_text(text: str) -> dict
    Returns {
        "sentiment": str,        # Positive | Neutral | Negative
        "sentiment_score": float, # 0-1 confidence
        "severity": str,          # Low | Medium | High | Critical
        "category": str,          # Cleanliness Issue | Food Quality | ...
    }
"""

import os
import re
import json
import math
import pickle
import unicodedata
import logging
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────────
MODELS_DIR = Path(__file__).parent.parent / "Models"
SENTIMENT_DIR = MODELS_DIR / "Sentiment_Analysis"
SEVERITY_DIR  = MODELS_DIR / "Severity"
COMPLAINT_DIR = MODELS_DIR / "Complaints"


# ─────────────────────────────────────────────────────────────────────────────
#  Complaint Transformer Architecture
#  (Must exactly match training code in ML/restaurant_complaint_classifier.ipynb)
# ─────────────────────────────────────────────────────────────────────────────

class _TokenEmbedding(nn.Module):
    def __init__(self, vocab_size, embed_dim):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.embed_dim = embed_dim

    def forward(self, x):
        return self.embedding(x) * math.sqrt(self.embed_dim)


class _PositionalEmbedding(nn.Module):
    def __init__(self, max_len, embed_dim, dropout):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        pe = torch.zeros(max_len, embed_dim)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, embed_dim, 2, dtype=torch.float) * -(math.log(10000.0) / embed_dim)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x):
        return self.dropout(x + self.pe[:, : x.size(1), :])


class _MultiHeadSelfAttention(nn.Module):
    def __init__(self, embed_dim, num_heads, dropout):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim  = embed_dim // num_heads
        self.scale     = math.sqrt(self.head_dim)
        self.W_q = nn.Linear(embed_dim, embed_dim, bias=False)
        self.W_k = nn.Linear(embed_dim, embed_dim, bias=False)
        self.W_v = nn.Linear(embed_dim, embed_dim, bias=False)
        self.W_o = nn.Linear(embed_dim, embed_dim)
        self.attn_dropout = nn.Dropout(p=dropout)

    def forward(self, x, key_padding_mask=None):
        B, T, D = x.shape
        H, dh   = self.num_heads, self.head_dim
        Q = self.W_q(x).view(B, T, H, dh).transpose(1, 2)
        K = self.W_k(x).view(B, T, H, dh).transpose(1, 2)
        V = self.W_v(x).view(B, T, H, dh).transpose(1, 2)
        scores = torch.matmul(Q, K.transpose(-2, -1)) / self.scale
        if key_padding_mask is not None:
            scores = scores.masked_fill(key_padding_mask.unsqueeze(1).unsqueeze(2), float("-inf"))
        attn    = self.attn_dropout(F.softmax(scores, dim=-1))
        context = torch.matmul(attn, V).transpose(1, 2).contiguous().view(B, T, D)
        return self.W_o(context)


class _FeedForwardNetwork(nn.Module):
    def __init__(self, embed_dim, ff_dim, dropout):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embed_dim, ff_dim), nn.GELU(), nn.Dropout(p=dropout),
            nn.Linear(ff_dim, embed_dim), nn.Dropout(p=dropout),
        )

    def forward(self, x):
        return self.net(x)


class _TransformerEncoderBlock(nn.Module):
    def __init__(self, embed_dim, num_heads, ff_dim, dropout):
        super().__init__()
        self.norm1 = nn.LayerNorm(embed_dim)
        self.attn  = _MultiHeadSelfAttention(embed_dim, num_heads, dropout)
        self.norm2 = nn.LayerNorm(embed_dim)
        self.ffn   = _FeedForwardNetwork(embed_dim, ff_dim, dropout)
        self.drop  = nn.Dropout(p=dropout)

    def forward(self, x, key_padding_mask=None):
        x = x + self.drop(self.attn(self.norm1(x), key_padding_mask))
        x = x + self.ffn(self.norm2(x))
        return x


class _ComplaintTransformer(nn.Module):
    def __init__(self, vocab_size, num_classes, embed_dim, num_heads,
                 num_layers, ff_dim, max_len, dropout):
        super().__init__()
        self.token_embedding      = _TokenEmbedding(vocab_size, embed_dim)
        self.positional_embedding = _PositionalEmbedding(max_len, embed_dim, dropout)
        self.encoder_blocks = nn.ModuleList([
            _TransformerEncoderBlock(embed_dim, num_heads, ff_dim, dropout)
            for _ in range(num_layers)
        ])
        self.norm       = nn.LayerNorm(embed_dim)
        self.dense      = nn.Linear(embed_dim, embed_dim // 2)
        self.act        = nn.GELU()
        self.dropout    = nn.Dropout(p=dropout)
        self.classifier = nn.Linear(embed_dim // 2, num_classes)

    def forward(self, input_ids, attention_mask=None):
        kpm = (attention_mask == 0) if attention_mask is not None else None
        x   = self.positional_embedding(self.token_embedding(input_ids))
        for block in self.encoder_blocks:
            x = block(x, kpm)
        x = self.norm(x)
        if attention_mask is not None:
            m = attention_mask.unsqueeze(-1).float()
            x = (x * m).sum(1) / m.sum(1).clamp(min=1e-9)
        else:
            x = x.mean(1)
        return self.classifier(self.dropout(self.act(self.dense(x))))


# ─────────────────────────────────────────────────────────────────────────────
#  Text preprocessing helpers
# ─────────────────────────────────────────────────────────────────────────────

def _preprocess(text: str) -> str:
    """Normalise text for Transformer vocab tokenisation."""
    text = unicodedata.normalize("NFC", text).lower()
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", " ", text)
    text = re.sub(r"[^a-z0-9\s.,!'\?\-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _text_to_ids(text: str, vocab: dict, max_len: int = 128):
    tokens = text.lower().split()[:max_len]
    unk    = vocab.get("<unk>", 1)
    ids    = [vocab.get(t, unk) for t in tokens]
    pad_n  = max_len - len(ids)
    mask   = [1] * len(ids) + [0] * pad_n
    ids    = ids + [0] * pad_n
    return ids, mask


# ─────────────────────────────────────────────────────────────────────────────
#  Model loading — called once at startup
# ─────────────────────────────────────────────────────────────────────────────

_sentiment_vect   = None
_sentiment_model  = None
_sentiment_le     = None   # dict: {id_to_label: {0: "Negative", 1: "Neutral", 2: "Positive"}}

_severity_vect    = None
_severity_model   = None
_severity_le      = None   # dict: {id_to_label: {0: "Low", 1: "Medium", 2: "High", 3: "Critical"}}

_complaint_model  = None
_complaint_vocab  = None
_complaint_le     = None   # sklearn LabelEncoder with .classes_
_complaint_max_len = 128

_models_loaded = False


def _load_models():
    """Load all models from disk. Call once at application startup."""
    global _sentiment_vect, _sentiment_model, _sentiment_le
    global _severity_vect, _severity_model, _severity_le
    global _complaint_model, _complaint_vocab, _complaint_le, _complaint_max_len
    global _models_loaded

    # ── 1. Sentiment ──────────────────────────────────────────────────────
    try:
        with open(SENTIMENT_DIR / "tfidf_vectorizer.pkl", "rb") as f:
            _sentiment_vect = pickle.load(f)
        with open(SENTIMENT_DIR / "sentiment_model.pkl", "rb") as f:
            _sentiment_model = pickle.load(f)
        with open(SENTIMENT_DIR / "label_encoder.pkl", "rb") as f:
            _sentiment_le = pickle.load(f)
        logger.info("[ml_service] Sentiment model loaded ✓")
    except Exception as e:
        logger.error(f"[ml_service] Failed to load Sentiment model: {e}")

    # ── 2. Severity ───────────────────────────────────────────────────────
    try:
        with open(SEVERITY_DIR / "tfidf_vectorizer.pkl", "rb") as f:
            _severity_vect = pickle.load(f)
        with open(SEVERITY_DIR / "logistic_regression.pkl", "rb") as f:
            _severity_model = pickle.load(f)
        with open(SEVERITY_DIR / "severity_label_encoder.pkl", "rb") as f:
            _severity_le = pickle.load(f)
        logger.info("[ml_service] Severity model loaded ✓")
    except Exception as e:
        logger.error(f"[ml_service] Failed to load Severity model: {e}")

    # ── 3. Complaint Classifier (Transformer) ─────────────────────────────
    try:
        with open(COMPLAINT_DIR / "config.json") as f:
            comp_cfg = json.load(f)["model_config"]
        with open(COMPLAINT_DIR / "vocab.pkl", "rb") as f:
            _complaint_vocab = pickle.load(f)
        with open(COMPLAINT_DIR / "label_encoder.pkl", "rb") as f:
            _complaint_le = pickle.load(f)

        _complaint_max_len = comp_cfg.get("max_len", 128)

        device = (
            torch.device("mps")  if torch.backends.mps.is_available() else
            torch.device("cuda") if torch.cuda.is_available() else
            torch.device("cpu")
        )
        model = _ComplaintTransformer(**comp_cfg).to(device)
        model.load_state_dict(
            torch.load(COMPLAINT_DIR / "complaint_transformer_model.pth", map_location=device)
        )
        model.eval()
        _complaint_model = model
        logger.info(f"[ml_service] Complaint Transformer loaded on {device} ✓")
    except Exception as e:
        logger.error(f"[ml_service] Failed to load Complaint Transformer: {e}")

    _models_loaded = True
    logger.info("[ml_service] All ML models initialised.")


# ─────────────────────────────────────────────────────────────────────────────
#  Public helper
# ─────────────────────────────────────────────────────────────────────────────

def analyze_text(text: str) -> dict:
    """
    Run the full ML pipeline on the supplied review / feedback text.

    Returns
    -------
    {
        "sentiment": "Positive" | "Neutral" | "Negative",
        "sentiment_score": float,          # 0–1
        "severity":  "Low" | "Medium" | "High" | "Critical",
        "category":  "Food Quality" | "Service Delay" | "Staff Behavior"
                   | "Cleanliness Issue" | "Pricing Issue"
                   | "General Dissatisfaction" | <other>,
    }
    """
    if not _models_loaded:
        _load_models()

    result = {
        "sentiment": "Positive",
        "sentiment_score": 0.9,
        "severity": "Low",
        "category": "General Dissatisfaction",
    }

    clean_text = text.strip() if text else ""
    if not clean_text:
        return result

    # ── Sentiment ─────────────────────────────────────────────────────────
    if _sentiment_vect and _sentiment_model and _sentiment_le:
        try:
            vec  = _sentiment_vect.transform([clean_text])
            pred = int(_sentiment_model.predict(vec)[0])

            # label_encoder is a plain dict: {id_to_label: {0: "Negative", ...}}
            if isinstance(_sentiment_le, dict):
                id_to_label = _sentiment_le.get("id_to_label", {})
                label = id_to_label.get(pred, id_to_label.get(str(pred), "Positive"))
            else:
                # sklearn LabelEncoder fallback
                label = str(_sentiment_le.inverse_transform([pred])[0])

            # Attempt to get probability for confidence score
            try:
                proba = _sentiment_model.predict_proba(vec)[0]
                score = float(max(proba))
            except Exception:
                score = 0.85

            result["sentiment"]       = label
            result["sentiment_score"] = round(score, 4)
        except Exception as e:
            logger.warning(f"[ml_service] Sentiment inference failed: {e}")

    # ── Severity ──────────────────────────────────────────────────────────
    if _severity_vect and _severity_model and _severity_le:
        try:
            vec  = _severity_vect.transform([clean_text])
            pred = int(_severity_model.predict(vec)[0])

            if isinstance(_severity_le, dict):
                id_to_label = _severity_le.get("id_to_label", {})
                label = id_to_label.get(pred, id_to_label.get(str(pred), "Low"))
            else:
                label = str(_severity_le.inverse_transform([pred])[0])

            result["severity"] = label
        except Exception as e:
            logger.warning(f"[ml_service] Severity inference failed: {e}")

    # ── Complaint Category ────────────────────────────────────────────────
    if _complaint_model and _complaint_vocab and _complaint_le:
        try:
            prep_text = _preprocess(clean_text)
            ids, mask = _text_to_ids(prep_text, _complaint_vocab, max_len=_complaint_max_len)

            input_ids      = torch.tensor([ids],  dtype=torch.long)
            attention_mask = torch.tensor([mask], dtype=torch.long)

            # Move to same device as model
            device = next(_complaint_model.parameters()).device
            input_ids      = input_ids.to(device)
            attention_mask = attention_mask.to(device)

            with torch.no_grad():
                logits     = _complaint_model(input_ids, attention_mask)
                pred_class = int(torch.argmax(logits, dim=1).item())

            # label_encoder is a sklearn LabelEncoder
            if hasattr(_complaint_le, "inverse_transform"):
                label = str(_complaint_le.inverse_transform([pred_class])[0])
            elif isinstance(_complaint_le, dict):
                id_to_label = _complaint_le.get("id_to_label", {})
                label = id_to_label.get(pred_class, id_to_label.get(str(pred_class), "General Dissatisfaction"))
            else:
                label = "General Dissatisfaction"

            result["category"] = label
        except Exception as e:
            logger.warning(f"[ml_service] Complaint inference failed: {e}")

    logger.debug(f"[ml_service] analyze_text result: {result}")
    return result


# Load models eagerly when this module is imported
_load_models()
