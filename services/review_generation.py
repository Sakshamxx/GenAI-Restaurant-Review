"""
Review generation wrapper service

Provides a stable interface `generate_suggestions()` that calls the Gemini-based
`gemini_service.generate_reviews` and enforces the API contract.
"""
import logging
from typing import List
from services.gemini_service import generate_reviews

logger = logging.getLogger(__name__)


async def generate_suggestions(food_rating: int, service_rating: int, ambience_rating: int,
                               food_tags: List[str] = None, service_tags: List[str] = None, ambience_tags: List[str] = None) -> List[str]:
    """Return 3 review suggestions. Ensures a stable fallback and logs failures."""
    food_tags = food_tags or []
    service_tags = service_tags or []
    ambience_tags = ambience_tags or []
    try:
        reviews = await generate_reviews(food_rating, service_rating, ambience_rating, food_tags, service_tags, ambience_tags)
        if not reviews or len(reviews) != 3:
            logger.warning("[review_generation] Gemini returned unexpected result; falling back")
            return []
        return reviews
    except Exception as e:
        logger.exception("[review_generation] Generation failed: %s", e)
        return []
