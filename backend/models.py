from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, unique=True, index=True, nullable=False)
    name       = Column(String, nullable=True)
    google_id  = Column(String, unique=True, index=True, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Question(Base):
    __tablename__ = "questions"

    id          = Column(Integer, primary_key=True, index=True)
    question    = Column(Text, nullable=False)
    answers     = Column(JSON, nullable=False)   # ["A", "B", "C", "D"]
    correct     = Column(Integer, nullable=False) # 0-3
    explanation = Column(Text, nullable=True)
    category    = Column(String, nullable=True)
    source      = Column(String, nullable=True)   # topic string or PDF filename
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
