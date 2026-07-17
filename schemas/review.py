from pydantic import BaseModel, Field
from typing import List, Optional


class ReviewGenerationRequest(BaseModel):
    restaurant_id: Optional[str] = None
    review_text: Optional[str] = None
    food_rating: Optional[int] = Field(default=5, ge=1, le=5)
    service_rating: Optional[int] = Field(default=5, ge=1, le=5)
    ambience_rating: Optional[int] = Field(default=5, ge=1, le=5)
    food_tags: List[str] = Field(default_factory=list)
    service_tags: List[str] = Field(default_factory=list)
    ambience_tags: List[str] = Field(default_factory=list)
    count: Optional[int] = Field(default=3, ge=1, le=5)


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
