"""
ReviewFlow AI — Sentiment Inference Service

Loads and serves the new Transformer-based sentiment model at startup.
"""

import re
import pickle
import unicodedata
import logging
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────────
MODELS_DIR = Path(__file__).parent.parent / "src" / "Model"
SENTIMENT_DIR = MODELS_DIR


class _PositionalEncoding(nn.Module):
    def __init__(self, max_len, embed_dim):
        super().__init__()
        self.pe = nn.Parameter(torch.zeros(1, max(5000, max_len), embed_dim))


class _TransformerEncoderBlock(nn.Module):
    def __init__(self, embed_dim, num_heads, ff_dim, dropout):
        super().__init__()
        self.norm1 = nn.LayerNorm(embed_dim)
        self.self_attn = nn.MultiheadAttention(embed_dim, num_heads, dropout=dropout, batch_first=True)
        self.norm2 = nn.LayerNorm(embed_dim)
        self.linear1 = nn.Linear(embed_dim, ff_dim)
        self.linear2 = nn.Linear(ff_dim, embed_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, key_padding_mask=None):
        residual = x
        x = self.norm1(x)
        attn_output, _ = self.self_attn(x, x, x, key_padding_mask=key_padding_mask)
        x = residual + attn_output

        residual = x
        x = self.norm2(x)
        x = self.linear2(self.dropout(F.gelu(self.linear1(x))))
        return residual + x


class _TransformerEncoder(nn.Module):
    def __init__(self, embed_dim, num_heads, ff_dim, dropout, num_layers):
        super().__init__()
        self.layers = nn.ModuleList([
            _TransformerEncoderBlock(embed_dim, num_heads, ff_dim, dropout) for _ in range(num_layers)
        ])


class _SentimentTransformer(nn.Module):
    def __init__(self, vocab_size, num_classes, d_model, n_heads, n_layers, hidden_dim, max_len, dropout):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, d_model, padding_idx=0)
        self.positional_encoding = _PositionalEncoding(max_len, d_model)
        self.encoder = _TransformerEncoder(d_model, n_heads, hidden_dim, dropout, n_layers)
        self.fc = nn.Linear(d_model, num_classes)

    def forward(self, input_ids, attention_mask=None):
        x = self.embedding(input_ids)
        x = x + self.positional_encoding.pe[:, : x.size(1), :]
        key_padding_mask = None if attention_mask is None else (attention_mask == 0)
        for layer in self.encoder.layers:
            x = layer(x, key_padding_mask)
        if attention_mask is not None:
            mask = attention_mask.unsqueeze(-1).float()
            x = (x * mask).sum(1) / mask.sum(1).clamp(min=1e-9)
        else:
            x = x.mean(1)
        return self.fc(x)


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

_sentiment_model = None
_sentiment_vocab = None
_sentiment_le = None
_sentiment_max_len = 128

_models_loaded = False


def _load_models():
    """Load the new sentiment transformer model from disk."""
    global _sentiment_model, _sentiment_vocab, _sentiment_le, _sentiment_max_len
    global _models_loaded

    try:
        with open(SENTIMENT_DIR / "config.pkl", "rb") as f:
            cfg = pickle.load(f)
        with open(SENTIMENT_DIR / "vocab.pkl", "rb") as f:
            _sentiment_vocab = pickle.load(f)
        with open(SENTIMENT_DIR / "label_encoder.pkl", "rb") as f:
            _sentiment_le = pickle.load(f)

        _sentiment_max_len = int(cfg.get("max_len", 128))
        device = (
            torch.device("mps") if torch.backends.mps.is_available() else
            torch.device("cuda") if torch.cuda.is_available() else
            torch.device("cpu")
        )
        model = _SentimentTransformer(
            vocab_size=int(cfg.get("vocab_size", 20000)),
            num_classes=int(cfg.get("num_classes", 3)),
            d_model=int(cfg.get("d_model", 128)),
            n_heads=int(cfg.get("n_heads", 4)),
            n_layers=int(cfg.get("n_layers", 2)),
            hidden_dim=int(cfg.get("hidden_dim", 256)),
            max_len=int(cfg.get("max_len", 128)),
            dropout=float(cfg.get("dropout", 0.2)),
        ).to(device)
        model.load_state_dict(torch.load(SENTIMENT_DIR / "transformer_model.pth", map_location=device))
        model.eval()
        _sentiment_model = model
        logger.info(f"[ml_service] Sentiment Transformer loaded on {device} ✓")
    except Exception as e:
        logger.error(f"[ml_service] Failed to load Sentiment Transformer: {e}")

    _models_loaded = True
    logger.info("[ml_service] Sentiment model initialised.")


# ─────────────────────────────────────────────────────────────────────────────
#  Public helper
# ─────────────────────────────────────────────────────────────────────────────

def analyze_text(text: str) -> dict:
    """Run the sentiment model on the supplied review or feedback text."""
    if not _models_loaded:
        logger.warning("[ml_service] Models not initialised; returning defaults")

    result = {
        "sentiment": "Positive",
        "sentiment_confidence": 0.9,
    }

    clean_text = text.strip() if text else ""
    if not clean_text:
        return result

    try:
        if _sentiment_model and _sentiment_vocab and _sentiment_le:
            prep = _preprocess(clean_text)
            ids, mask = _text_to_ids(prep, _sentiment_vocab, max_len=_sentiment_max_len)
            input_ids = torch.tensor([ids], dtype=torch.long)
            attention_mask = torch.tensor([mask], dtype=torch.long)
            device = next(_sentiment_model.parameters()).device
            input_ids = input_ids.to(device)
            attention_mask = attention_mask.to(device)
            with torch.no_grad():
                logits = _sentiment_model(input_ids, attention_mask)
                probs = F.softmax(logits, dim=1).cpu().numpy()[0]
                pred = int(probs.argmax())
                score = float(probs.max())
            label = str(_sentiment_le.inverse_transform([pred])[0])
            result["sentiment"] = label
            result["sentiment_confidence"] = round(score, 4)
    except Exception as e:
        logger.warning(f"[ml_service] Sentiment inference failed: {e}")

    return result


# NOTE: models are no longer loaded on import. Use `services.ml_pipeline.load_models()`
# to initialise models at application startup (FastAPI startup event).
