"""
ReviewFlow AI — Private Feedback Routes

Handles private feedback submission, storing in Supabase 'feedback' table,
email alerts via Resend to the restaurant owner, and listing feedback.

ML pipeline enriches every submission with:
  - category  (predicted by Complaint Classifier Transformer)
  - severity  (predicted by Severity Logistic Regression)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from services.supabase_service import supabase_client
from services.email_service import send_feedback_notification
from services.ml_service import analyze_text

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackSubmitRequest(BaseModel):
    restaurant_id: str
    customer_name: str = "Anonymous"
    customer_email: str = "anonymous@example.com"
    feedback_categories: list[str] = Field(default=[], description="Optional user-supplied complaint categories")
    feedback_message: str = Field(..., description="Customer feedback text")
    rating_summary: str = "N/A"   # e.g. "Food: 2/5, Service: 3/5, Ambience: 2/5"


class FeedbackSubmitResponse(BaseModel):
    success: bool
    message: str


@router.post("/submit", response_model=FeedbackSubmitResponse)
async def submit_feedback(request: FeedbackSubmitRequest):
    """
    Submit private feedback:
    1. Run ML pipeline on feedback_message to get predicted category & severity.
    2. Fetch restaurant details (name, owner_email) from Supabase.
    3. Insert enriched feedback record into Supabase 'feedback' table.
    4. Send Resend email notification to the restaurant owner.
    """
    try:
        if not request.feedback_message.strip():
            raise HTTPException(status_code=400, detail="Feedback message cannot be empty.")

        print(f"[submit_feedback] Received feedback for restaurant {request.restaurant_id}")
        print(f"[submit_feedback] feedback_message: {request.feedback_message[:120]}...")

        # ── 1. ML Enrichment ──────────────────────────────────────────────
        ml_result = analyze_text(request.feedback_message)
        print(f"[submit_feedback] ML result: {ml_result}")

        # ML-predicted category and severity take precedence over user-supplied ones
        ml_category = ml_result.get("category", "General Dissatisfaction")
        ml_severity  = ml_result.get("severity", "Medium")

        # ── 2. Fetch restaurant record ────────────────────────────────────
        rest_res = (
            supabase_client
            .table("restaurants")
            .select("*")
            .eq("id", request.restaurant_id)
            .execute()
        )
        print(f"[submit_feedback] Restaurant lookup: {rest_res.data}")

        if not rest_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Restaurant not found.",
            )

        restaurant      = rest_res.data[0]
        restaurant_name = restaurant.get("restaurant_name", "Your Restaurant")
        owner_email     = restaurant.get("owner_email", "")

        if not owner_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No owner email is configured for this restaurant.",
            )

        # ── 3. Build and insert feedback record ───────────────────────────
        feedback_data = {
            "restaurant_id":  request.restaurant_id,
            "customer_name":  request.customer_name,
            "customer_email": request.customer_email,
            "category":       ml_category,
            "severity":       ml_severity,
            "feedback_text":  request.feedback_message,
            "resolved":       False,
        }

        print(f"[submit_feedback] Inserting feedback_data: {feedback_data}")
        feed_insert = supabase_client.table("feedback").insert(feedback_data).execute()
        print(f"[submit_feedback] Supabase response: {feed_insert.data}")

        if not feed_insert.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record private feedback.",
            )

        # ── 4. Email notification ─────────────────────────────────────────
        email_sent = send_feedback_notification(
            restaurant_name=restaurant_name,
            rating=request.rating_summary,
            feedback_message=request.feedback_message,
            owner_email=owner_email,
        )

        return FeedbackSubmitResponse(
            success=True,
            message=(
                "Feedback submitted. Owner notified."
                if email_sent
                else "Feedback submitted. Email notification failed."
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[submit_feedback] Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/list")
async def list_feedback(restaurant_id: str):
    """
    List all private feedback for a given restaurant, ordered newest-first.
    """
    try:
        print(f"[list_feedback] Fetching feedback for restaurant {restaurant_id}")
        res = (
            supabase_client
            .table("feedback")
            .select("*")
            .eq("restaurant_id", restaurant_id)
            .order("created_at", desc=True)
            .execute()
        )
        print(f"[list_feedback] Found {len(res.data or [])} records")
        return JSONResponse(res.data or [])
    except Exception as e:
        print(f"[list_feedback] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
