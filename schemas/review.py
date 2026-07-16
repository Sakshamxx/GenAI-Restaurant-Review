from pydantic import BaseModel, Field
from typing import List, Optional


class ReviewGenerationRequest(BaseModel):
    restaurant_id: Optional[str] = None
    food_rating: int = Field(..., ge=1, le=5)
    service_rating: int = Field(..., ge=1, le=5)
    ambience_rating: int = Field(..., ge=1, le=5)
    food_tags: List[str] = []
    service_tags: List[str] = []
    ambience_tags: List[str] = []


class ReviewGenerationResponse(BaseModel):
    reviews: List[str]


class ReviewSubmitRequest(BaseModel):
    restaurant_id: str
    food_rating: Optional[int] = None
    service_rating: Optional[int] = None
    ambience_rating: Optional[int] = None
    overall_rating: Optional[float] = None
    review_text: str
    redirected_to_google: bool = True


class ReviewSubmitResponse(BaseModel):
    success: bool
    message: str
    review: Optional[dict]
    ml: Optional[dict]
    decision: Optional[dict]
    suggestions: Optional[List[str]] = []
