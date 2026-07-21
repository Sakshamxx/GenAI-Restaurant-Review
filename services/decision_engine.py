"""
Decision Engine — prediction-driven routing

Uses model outputs only to determine the next action for a review.
Returns a concise `route_decision` and descriptive `actions` list.
"""
from typing import Dict, List


def decide(ml_result: Dict) -> Dict:
    """Decide next steps based on sentiment only."""
    sentiment = (ml_result.get("sentiment") or "").strip().lower()

    if sentiment == "negative":
        return {
            "route_decision": "negative_flow",
            "actions": [
                "open_private_feedback_form",
                "notify_restaurant_dashboard",
                "store_predictions",
            ],
            "reason": "Negative sentiment",
        }

    if sentiment == "neutral":
        return {
            "route_decision": "neutral_flow",
            "actions": [
                "ask_for_additional_feedback",
                "store_predictions",
            ],
            "reason": "Neutral sentiment",
        }

    return {
        "route_decision": "positive_flow",
        "actions": [
            "generate_review_suggestions",
            "show_google_cta",
            "store_predictions",
        ],
        "reason": "Positive sentiment",
    }
