"""
ReviewFlow AI — Review Generation & Management Routes

Handles:
  - Generating 3 AI review suggestions via Gemini (POST /api/reviews/generate)
  - Submitting a review record to Supabase with ML enrichment (POST /api/reviews/submit)
  - Listing reviews for a restaurant (GET /api/reviews/list)
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
import logging

from services.review_generation import generate_suggestions
from services.supabase_service import supabase_client
from services.ml_service import analyze_text
from services.decision_engine import decide
from services.review_generation import generate_suggestions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

from schemas.review import (
    ReviewGenerationRequest,
    ReviewGenerationResponse,
    ReviewSubmitRequest,
    ReviewSubmitResponse,
)


def _build_generation_payload(reviews: list[str], requested_count: int) -> dict:
    """Return the payload shape expected by the frontend for suggestion generation."""
    return {
        "reviews": reviews[:requested_count],
        "suggestions": reviews[:requested_count],
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=ReviewGenerationResponse)
async def generate_review_suggestions(request: ReviewGenerationRequest):
    """
    Generate review suggestions using Gemini.
    """
    food_tags = (request.food_tags or [])[:3]
    service_tags = (request.service_tags or [])[:3]
    ambience_tags = (request.ambience_tags or [])[:3]
    requested_count = max(1, min(request.count or 3, 5))

    reviews = await generate_suggestions(
        request.food_rating or 5,
        request.service_rating or 5,
        request.ambience_rating or 5,
        food_tags,
        service_tags,
        ambience_tags,
    )

    if not reviews:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate reviews. Please try again."
        )

    reviews = reviews[:requested_count]

    # Log to activity_logs
    if request.restaurant_id:
        try:
            supabase_client.table("activity_logs").insert({
                "restaurant_id": request.restaurant_id,
                "activity_type": "review_generated",
                "customer_name": "Anonymous",
                "rating": round((request.food_rating + request.service_rating + request.ambience_rating) / 3, 1),
                "review_text": "",
                "feedback_text": "",
                "metadata": {
                    "food_rating": request.food_rating,
                    "service_rating": request.service_rating,
                    "ambience_rating": request.ambience_rating,
                    "food_tags": food_tags,
                    "service_tags": service_tags,
                    "ambience_tags": ambience_tags
                }
            }).execute()
            print(f"[generate_review_suggestions] Logged review_generated activity for {request.restaurant_id}")
        except Exception as log_err:
            print(f"[generate_review_suggestions] Failed to insert activity_log: {log_err}")

    return JSONResponse(_build_generation_payload(reviews, requested_count))


@router.post("/submit")
async def submit_review(request: ReviewSubmitRequest):
    """
    Submit a review record to Supabase, enriched with ML sentiment analysis.

    ML pipeline runs on review_text to obtain:
      - sentiment  (Positive | Neutral | Negative)
      - sentiment_score (0-1 confidence)
    """
    try:
        logger.info("[submit_review] Received review for restaurant %s", request.restaurant_id)

        # Run ML pipeline (sentiment, complaint, severity) — driver for routing
        ml_result = analyze_text(request.review_text)
        logger.info("[submit_review] ML result: %s", ml_result)

        # Decision engine — uses ML predictions only
        decision = decide(ml_result)

        # Core review record — only essential fields guaranteed to exist in schema
        review_data = {
            "restaurant_id": request.restaurant_id,
            "review_text": request.review_text,
            "user_rating": round(request.overall_rating) if request.overall_rating is not None else None,
            "food_rating": request.food_rating,
            "service_rating": request.service_rating,
            "ambience_rating": request.ambience_rating,
            "google_redirected": request.redirected_to_google,
        }
        
        # Optional ML enrichment fields (try to include but don't fail if schema doesn't have them)
        ml_enrichment = {
            "sentiment_prediction": ml_result.get("sentiment"),
            "sentiment_confidence": ml_result.get("sentiment_confidence"),
            "complaint_category": ml_result.get("complaint_category"),
            "complaint_confidence": ml_result.get("complaint_confidence"),
            "severity_prediction": ml_result.get("severity"),
            "severity_confidence": ml_result.get("severity_confidence"),
            "keywords": ml_result.get("keywords", []),
            "route_decision": decision.get("route_decision"),
            "decision_reason": decision.get("reason"),
        }
        
        # Only add ML fields if they're non-None
        for key, value in ml_enrichment.items():
            if value is not None:
                review_data[key] = value

        google_review_link = None
        if request.restaurant_id and supabase_client is not None:
            try:
                restaurant_res = (
                    supabase_client
                    .table("restaurants")
                    .select("google_review_link")
                    .eq("id", request.restaurant_id)
                    .execute()
                )
                if restaurant_res.data:
                    google_review_link = restaurant_res.data[0].get("google_review_link")
            except Exception:
                logger.exception("[submit_review] Failed to fetch restaurant redirect URL")

        if supabase_client is None:
            logger.warning("[submit_review] Supabase client not configured; skipping DB insert")
            stored = None
        else:
            logger.debug("[submit_review] Inserting review_data to Supabase")
            from services.supabase_service import safe_insert

            # Try to insert with all fields; if schema doesn't have ML columns, they'll be silently skipped
            stored = safe_insert("reviews", review_data)

        # Log activity
        try:
            if supabase_client is not None:
                from services.supabase_service import safe_insert

                safe_insert("activity_logs", {
                    "restaurant_id": request.restaurant_id,
                    "activity_type": "review_submitted",
                    "customer_name": "Anonymous",
                    "rating": request.overall_rating,
                    "review_text": request.review_text,
                    "feedback_text": "",
                    "metadata": {
                        "ml": ml_result,
                        "decision": decision,
                    }
                })
        except Exception:
            logger.exception("[submit_review] Failed to log activity")

        suggestions = []
        if decision.get("route_decision") == "positive_flow":
            # Generate 3 review suggestions (non-blocking best-effort)
            try:
                suggestions = await generate_suggestions(
                    request.food_rating or 5,
                    request.service_rating or 5,
                    request.ambience_rating or 5,
                    [], [], []
                )
            except Exception:
                suggestions = []

        return JSONResponse({
            "success": True,
            "message": "Review processed.",
            "review": stored,
            "ml": ml_result,
            "decision": decision,
            "suggestions": suggestions,
            "google_review_link": google_review_link,
        })

    except Exception as e:
        logger.exception("[submit_review] Error processing review")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/list")
async def list_reviews(restaurant_id: str):
    """
    List all reviews for a given restaurant, ordered newest-first.
    """
    try:
        print(f"[list_reviews] Fetching reviews for restaurant {restaurant_id}")
        res = (
            supabase_client
            .table("reviews")
            .select("*")
            .eq("restaurant_id", restaurant_id)
            .order("created_at", desc=True)
            .execute()
        )
        print(f"[list_reviews] Found {len(res.data or [])} reviews")
        return JSONResponse(res.data or [])
    except Exception as e:
        print(f"[list_reviews] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
