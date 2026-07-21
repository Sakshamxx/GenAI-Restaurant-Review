"""
ReviewFlow AI — QR Code Routes
Handles generation, download, preview, list, and statistics of restaurant QR codes.

QR content is the restaurant review funnel URL built from FRONTEND_ORIGIN.
"""

import re
from fastapi import APIRouter, HTTPException, status, Request
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from services.supabase_service import supabase_client
from services.qr_service import generate_qr_png, build_review_funnel_url

router = APIRouter(prefix="/api/qr", tags=["qr"])


class QRGenerateRequest(BaseModel):
    restaurant_id: str


# ─── Helper ────────────────────────────────────────────────────────────────────

def _get_restaurant(restaurant_id: str) -> dict:
    """
    Fetch the full restaurant row from Supabase.
    Raises 404 if not found.
    """
    if supabase_client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured for this deployment.")

    res = supabase_client.table("restaurants").select("*").eq("id", restaurant_id).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restaurant {restaurant_id} not found.",
        )
    return res.data[0]


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/list")
async def list_qr_codes(owner_id: str):
    """
    Return QR codes and metrics for all restaurants owned by this owner.
    """
    try:
        rest_res = supabase_client.table("restaurants").select("*").eq("owner_id", owner_id).execute()
        if not rest_res.data:
            return JSONResponse([])

        results = []
        for r in rest_res.data:
            r_id   = r["id"]
            r_name = r["restaurant_name"]

            qr_res   = supabase_client.table("qr_codes").select("*").eq("restaurant_id", r_id).execute()
            qr_data  = qr_res.data[0] if qr_res.data else None

            rev_res      = supabase_client.table("reviews").select("redirected_to_google, google_redirected").eq("restaurant_id", r_id).execute()
            review_count  = len(rev_res.data) if rev_res.data else 0
            redirect_count = sum(1 for x in (rev_res.data or []) if x.get("redirected_to_google") or x.get("google_redirected"))

            feed_res      = supabase_client.table("feedback").select("id").eq("restaurant_id", r_id).execute()
            feedback_count = len(feed_res.data) if feed_res.data else 0

            results.append({
                "restaurant_id":     r_id,
                "restaurant_name":   r_name,
                "google_review_link": r.get("google_review_link", ""),
                "qr_id":             qr_data["id"] if qr_data else None,
                "qr_image_url":      qr_data["qr_image_url"] if qr_data else "",
                "total_scans":       qr_data["total_scans"] if qr_data else 0,
                "review_count":      review_count,
                "redirect_count":    redirect_count,
                "feedback_count":    feedback_count,
            })

        return JSONResponse(results)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[list_qr_codes] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/restaurants")
