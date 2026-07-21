"""
ReviewFlow AI — QR Code Generation Service

Generates real PNG QR codes for a restaurant using the qrcode + Pillow libraries.
QR content: the restaurant review funnel URL for the customer review flow.
"""

import io
import os
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from PIL import Image, ImageDraw, ImageFont
from typing import Optional


def generate_qr_png(qr_url: str, restaurant_name: str) -> bytes:
    """
    Generate a PNG QR code that encodes `qr_url`.

    qr_url          — the exact review funnel URL baked into the QR (e.g. /customer/review/<restaurant_id>)
    restaurant_name — printed as a label below the QR image

    Returns raw PNG bytes.
    """
    if not qr_url:
        raise ValueError("qr_url must not be empty")

    # Create QR code with high error correction
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)

    # Generate styled image with rounded modules
    try:
        qr_image = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            back_color=(255, 255, 255),
            fill_color=(15, 23, 42),   # slate-950
        )
        qr_pil = qr_image.convert("RGB")
    except Exception:
        # Fallback to basic QR if styled image factory fails
        qr_pil = qr.make_image(fill_color=(15, 23, 42), back_color="white").convert("RGB")

    # Add padding and label below QR
    qr_width, qr_height = qr_pil.size
    padding     = 20
    label_height = 60
    canvas_width  = qr_width  + padding * 2
    canvas_height = qr_height + padding * 2 + label_height

    canvas = Image.new("RGB", (canvas_width, canvas_height), (255, 255, 255))
    canvas.paste(qr_pil, (padding, padding))

    draw = ImageDraw.Draw(canvas)

    # System font with fallback
    try:
        font_label = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
        font_sub   = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 11)
    except Exception:
        font_label = ImageFont.load_default()
        font_sub   = ImageFont.load_default()

    label_text = restaurant_name
    sub_text   = "Scan to start your ReviewFlow experience"

    label_y = qr_height + padding + 8
    sub_y   = label_y + 22

    # Centre-align both lines of text
    try:
        label_w = draw.textbbox((0, 0), label_text, font=font_label)[2]
    except Exception:
        label_w = len(label_text) * 7

    try:
        sub_w = draw.textbbox((0, 0), sub_text, font=font_sub)[2]
    except Exception:
        sub_w = len(sub_text) * 6

    draw.text(
        ((canvas_width - label_w) / 2, label_y),
        label_text,
        fill=(15, 23, 42),
        font=font_label,
    )
    draw.text(
        ((canvas_width - sub_w) / 2, sub_y),
        sub_text,
        fill=(100, 116, 139),   # slate-500
        font=font_sub,
    )

    buffer = io.BytesIO()
    canvas.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)
    return buffer.getvalue()


def get_frontend_origin() -> str:
    """Return the configured frontend origin for review funnels."""
    origin = os.getenv("FRONTEND_ORIGIN", "").strip().strip('"').strip("'")
    if not origin:
        raise ValueError("FRONTEND_ORIGIN environment variable is required to build review funnel URLs.")
    if not origin.startswith(("http://", "https://")):
        raise ValueError("FRONTEND_ORIGIN must be a valid absolute URL starting with http:// or https://.")
    return origin.rstrip('/')


def build_review_funnel_url(restaurant_id: str, request_origin: Optional[str] = None) -> str:
    """Return the review funnel URL encoded into each QR code."""
    env_origin = os.getenv("FRONTEND_ORIGIN", "").strip().strip('"').strip("'")

    origin = None
    if request_origin:
        request_origin = request_origin.strip().strip('"').strip("'")
        if request_origin.startswith(("http://", "https://")):
            origin = request_origin.rstrip('/')

    if not origin and env_origin:
        if not env_origin.startswith(("http://", "https://")):
            raise ValueError("FRONTEND_ORIGIN must be a valid absolute URL starting with http:// or https://.")
        origin = env_origin.rstrip('/')

    if not origin:
        raise ValueError("FRONTEND_ORIGIN environment variable is required to build review funnel URLs.")

    return f"{origin}/customer/review/{restaurant_id}"
