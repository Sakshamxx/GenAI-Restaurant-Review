import unittest
from fastapi.testclient import TestClient

from app import app
import routes.reviews as reviews_routes


class ReviewRoutesTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_generate_review_suggestions_accepts_frontend_payload(self):
        async def fake_generate(*args, **kwargs):
            return ["Amazing experience!", "Loved the service!", "Would visit again!"]

        original_generate = reviews_routes.generate_suggestions
        reviews_routes.generate_suggestions = fake_generate
        try:
            response = self.client.post(
                "/api/reviews/generate",
                json={
                    "review_text": "Great food and service",
                    "restaurant_id": "123e4567-e89b-12d3-a456-426614174000",
                    "count": 2,
                    "food_rating": 5,
                    "service_rating": 4,
                    "ambience_rating": 5,
                },
            )
        finally:
            reviews_routes.generate_suggestions = original_generate

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["reviews"], ["Amazing experience!", "Loved the service!"])
        self.assertEqual(payload["suggestions"], ["Amazing experience!", "Loved the service!"])


if __name__ == "__main__":
    unittest.main()