async def get_restaurants(owner_id: str):
    """Return all restaurants owned by this owner."""
    try:
        res = supabase_client.table("restaurants").select("*").eq("owner_id", owner_id).execute()
        return JSONResponse({"restaurants": res.data or []})
    except Exception as e:
        print(f"[get_restaurants] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate_qr(payload: QRGenerateRequest, request: Request):
    """
    Generate (or regenerate) a QR code for a restaurant.
    QR encodes the restaurant review funnel URL.
    Uploads PNG to Supabase Storage and upserts qr_codes record.
    """
    try:
        restaurant    = _get_restaurant(payload.restaurant_id)
        restaurant_id = restaurant["id"]
        restaurant_name = restaurant["restaurant_name"]
        google_review_link = restaurant.get("google_review_link", "")

        if not google_review_link:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="google_review_link is not set. Add it in Settings before generating a QR code.",
            )

        if not google_review_link.startswith(('http://', 'https://')):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="google_review_link must be a valid absolute URL")

        review_funnel_url = build_review_funnel_url(restaurant_id, request.headers.get('origin'))
        qr_bytes = generate_qr_png(qr_url=review_funnel_url, restaurant_name=restaurant_name)

        # Upload to Supabase Storage (overwrite existing)
        file_path = f"qr_{restaurant_id}.png"
        try:
            supabase_client.storage.from_("qr-codes").remove([file_path])
        except Exception:
            pass

        supabase_client.storage.from_("qr-codes").upload(
            path=file_path,
            file=qr_bytes,
            file_options={"content-type": "image/png"},
        )
        public_url = supabase_client.storage.from_("qr-codes").get_public_url(file_path)

        # Upsert qr_codes record
        qr_check = supabase_client.table("qr_codes").select("id").eq("restaurant_id", restaurant_id).execute()
        if qr_check.data:
            supabase_client.table("qr_codes").update({
                "qr_image_url": public_url,
            }).eq("restaurant_id", restaurant_id).execute()
        else:
            supabase_client.table("qr_codes").insert({
                "restaurant_id": restaurant_id,
                "qr_token":      restaurant_id,
                "qr_image_url":  public_url,
                "total_scans":   0,
            }).execute()

        return JSONResponse({
            "success":       True,
            "message":       "QR Code generated successfully.",
            "qr_image_url":  public_url,
            "qr_content":    review_funnel_url,
            "google_review_link": google_review_link,
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"[generate_qr] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview/{restaurant_id}")
async def preview_qr(restaurant_id: str, request: Request):
    """
    Return a QR code PNG for inline preview.
    QR encodes the restaurant review funnel URL.
    """
    try:
        restaurant         = _get_restaurant(restaurant_id)
        restaurant_name    = restaurant["restaurant_name"]
        google_review_link = restaurant.get("google_review_link", "")

        if not google_review_link:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="google_review_link not set. Add it in Settings.",
            )

        review_funnel_url = build_review_funnel_url(restaurant_id, request.headers.get('origin'))
        print(f"[preview_qr] restaurant_id={restaurant_id} url={review_funnel_url}")
        qr_bytes = generate_qr_png(qr_url=review_funnel_url, restaurant_name=restaurant_name)

        return Response(
            content=qr_bytes,
            media_type="image/png",
            headers={"Cache-Control": "no-cache"},
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[preview_qr] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Keep the old token-based preview route as an alias so existing cached
# image src URLs in the browser don't immediately 404.
@router.get("/preview/{restaurant_id}/{token}")
async def preview_qr_with_token(restaurant_id: str, token: str, request: Request):
    """Legacy route — token param is ignored; delegates to preview_qr."""
    return await preview_qr(restaurant_id, request)


@router.get("/download/{restaurant_id}")
async def download_qr(restaurant_id: str, request: Request):
    """
    Download the QR code PNG.
    QR encodes the restaurant review funnel URL.
    Filename: {restaurant-name}-qr.png
    """
    try:
        restaurant         = _get_restaurant(restaurant_id)
        restaurant_name    = restaurant["restaurant_name"]
        google_review_link = restaurant.get("google_review_link", "")

        if not google_review_link:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="google_review_link not set. Add it in Settings before downloading.",
            )

        review_funnel_url = build_review_funnel_url(restaurant_id, request.headers.get('origin'))
        print(f"[download_qr] restaurant_id={restaurant_id} url={review_funnel_url}")
        qr_bytes = generate_qr_png(qr_url=review_funnel_url, restaurant_name=restaurant_name)

        safe_name = re.sub(r"[^a-z0-9\-]", "", restaurant_name.lower().replace(" ", "-"))
        filename  = f"{safe_name or 'restaurant'}-qr.png"

        return Response(
            content=qr_bytes,
            media_type="image/png",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-cache",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[download_qr] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Legacy token-based download — delegates to the clean route.
@router.get("/download/{restaurant_id}/{token}")
async def download_qr_with_token(restaurant_id: str, token: str, request: Request):
    """Legacy route — token param is ignored; delegates to download_qr."""
    return await download_qr(restaurant_id, request)


@router.delete("/{restaurant_id}")
async def delete_qr(restaurant_id: str):
    """Delete the QR code record and stored image for a restaurant."""
    try:
        supabase_client.table("qr_codes").delete().eq("restaurant_id", restaurant_id).execute()
        try:
            supabase_client.storage.from_("qr-codes").remove([f"qr_{restaurant_id}.png"])
        except Exception:
            pass
        return JSONResponse({"success": True, "message": "QR Code deleted."})
    except Exception as e:
        print(f"[delete_qr] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan/{restaurant_id}")
async def increment_scans(restaurant_id: str):
    """Increment the total scan counter for a restaurant's QR code."""
    try:
        qr_check = supabase_client.table("qr_codes").select("*").eq("restaurant_id", restaurant_id).execute()
        if not qr_check.data:
            supabase_client.table("qr_codes").insert({
                "restaurant_id": restaurant_id,
                "qr_token":      restaurant_id,
                "qr_image_url":  "",
                "total_scans":   1,
            }).execute()
            current_scans = 1
        else:
            current_scans = (qr_check.data[0].get("total_scans") or 0) + 1
            supabase_client.table("qr_codes").update({
                "total_scans": current_scans,
            }).eq("restaurant_id", restaurant_id).execute()

        # Log activity_logs
        try:
            supabase_client.table("activity_logs").insert({
                "restaurant_id": restaurant_id,
                "activity_type": "qr_scanned",
                "customer_name": "Anonymous",
                "review_text": "",
                "feedback_text": "",
                "metadata": {}
            }).execute()
            print(f"[increment_scans] Logged qr_scanned activity for {restaurant_id}")
        except Exception as log_err:
            print(f"[increment_scans] Failed to insert activity_log: {log_err}")

        return JSONResponse({
            "success":      True,
            "message":      "Scans incremented.",
            "total_scans":  current_scans,
        })
    except Exception as e:
        print(f"[increment_scans] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/restaurant-lookup")
async def restaurant_lookup(restaurant_id: str):
    """Return restaurant name and Google review URL by restaurant ID."""
    if supabase_client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured for this deployment.")

    try:
        res = supabase_client.table("restaurants").select("restaurant_name, google_review_link").eq("id", restaurant_id).maybeSingle().execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Restaurant {restaurant_id} not found.")
        return JSONResponse({
            "restaurant_id": restaurant_id,
            "restaurant_name": res.data.get("restaurant_name", ""),
            "google_review_link": res.data.get("google_review_link", ""),
        })
    except HTTPException:
        raise
    except Exception as e:
        print(f"[restaurant_lookup] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
