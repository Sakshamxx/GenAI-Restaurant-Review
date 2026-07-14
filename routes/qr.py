"""
ReviewFlow AI — QR Code Routes
Handles generation, download, list, and statistics of restaurant-wide QR codes using Supabase.
"""

import httpx
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from services.supabase_service import supabase_client
from services.qr_service import generate_qr_png, get_qr_url

router = APIRouter(prefix="/api/qr", tags=["qr"])


class QRGenerateRequest(BaseModel):
    restaurant_id: str


@router.get("/list")
async def list_qr_codes(owner_id: str):
    """
    Get all QR codes and metrics for restaurants owned by this owner.
    Combines data from: restaurants, qr_codes, reviews, and feedback.
    """
    try:
        # Fetch restaurants owned by owner
        rest_res = supabase_client.table("restaurants").select("*").eq("owner_id", owner_id).execute()
        
        if not rest_res.data:
            return JSONResponse([])

        results = []
        for r in rest_res.data:
            r_id = r["id"]
            r_name = r["restaurant_name"]

            # Fetch QR Code record
            qr_res = supabase_client.table("qr_codes").select("*").eq("restaurant_id", r_id).execute()
            qr_data = qr_res.data[0] if qr_res.data else None

            # Fetch Review counts & google redirects
            rev_res = supabase_client.table("reviews").select("redirected_to_google").eq("restaurant_id", r_id).execute()
            review_count = len(rev_res.data) if rev_res.data else 0
            redirect_count = sum(1 for x in rev_res.data if x.get("redirected_to_google")) if rev_res.data else 0

            # Fetch Private Feedback counts
            feed_res = supabase_client.table("feedback").select("id").eq("restaurant_id", r_id).execute()
            feedback_count = len(feed_res.data) if feed_res.data else 0

            results.append({
                "restaurant_id": r_id,
                "restaurant_name": r_name,
                "qr_id": qr_data["id"] if qr_data else None,
                "qr_image_url": qr_data["qr_image_url"] if qr_data else "",
                "total_scans": qr_data["total_scans"] if qr_data else 0,
                "review_count": review_count,
                "redirect_count": redirect_count,
                "feedback_count": feedback_count
            })

        return JSONResponse(results)

    except Exception as e:
        print(f"[list_qr_codes] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/restaurants")
async def get_restaurants(owner_id: str):
    """
    Get all restaurants owned by the current owner.
    """
    try:
        res = supabase_client.table("restaurants").select("*").eq("owner_id", owner_id).execute()
        return JSONResponse({"restaurants": res.data or []})
    except Exception as e:
        print(f"[get_restaurants] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/generate")
async def generate_qr(request: QRGenerateRequest):
    """
    Regenerates or generates a QR code for a restaurant.
    Uploads to Supabase Storage, updates database record.
    """
    try:
        # Get restaurant
        rest_res = supabase_client.table("restaurants").select("*").eq("id", request.restaurant_id).execute()
        if not rest_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Restaurant not found."
            )

        restaurant = rest_res.data[0]
        restaurant_id = restaurant["id"]
        restaurant_name = restaurant["restaurant_name"]

        # Generate QR code
        qr_bytes = generate_qr_png(restaurant_id, restaurant_name)

        # Upload QR image to Supabase Storage
        file_path = f"qr_{restaurant_id}.png"
        try:
            supabase_client.storage.from_("qr-codes").remove([file_path])
        except Exception:
            pass

        supabase_client.storage.from_("qr-codes").upload(
            path=file_path,
            file=qr_bytes,
            file_options={"content-type": "image/png"}
        )

        public_url = supabase_client.storage.from_("qr-codes").get_public_url(file_path)

        # Update or insert record in qr_codes
        qr_check = supabase_client.table("qr_codes").select("*").eq("restaurant_id", restaurant_id).execute()
        if qr_check.data:
            supabase_client.table("qr_codes").update({
                "qr_image_url": public_url
            }).eq("restaurant_id", restaurant_id).execute()
        else:
            supabase_client.table("qr_codes").insert({
                "restaurant_id": restaurant_id,
                "qr_token": restaurant_id,
                "qr_image_url": public_url,
                "total_scans": 0
            }).execute()

        return JSONResponse({
            "success": True,
            "message": "QR Code regenerated successfully.",
            "qr_image_url": public_url
        })

    except Exception as e:
        print(f"[generate_qr] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/preview/{restaurant_id}/{token}")
