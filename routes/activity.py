"""
ReviewFlow AI — Activity Logging Routes
Handles inserting and querying customer activity logs from Supabase.
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.supabase_service import supabase_client

router = APIRouter(prefix="/api/activity", tags=["activity"])


class ActivityLogRequest(BaseModel):
    restaurant_id: str
    activity_type: str
    customer_name: str | None = "Anonymous"
    rating: float | None = None
    review_text: str | None = ""
    feedback_text: str | None = ""
    metadata: dict | None = {}


@router.post("/log")
async def log_activity(request: ActivityLogRequest):
    """
    Log a new customer activity in the activity_logs table.
    """
    try:
        activity_data = {
            "restaurant_id": request.restaurant_id,
            "activity_type": request.activity_type,
            "customer_name": request.customer_name or "Anonymous",
            "rating": request.rating,
            "review_text": request.review_text or "",
            "feedback_text": request.feedback_text or "",
            "metadata": request.metadata or {},
        }
        
        print(f"[log_activity] Inserting activity: {activity_data}")
        res = supabase_client.table("activity_logs").insert(activity_data).execute()
        print(f"[log_activity] Supabase response: {res.data}")
        
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to insert activity log."
            )
            
        return JSONResponse({
            "success": True,
            "message": "Activity logged successfully.",
            "activity": res.data[0]
        })
    except Exception as e:
        print(f"[log_activity] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/list")
async def list_activities(restaurant_id: str, limit: int = 50):
    """
    List all activities for a given restaurant, ordered by created_at desc.
    """
    try:
        print(f"[list_activities] Fetching logs for restaurant {restaurant_id}")
        res = (
            supabase_client
            .table("activity_logs")
            .select("*")
            .eq("restaurant_id", restaurant_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        print(f"[list_activities] Found {len(res.data or [])} activities")
        return JSONResponse(res.data or [])
    except Exception as e:
        print(f"[list_activities] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/stats")
async def get_activity_stats(restaurant_id: str):
    """
    Aggregate real stats from the activity_logs table for a restaurant.
    """
    try:
        print(f"[get_activity_stats] Aggregating stats for restaurant {restaurant_id}")
        
        # Fetch all logs for this restaurant
        res = (
            supabase_client
            .table("activity_logs")
            .select("activity_type, rating")
            .eq("restaurant_id", restaurant_id)
            .execute()
        )
        
        logs = res.data or []
        
        total_scans = sum(1 for log in logs if log.get("activity_type") == "qr_scanned")
        total_reviews = sum(1 for log in logs if log.get("activity_type") in ("positive_review", "review_generated"))
        redirects = sum(1 for log in logs if log.get("activity_type") == "google_redirect")
        total_feedback = sum(1 for log in logs if log.get("activity_type") in ("private_feedback", "complaint_submitted"))
        
        # Calculate average rating from all logs with a rating
        ratings = [log["rating"] for log in logs if log.get("rating") is not None]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0
        
        redirect_rate = round((redirects / total_scans) * 100) if total_scans > 0 else 0
        
        return JSONResponse({
            "totalReviews": total_reviews,
            "totalFeedback": total_feedback,
            "avgRating": avg_rating,
            "totalScans": total_scans,
            "redirects": redirects,
            "redirectRate": redirect_rate
        })
    except Exception as e:
        print(f"[get_activity_stats] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
