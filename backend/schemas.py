from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GenerateFromTopic(BaseModel):
    topic:    str
    count:    int = 10
    category: Optional[str] = "AI Generated"


class QuestionOut(BaseModel):
    id:          int
    question:    str
    answers:     list[str]
    correct:     int
    explanation: Optional[str]
    category:    Optional[str]
    source:      Optional[str]
    user_id:     Optional[int]
    created_at:  datetime

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id:         int
    email:      str
    name:       Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}