async def preview_qr(restaurant_id: str, token: str):
    """
    Returns a QR code PNG for inline preview in the browser.
    Generates the QR from the review URL encoded in the token — no Supabase Storage required.
    """
    try:
        from services.qr_service import get_qr_url
        qr_url = get_qr_url(restaurant_id, token)
        print(f"[preview_qr] restaurant_id={restaurant_id} token={token} url={qr_url}")
        qr_bytes = generate_qr_png(restaurant_id, token)
        return Response(
            content=qr_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except Exception as e:
        print(f"[preview_qr] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/download/{restaurant_id}/{token}")
async def download_qr_with_token(restaurant_id: str, token: str):
    """
    Downloads the QR code PNG for the given restaurant/token combo.
    This is the endpoint called by QRManagement.jsx:
        /api/qr/download/{restaurantId}/{qr.qr_token}
    Generates the QR on-the-fly — no Supabase Storage dependency.
    """
    try:
        print(f"[download_qr] restaurant_id={restaurant_id} token={token}")
        qr_bytes = generate_qr_png(restaurant_id, token)
        filename = f"reviewflow_qr_{token}.png"
        return Response(
            content=qr_bytes,
            media_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        print(f"[download_qr_with_token] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/download/{restaurant_id}")
async def download_qr(restaurant_id: str):
    """
    Downloads the QR code PNG image directly (legacy — no token).
    Falls back to generating from Supabase Storage if available.
    """
    try:
        file_path = f"qr_{restaurant_id}.png"
        public_url = supabase_client.storage.from_("qr-codes").get_public_url(file_path)
        
        # Download from public URL to serve as attachment
        async with httpx.AsyncClient() as client:
            response = await client.get(public_url)
            if response.status_code != 200:
                # Regenerate if file missing in storage
                rest_res = supabase_client.table("restaurants").select("*").eq("id", restaurant_id).execute()
                if not rest_res.data:
                    raise HTTPException(status_code=404, detail="Restaurant not found")
                restaurant = rest_res.data[0]
                qr_bytes = generate_qr_png(restaurant_id, restaurant["restaurant_name"])
                
                # Re-upload
                supabase_client.storage.from_("qr-codes").upload(
                    path=file_path,
                    file=qr_bytes,
                    file_options={"content-type": "image/png"}
                )
                png_bytes = qr_bytes
            else:
                png_bytes = response.content

        filename = f"reviewflow_qr_{restaurant_id}.png"
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except Exception as e:
        print(f"[download_qr] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{restaurant_id}")
async def delete_qr(restaurant_id: str):
    """
    Deletes the QR Code record for a restaurant.
    """
    try:
        # Delete from table
        supabase_client.table("qr_codes").delete().eq("restaurant_id", restaurant_id).execute()
        
        # Delete from storage
        file_path = f"qr_{restaurant_id}.png"
        try:
            supabase_client.storage.from_("qr-codes").remove([file_path])
        except Exception:
            pass

        return JSONResponse({
            "success": True,
            "message": "QR Code deleted successfully."
        })

    except Exception as e:
        print(f"[delete_qr] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/scan/{restaurant_id}")
async def increment_scans(restaurant_id: str):
    """
    Increments the total scans for a given restaurant's QR code.
    """
    try:
        # Fetch current scans
        qr_check = supabase_client.table("qr_codes").select("*").eq("restaurant_id", restaurant_id).execute()
        if not qr_check.data:
            # Create a record if missing
            supabase_client.table("qr_codes").insert({
                "restaurant_id": restaurant_id,
                "qr_token": restaurant_id,
                "qr_image_url": "",
                "total_scans": 1
            }).execute()
            current_scans = 1
        else:
            current_scans = qr_check.data[0].get("total_scans" ,0) or 0
            new_scans = current_scans + 1
            supabase_client.table("qr_codes").update({
                "total_scans": new_scans
            }).eq("restaurant_id", restaurant_id).execute()
            current_scans = new_scans

        return JSONResponse({
            "success": True,
            "message": "Scans incremented successfully.",
            "total_scans": current_scans
        })

    except Exception as e:
        print(f"[increment_scans] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

