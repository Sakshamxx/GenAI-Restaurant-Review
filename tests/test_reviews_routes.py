import unittest
from unittest.mock import patch, Mock
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

    def test_submit_review_returns_sentiment_only_payload(self):
        class DummyTable:
            def __init__(self, data):
                self.data = data
            def select(self, *args, **kwargs):
                return self
            def eq(self, *args, **kwargs):
                return self
            def execute(self):
                return type("Resp", (), {"data": [{"google_review_link": "https://example.com/review"}]})()

        class DummySupabase:
            def table(self, name):
                return DummyTable([])

        mock_safe_insert = Mock(return_value={"id": "review-1"})
        with patch.object(reviews_routes, "analyze_text", return_value={"sentiment": "Positive", "sentiment_confidence": 0.91}), \
             patch.object(reviews_routes, "decide", return_value={"route_decision": "positive_flow", "reason": "sentiment positive"}), \
             patch.object(reviews_routes, "safe_insert", mock_safe_insert), \
             patch.object(reviews_routes, "supabase_client", DummySupabase()):
            response = self.client.post(
                "/api/reviews/submit",
                json={
                    "restaurant_id": "123e4567-e89b-12d3-a456-426614174000",
                    "review_text": "Great food and service",
                    "overall_rating": 5,
                    "food_rating": 5,
                    "service_rating": 4,
                    "ambience_rating": 5,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["ml"]["sentiment"], "Positive")
        self.assertNotIn("severity", payload["ml"])
        self.assertNotIn("complaint_category", payload["ml"])
        self.assertEqual(payload["google_review_link"], "https://example.com/review")
        mock_safe_insert.assert_called_once()
        inserted_record = mock_safe_insert.call_args[0][1] if len(mock_safe_insert.call_args[0]) > 1 else mock_safe_insert.call_args[0][0]
        self.assertIsInstance(inserted_record, dict)
        self.assertNotIn("overall_rating", inserted_record)
        self.assertIn("google_redirected", inserted_record)
        self.assertEqual(inserted_record["google_redirected"], True)


if __name__ == "__main__":
    unittest.main()
