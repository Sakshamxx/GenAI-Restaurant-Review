"""
ReviewFlow AI — Auth Routes
Handles owner registration (creating Supabase user, restaurant, and QR code)
and owner authentication via Supabase.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from services.supabase_service import supabase_client
from services.qr_service import generate_qr_png

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    fullName: str
    restaurantName: str
    email: EmailStr
    password: str


class SignupResponse(BaseModel):
    success: bool
    message: str
    user_id: str
    restaurant_id: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    access_token: str = ""
    refresh_token: str = ""
    user_id: str = ""
    email: str = ""


@router.post("/signup", response_model=SignupResponse)
async def signup(request: SignupRequest):
    """
    SaaS Sign Up Endpoint:
    1. Creates user in Supabase Auth.
    2. Creates the first Restaurant record.
    3. Generates restaurant-wide QR code, uploads it to Supabase Storage, and saves it.
    """
    try:
        # 1. Create Supabase Auth User via Admin client
        user_response = supabase_client.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": request.fullName,
            }
        })

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user in Supabase Auth."
            )

        user_id = user_response.user.id

        # 2. Create the first Restaurant record in DB
        restaurant_data = {
            "owner_id": user_id,
            "restaurant_name": request.restaurantName,
            "owner_name": request.fullName,
            "owner_email": request.email,
            "google_review_link": "",  # To be updated by owner in settings
        }

        rest_insert = supabase_client.table("restaurants").insert(restaurant_data).execute()
        if not rest_insert.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create restaurant record in database."
            )

        restaurant_id = rest_insert.data[0]["id"]
        restaurant_name = rest_insert.data[0]["restaurant_name"]

        # 3. Generate QR code image
        qr_bytes = generate_qr_png(restaurant_id, restaurant_name)

        # Upload QR image to Supabase Storage in 'qr-codes' bucket
        file_path = f"qr_{restaurant_id}.png"
        try:
            # Clean up existing file if any
            supabase_client.storage.from_("qr-codes").remove([file_path])
        except Exception:
            pass

        upload_res = supabase_client.storage.from_("qr-codes").upload(
            path=file_path,
            file=qr_bytes,
            file_options={"content-type": "image/png"}
        )

        # Get public URL of the QR code image
        public_url = supabase_client.storage.from_("qr-codes").get_public_url(file_path)

        # Save to 'qr_codes' table
        qr_data = {
            "restaurant_id": restaurant_id,
            "qr_token": restaurant_id,
            "qr_image_url": public_url,
            "total_scans": 0
        }
        supabase_client.table("qr_codes").insert(qr_data).execute()

        return SignupResponse(
            success=True,
            message="Owner registered, restaurant and QR code created successfully.",
            user_id=user_id,
            restaurant_id=restaurant_id
        )

    except Exception as e:
        print(f"[signup] Error occurred: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    SaaS Sign In Endpoint:
    Authenticates user via Supabase Auth and returns active session token.
    """
    try:
        auth_response = supabase_client.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not auth_response or not auth_response.session:
            return LoginResponse(success=False, message="Invalid email or password.")

        return LoginResponse(
            success=True,
            message="Login successful.",
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            user_id=auth_response.user.id,
            email=auth_response.user.email
        )

    except Exception as e:
        print(f"[login] Error occurred: {e}")
        return LoginResponse(
            success=False,
            message=f"Authentication failed: {str(e)}"
        )
