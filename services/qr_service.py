"""
ReviewFlow AI — QR Code Generation Service

Generates real PNG QR codes for a restaurant using the qrcode + Pillow libraries.
QR content format: {FRONTEND_ORIGIN}/review/{restaurant_id}
"""

import os
import io
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv

load_dotenv()

# We point the QR code to the customer-facing frontend route
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


def generate_qr_png(restaurant_id: str, restaurant_name: str) -> bytes:
    """
    Generate a PNG QR code for the given restaurant.

    QR content: {FRONTEND_ORIGIN}/review/{restaurant_id}

    Returns raw PNG bytes.
    """
    # Build target URL
    url = f"{FRONTEND_ORIGIN.rstrip('/')}/review/{restaurant_id}"

    # Create QR code with high error correction
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Generate styled image with rounded modules
    try:
        qr_image = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            back_color=(255, 255, 255),
            fill_color=(15, 23, 42),  # slate-950
        )
        qr_pil = qr_image.convert("RGB")
    except Exception:
        # Fallback to basic QR if styled fails
        qr_pil = qr.make_image(fill_color=(15, 23, 42), back_color="white").convert("RGB")

    # Add padding and label below QR
    qr_width, qr_height = qr_pil.size
    padding = 20
    label_height = 50
    canvas_width = qr_width + padding * 2
    canvas_height = qr_height + padding * 2 + label_height

    # Create final canvas with white background
    canvas = Image.new("RGB", (canvas_width, canvas_height), (255, 255, 255))
    canvas.paste(qr_pil, (padding, padding))

    # Draw label text below QR
    draw = ImageDraw.Draw(canvas)

    # Try to use a system font; fall back to default
    try:
        font_label = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
        font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 11)
    except Exception:
        font_label = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    label_text = restaurant_name
    sub_text = "Scan to rate your experience"

    label_y = qr_height + padding + 8
    sub_y = label_y + 18

    # Center text
    try:
        label_bbox = draw.textbbox((0, 0), label_text, font=font_label)
        label_w = label_bbox[2] - label_bbox[0]
    except Exception:
        label_w = len(label_text) * 7

    try:
        sub_bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
        sub_w = sub_bbox[2] - sub_bbox[0]
    except Exception:
        sub_w = len(sub_text) * 6

    draw.text(
        ((canvas_width - label_w) / 2, label_y),
        label_text,
        fill=(15, 23, 42),
        font=font_label
    )
    draw.text(
        ((canvas_width - sub_w) / 2, sub_y),
        sub_text,
        fill=(100, 116, 139),  # slate-500
        font=font_sub
    )

    # Convert to bytes
    buffer = io.BytesIO()
    canvas.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)
    return buffer.getvalue()


def get_qr_url(restaurant_id: str, token: str = None) -> str:
    """Return the URL that the QR code encodes."""
    return f"{FRONTEND_ORIGIN.rstrip('/')}/review/{restaurant_id}"
