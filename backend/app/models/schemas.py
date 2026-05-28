from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.utils.mongo import PyObjectId

# --- Database Models ---

class User(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    username: str
    email: EmailStr
    avatarUrl: str
    streakCount: int = 0
    lastActiveDate: Optional[str] = None # YYYY-MM-DD format
    bookmarkedQuestions: List[str] = Field(default_factory=list) # List of Question ID strings
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class Exam(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    code: str
    icon: str
    description: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class Subject(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    examId: PyObjectId
    name: str
    description: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class Chapter(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    subjectId: PyObjectId
    name: str
    description: str
    estimatedTime: int # minutes
    difficulty: str # "Easy", "Medium", "Hard"
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class Question(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    chapterId: PyObjectId
    questionText: str
    options: List[str]
    correctOption: int # 0 to 3
    difficulty: str # "Easy", "Medium", "Hard"
    estimatedTime: int # seconds
    tags: List[str] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class QuizSession(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    userId: PyObjectId
    chapterId: PyObjectId
    startedAt: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None
    completionStatus: str = "IN_PROGRESS" # "IN_PROGRESS", "COMPLETED", "ABANDONED"
    totalQuestions: int
    answeredQuestions: int = 0

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class QuestionAttempt(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    sessionId: PyObjectId
    questionId: PyObjectId
    shownAt: datetime
    answeredAt: Optional[datetime] = None
    responseTime: float = 0.0 # seconds
    selectedOption: Optional[int] = None
    isCorrect: Optional[bool] = None
    skipped: bool = False

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class AnalyticsEvent(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    eventType: str # "PAGE_VIEW", "START_QUIZ", "SUBMIT_ANSWER", "COMPLETE_QUIZ", "STREAK_EARNED"
    userId: PyObjectId
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }


# --- API Request/Response Schemas ---

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    avatarUrl: str
    streakCount: int
    lastActiveDate: Optional[str]
    bookmarkedQuestions: List[str]

    @classmethod
    def from_db(cls, user_dict: dict):
        return cls(
            id=str(user_dict.get("_id", "")),
            username=user_dict.get("username", ""),
            email=user_dict.get("email", ""),
            avatarUrl=user_dict.get("avatarUrl", ""),
            streakCount=user_dict.get("streakCount", 0),
            lastActiveDate=user_dict.get("lastActiveDate"),
            bookmarkedQuestions=user_dict.get("bookmarkedQuestions", [])
        )

class ExamResponse(BaseModel):
    id: str
    name: str
    code: str
    icon: str
    description: str
    chaptersCount: int = 0
    questionsCount: int = 0
    progress: int = 0 # Simulated percent progress for mock user selection

class SubjectResponse(BaseModel):
    id: str
    examId: str
    name: str
    description: str
    chaptersCount: int = 0
    progress: int = 0

class ChapterResponse(BaseModel):
    id: str
    subjectId: str
    name: str
    description: str
    estimatedTime: int
    difficulty: str
    totalQuestions: int = 0
    completed: bool = False
    bestScore: Optional[float] = None

class QuizStartRequest(BaseModel):
    userId: str
    chapterId: str

class QuizStartResponse(BaseModel):
    sessionId: str
    totalQuestions: int
    currentQuestionIndex: int
    resume: bool = False

class QuestionResponse(BaseModel):
    id: str
    questionText: str
    options: List[str]
    difficulty: str
    estimatedTime: int
    tags: List[str]
    bookmarked: bool = False

class QuestionAttemptDetailResponse(BaseModel):
    question: QuestionResponse
    attempt: Optional[QuestionAttempt] = None

class AnswerSubmitRequest(BaseModel):
    sessionId: str
    questionId: str
    selectedOption: Optional[int] = None
    skipped: bool = False
    shownAt: datetime
    answeredAt: datetime

    @field_validator("selectedOption")
    @classmethod
    def validate_option(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 0 or v > 3):
            raise ValueError("selectedOption must be between 0 and 3 inclusive")
        return v

    @model_validator(mode="after")
    def validate_submission_logic(self) -> 'AnswerSubmitRequest':
        if not self.skipped and self.selectedOption is None:
            raise ValueError("selectedOption must be provided when skipped is False")
        if self.shownAt > self.answeredAt:
            raise ValueError("shownAt timestamp cannot be after answeredAt timestamp")
        return self

class AnswerSubmitResponse(BaseModel):
    isCorrect: bool
    correctOption: int
    motivationalCopy: str
    streakCount: int
    streakIncremented: bool

class CompleteSessionResponse(BaseModel):
    sessionId: str
    chapterId: str
    score: int
    percentage: float
    correctAnswers: int
    incorrectAnswers: int
    skippedAnswers: int
    attemptedQuestions: int
    unattemptedQuestions: int
    averageResponseTime: float
    totalQuestions: int
    feedback: str

class BookmarkRequest(BaseModel):
    questionId: str
    action: str # "add" or "remove"

class BookmarkResponse(BaseModel):
    bookmarked: bool
    questionId: str
