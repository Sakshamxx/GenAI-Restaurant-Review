"""
ReviewFlow AI — Gemini Review Generation Service

Calls Google Gemini API using the new google.genai SDK to generate 3 distinct, human-sounding restaurant reviews
based on customer star ratings and selected tags. Tone matches the rating.
"""

import os
import json
import asyncio
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Clean up env key if needed
api_key = os.getenv("Gemini_API_Key")
if api_key:
    api_key = api_key.strip('"').strip("'").strip("”").strip("“")

client = None
if api_key:
    try:
        client = genai.Client(api_key=api_key)
    except Exception as exc:
        print(f"[gemini_service] Gemini client initialization failed: {exc}")

# Using the validated working model with active quota
MODEL_NAME = "gemini-3.1-flash-lite"


def _build_tone_descriptor(avg_rating: float) -> str:
    """Map average rating to a tone instruction for the prompt."""
    if avg_rating >= 4.5:
        return "extremely positive, enthusiastic, highly recommending"
    elif avg_rating >= 4.0:
        return "positive but realistic, genuinely satisfied"
    elif avg_rating >= 3.0:
        return "balanced, mentioning both positives and areas for improvement"
    elif avg_rating >= 2.0:
        return "mostly negative, expressing disappointment"
    else:
        return "strongly negative, expressing serious dissatisfaction"


def _build_prompt(
    food_rating: int,
    service_rating: int,
    ambience_rating: int,
    food_tags: list[str],
    service_tags: list[str],
    ambience_tags: list[str],
) -> str:
    """Build the Gemini prompt to generate 3 reviews."""
    avg = (food_rating + service_rating + ambience_rating) / 3
    tone = _build_tone_descriptor(avg)

    food_tag_str = ", ".join(food_tags) if food_tags else "none selected"
    service_tag_str = ", ".join(service_tags) if service_tags else "none selected"
    ambience_tag_str = ", ".join(ambience_tags) if ambience_tags else "none selected"

    prompt = f"""You are helping a restaurant customer write a Google review based on their dining experience.

Customer Ratings (out of 5 stars):
- Food: {food_rating}/5
- Service: {service_rating}/5
- Ambience: {ambience_rating}/5

Customer Selected Tags:
- Food: {food_tag_str}
- Service: {service_tag_str}
- Ambience: {ambience_tag_str}

Overall tone should be: {tone}

Generate exactly 3 short, natural-sounding restaurant reviews. Each review must:
1. Be 80-120 words maximum
2. Sound like it was written by a real customer (not AI)
3. Reflect the actual ratings - if food is rated {food_rating}/5, the food comment must reflect that
4. Naturally incorporate the selected tags where relevant
5. Have a distinctly different writing style from the other two (e.g., casual, professional, storytelling)
6. Be suitable for posting on Google Reviews

Return ONLY a JSON array of exactly 3 strings, no explanation, no labels, no markdown:
["review1 text here", "review2 text here", "review3 text here"]"""

    return prompt


async def generate_reviews(
    food_rating: int,
    service_rating: int,
    ambience_rating: int,
    food_tags: list[str],
    service_tags: list[str],
    ambience_tags: list[str],
) -> list[str]:
    """
    Generate 3 distinct review suggestions using the new Gemini SDK.

    Returns a list of 3 review strings. Falls back to local reviews if the API fails.
    """
    try:
        prompt = _build_prompt(
            food_rating, service_rating, ambience_rating,
            food_tags, service_tags, ambience_tags
        )

        if client is None:
            raise RuntimeError("Gemini API key is not configured")

        # Run synchronous SDK call in an executor thread to not block FastAPI
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(model=MODEL_NAME, contents=prompt)
        )

        text = response.text.strip()

        # Clean up markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        reviews = json.loads(text)

        if isinstance(reviews, list) and len(reviews) == 3:
            return reviews
        else:
            raise ValueError(f"Unexpected Gemini response format: {text}")

    except Exception as e:
        print(f"[gemini_service] Gemini API error, using fallback: {e}")
        return _fallback_reviews(food_rating, service_rating, ambience_rating, food_tags, service_tags, ambience_tags)


def _fallback_reviews(
    food_rating: int,
    service_rating: int,
    ambience_rating: int,
    food_tags: list[str],
    service_tags: list[str],
    ambience_tags: list[str],
) -> list[str]:
    """Fallback mock reviews when Gemini is unavailable."""
    avg = (food_rating + service_rating + ambience_rating) / 3

    f_desc = ", ".join(food_tags).lower() if food_tags else ("excellent" if food_rating >= 4 else "decent")
    s_desc = ", ".join(service_tags).lower() if service_tags else ("attentive" if service_rating >= 4 else "okay")
    a_desc = ", ".join(ambience_tags).lower() if ambience_tags else ("cozy" if ambience_rating >= 4 else "casual")

    if avg >= 4.0:
        return [
            f"Absolutely loved dining here! The food was {f_desc} and the service was {s_desc}. The {a_desc} ambience made it a perfect evening. Highly recommend!",
            f"Great experience from start to finish. {f_desc.capitalize()} food, {s_desc} staff, and a {a_desc} atmosphere. Will definitely return!",
            f"One of my favorite spots now. The {f_desc} dishes were memorable, service was {s_desc}, and the place had such a {a_desc} vibe. 5 stars!"
        ]
    elif avg >= 3.0:
        return [
            f"Decent experience overall. Food was {f_desc}, service was {s_desc}. Ambience was {a_desc}. Has potential with a few improvements.",
            f"Mixed feelings about this place. The food was {f_desc} which was fine, but there's definitely room to grow on the service side.",
            f"Average visit. Enjoyed the {a_desc} setting and the food was {f_desc}. Service could be more consistent. Might give it another try."
        ]
    else:
        return [
            f"Disappointing experience. The food was {f_desc}, service was {s_desc}, and the overall visit did not meet expectations.",
            f"Would not recommend based on my visit. Issues with {f_desc} food quality and {s_desc} service. Management should look into this.",
            f"Fell short of expectations. The {a_desc} ambience was okay but food and service need significant improvement."
        ]
