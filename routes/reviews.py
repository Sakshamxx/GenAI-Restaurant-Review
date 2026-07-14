"""
ReviewFlow AI — Review Generation & Management Routes

Handles:
  - Generating 3 AI review suggestions via Gemini (POST /api/reviews/generate)
  - Submitting a review record to Supabase with ML enrichment (POST /api/reviews/submit)
  - Listing reviews for a restaurant (GET /api/reviews/list)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from services.gemini_service import generate_reviews
from services.supabase_service import supabase_client
from services.ml_service import analyze_text

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


# ─── Request / Response Models ────────────────────────────────────────────────

class ReviewGenerationRequest(BaseModel):
    food_rating: int = Field(..., ge=1, le=5, description="Food rating 1-5")
    service_rating: int = Field(..., ge=1, le=5, description="Service rating 1-5")
    ambience_rating: int = Field(..., ge=1, le=5, description="Ambience rating 1-5")
    food_tags: list[str] = Field(default=[], description="Max 3 food tags")
    service_tags: list[str] = Field(default=[], description="Max 3 service tags")
    ambience_tags: list[str] = Field(default=[], description="Max 3 ambience tags")


class ReviewGenerationResponse(BaseModel):
    reviews: list[str]


class ReviewSubmitRequest(BaseModel):
    restaurant_id: str
    food_rating: int
    service_rating: int
    ambience_rating: int
    overall_rating: int
    review_text: str
    sentiment: str | None = None          # Optional — will be overwritten by ML
    sentiment_score: float | None = None  # Optional — will be overwritten by ML
    redirected_to_google: bool = True


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=ReviewGenerationResponse)
async def generate_review_suggestions(request: ReviewGenerationRequest):
    """
    Generate 3 distinct AI review suggestions using Gemini.
    """
    food_tags    = request.food_tags[:3]
    service_tags = request.service_tags[:3]
    ambience_tags = request.ambience_tags[:3]

    reviews = await generate_reviews(
        food_rating=request.food_rating,
        service_rating=request.service_rating,
        ambience_rating=request.ambience_rating,
        food_tags=food_tags,
        service_tags=service_tags,
        ambience_tags=ambience_tags,
    )

    if not reviews or len(reviews) != 3:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate reviews. Please try again."
        )

    return ReviewGenerationResponse(reviews=reviews)


@router.post("/submit")
async def submit_review(request: ReviewSubmitRequest):
    """
    Submit a review record to Supabase, enriched with ML sentiment analysis.

    ML pipeline runs on review_text to obtain:
      - sentiment  (Positive | Neutral | Negative)
      - sentiment_score (0-1 confidence)
    """
    try:
        print(f"[submit_review] Received review for restaurant {request.restaurant_id}")
        print(f"[submit_review] review_text: {request.review_text[:120]}...")

        # ── ML Enrichment ─────────────────────────────────────────────────
        ml_result = analyze_text(request.review_text)
        print(f"[submit_review] ML result: {ml_result}")

        sentiment       = ml_result.get("sentiment", request.sentiment or "Positive")
        sentiment_score = ml_result.get("sentiment_score", request.sentiment_score or 0.9)

        # ── Build record ──────────────────────────────────────────────────
        review_data = {
            "restaurant_id":     request.restaurant_id,
            "overall_rating":    request.overall_rating,
            "food_rating":       request.food_rating,
            "service_rating":    request.service_rating,
            "ambience_rating":   request.ambience_rating,
            "review_text":       request.review_text,
            "sentiment":         sentiment,
            "sentiment_score":   sentiment_score,
            "redirected_to_google": request.redirected_to_google,
        }

        print(f"[submit_review] Inserting review_data: {review_data}")
        res = supabase_client.table("reviews").insert(review_data).execute()
        print(f"[submit_review] Supabase response: {res.data}")

        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to insert review into database.",
            )

        return JSONResponse({
            "success": True,
            "message": "Review recorded successfully.",
            "review": res.data[0],
            "ml": ml_result,
        })

    except Exception as e:
        print(f"[submit_review] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
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
