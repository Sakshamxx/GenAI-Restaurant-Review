"""
Decision Engine — prediction-driven routing

Uses model outputs only to determine the next action for a review.
Returns a concise `route_decision` and descriptive `actions` list.
"""
from typing import Dict, List


def decide(ml_result: Dict) -> Dict:
    """Decide next steps based solely on ML predictions.

    ml_result must contain keys:
      - sentiment (Positive|Neutral|Negative)
      - severity (Low|Medium|High|Critical)

    Returns:
      {"route_decision": "positive_flow"|"neutral_flow"|"negative_flow",
       "actions": [...],
       "reason": "..."}
    """
    sentiment = (ml_result.get("sentiment") or "").strip().lower()
    severity = (ml_result.get("severity") or "").strip().lower()

    # Normalize
    if sentiment == "positive" and severity == "low":
        return {
            "route_decision": "positive_flow",
            "actions": [
                "generate_review_suggestions",
                "show_google_cta",
                "store_predictions",
            ],
            "reason": "Sentiment positive and severity low",
        }

    if sentiment == "neutral":
        return {
            "route_decision": "neutral_flow",
            "actions": [
                "ask_for_additional_feedback",
                "store_predictions",
            ],
            "reason": "Sentiment neutral",
        }

    # Negative sentiment OR elevated severity => private feedback
    if sentiment == "negative" or severity in {"medium", "high", "critical"}:
        return {
            "route_decision": "negative_flow",
            "actions": [
                "open_private_feedback_form",
                "notify_restaurant_dashboard",
                "store_predictions",
            ],
            "reason": "Negative sentiment or elevated severity",
        }

    # Fallback: treat as neutral
    return {
        "route_decision": "neutral_flow",
        "actions": ["ask_for_additional_feedback", "store_predictions"],
        "reason": "Fallback: unable to determine; default neutral",
    }
