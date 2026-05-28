from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import Optional, List
from app.database.connection import get_db
from app.models.schemas import (
    QuizStartRequest, QuizStartResponse, QuestionResponse,
    AnswerSubmitRequest, AnswerSubmitResponse, CompleteSessionResponse,
    QuizSession, QuestionAttempt, AnalyticsEvent
)
from app.utils.mongo import parse_id
from app.utils.websocket import manager
import random

router = APIRouter(prefix="/quiz", tags=["Quiz"])

MOTIVATIONAL_CORRECT = [
    "Phenomenal work! Keep it up!",
    "Bullseye! You nailed this one!",
    "Superb! You're on fire today! 🔥",
    "Spot on! Brilliant explanation!",
    "Fantastic! Your preparation is showing!"
]

MOTIVATIONAL_WRONG = [
    "Almost there! Learn from this mistake.",
    "Don't worry, mistakes are proof that you are trying!",
    "Not quite, but you will get the next one!",
    "A great opportunity to review this concept!",
    "Keep pushing forward! Success is built on failures."
]

@router.get("/active-session/{user_id}", response_model=Optional[dict])
async def get_active_session(user_id: str, db = Depends(get_db)):
    """
    Checks if a user has any unfinished quiz session to allow instant resumption.
    """
    uid = parse_id(user_id)
    session = await db.quiz_sessions.find_one(
        {"userId": uid, "completionStatus": "IN_PROGRESS"},
        sort=[("startedAt", -1)]
    )
    if not session:
        return None
        
    chapter = await db.chapters.find_one({"_id": session["chapterId"]})
    return {
        "sessionId": str(session["_id"]),
        "chapterId": str(session["chapterId"]),
        "chapterName": chapter.get("name", "") if chapter else "Unknown Chapter",
        "totalQuestions": session.get("totalQuestions", 0),
        "answeredQuestions": session.get("answeredQuestions", 0),
        "startedAt": session["startedAt"].isoformat()
    }

@router.post("/start", response_model=QuizStartResponse)
async def start_quiz(payload: QuizStartRequest, db = Depends(get_db)):
    """
    Starts a new quiz session, or resumes an unfinished session of the same chapter.
    """
    uid = parse_id(payload.userId)
    cid = parse_id(payload.chapterId)
    
    # 1. Resume check: Check if an IN_PROGRESS session exists for this user & chapter
    existing = await db.quiz_sessions.find_one(
        {"userId": uid, "chapterId": cid, "completionStatus": "IN_PROGRESS"}
    )
    if existing:
        # Calculate current unanswered index
        attempts_count = await db.question_attempts.count_documents({"sessionId": existing["_id"]})
        return QuizStartResponse(
            sessionId=str(existing["_id"]),
            totalQuestions=existing["totalQuestions"],
            currentQuestionIndex=attempts_count,
            resume=True
        )
        
    # 2. Start new session
    # Retrieve questions for this chapter
    questions_cursor = db.questions.find({"chapterId": cid})
    questions = await questions_cursor.to_list(20)
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this chapter")
        
    total_qs = len(questions)
    
    session_id = ObjectId()
    session_doc = {
        "_id": session_id,
        "userId": uid,
        "chapterId": cid,
        "startedAt": datetime.utcnow(),
        "completedAt": None,
        "completionStatus": "IN_PROGRESS",
        "totalQuestions": total_qs,
        "answeredQuestions": 0
    }
    
    await db.quiz_sessions.insert_one(session_doc)
    
    # Track event
    await db.analytics_events.insert_one({
        "eventType": "START_QUIZ",
        "userId": uid,
        "timestamp": datetime.utcnow(),
        "metadata": {"sessionId": str(session_id), "chapterId": str(cid)}
    })
    
    return QuizStartResponse(
        sessionId=str(session_id),
        totalQuestions=total_qs,
        currentQuestionIndex=0,
        resume=False
    )

@router.get("/question/{session_id}", response_model=dict)
async def get_quiz_question(session_id: str, questionIndex: int = 0, db = Depends(get_db)):
    """
    Fetches the question for the active session at the specified index.
    """
    sid = parse_id(session_id)
    session = await db.quiz_sessions.find_one({"_id": sid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Get all questions for this chapter
    questions_cursor = db.questions.find({"chapterId": session["chapterId"]})
    questions = await questions_cursor.to_list(50)
    
    if questionIndex < 0 or questionIndex >= len(questions):
        raise HTTPException(status_code=400, detail="Invalid question index")
        
    question = questions[questionIndex]
    
    # Check if this user has bookmarked this question
    user = await db.users.find_one({"_id": session["userId"]})
    bookmarked = str(question["_id"]) in user.get("bookmarkedQuestions", []) if user else False
    
    # Check if there is an existing attempt for this question in this session
    existing_attempt = await db.question_attempts.find_one(
        {"sessionId": sid, "questionId": question["_id"]}
    )
    
    attempt_data = None
    if existing_attempt:
        attempt_data = {
            "selectedOption": existing_attempt.get("selectedOption"),
            "skipped": existing_attempt.get("skipped", False),
            "isCorrect": existing_attempt.get("isCorrect"),
            "responseTime": existing_attempt.get("responseTime", 0.0)
        }

    return {
        "question": QuestionResponse(
            id=str(question["_id"]),
            questionText=question.get("questionText", ""),
            options=question.get("options", []),
            difficulty=question.get("difficulty", "Easy"),
            estimatedTime=question.get("estimatedTime", 30),
            tags=question.get("tags", []),
            bookmarked=bookmarked
        ),
        "attempt": attempt_data,
        "totalQuestions": len(questions),
        "currentQuestionIndex": questionIndex
    }

@router.post("/answer", response_model=AnswerSubmitResponse)
async def submit_answer(payload: AnswerSubmitRequest, db = Depends(get_db)):
    """
    Submits or updates an answer to a question inside a session. Tracks response time and streaks.
    """
    sid = parse_id(payload.sessionId)
    qid = parse_id(payload.questionId)
    
    session = await db.quiz_sessions.find_one({"_id": sid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    question = await db.questions.find_one({"_id": qid})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    is_correct = False
    if not payload.skipped:
        is_correct = payload.selectedOption == question.get("correctOption")
        
    # Calculate response time
    response_time = (payload.answeredAt - payload.shownAt).total_seconds()
    response_time = max(0.1, round(response_time, 2))
    
    # Save or update attempt
    existing_attempt = await db.question_attempts.find_one({"sessionId": sid, "questionId": qid})
    
    attempt_doc = {
        "sessionId": sid,
        "questionId": qid,
        "shownAt": payload.shownAt,
        "answeredAt": payload.answeredAt,
        "responseTime": response_time,
        "selectedOption": payload.selectedOption if not payload.skipped else None,
        "isCorrect": is_correct if not payload.skipped else None,
        "skipped": payload.skipped
    }
    
    if existing_attempt:
        await db.question_attempts.replace_one({"_id": existing_attempt["_id"]}, attempt_doc)
    else:
        await db.question_attempts.insert_one(attempt_doc)
        # Increment answeredQuestions counter in session
        await db.quiz_sessions.update_one(
            {"_id": sid},
            {"$inc": {"answeredQuestions": 1}}
        )
        
    # 3. Streak and activity tracking
    user = await db.users.find_one({"_id": session["userId"]})
    streak_count = user.get("streakCount", 0) if user else 0
    streak_incremented = False
    
    if user:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        last_active = user.get("lastActiveDate")
        
        if last_active != today_str:
            # Active today! Check if yesterday was active to continue streak
            yesterday_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
            
            if last_active == yesterday_str:
                streak_count += 1
            elif last_active is None or last_active < yesterday_str:
                streak_count = 1 # Reset or start streak
                
            streak_incremented = True
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"streakCount": streak_count, "lastActiveDate": today_str}}
            )
            
            # Emit Streak Event
            await db.analytics_events.insert_one({
                "eventType": "STREAK_EARNED",
                "userId": user["_id"],
                "timestamp": datetime.utcnow(),
                "metadata": {"streak": streak_count}
            })

    # Track Submit Event
    await db.analytics_events.insert_one({
        "eventType": "SUBMIT_ANSWER",
        "userId": session["userId"],
        "timestamp": datetime.utcnow(),
        "metadata": {
            "sessionId": str(sid),
            "questionId": str(qid),
            "isCorrect": is_correct if not payload.skipped else "skipped",
            "responseTime": response_time
        }
    })
    
    # Pick motivational message
    if payload.skipped:
        msg = "Question skipped. No penalties, but remember: you can always try!"
    elif is_correct:
        msg = random.choice(MOTIVATIONAL_CORRECT)
    else:
        msg = random.choice(MOTIVATIONAL_WRONG)
        
    return AnswerSubmitResponse(
        isCorrect=is_correct if not payload.skipped else False,
        correctOption=question.get("correctOption"),
        motivationalCopy=msg,
        streakCount=streak_count,
        streakIncremented=streak_incremented
    )

@router.post("/complete", response_model=CompleteSessionResponse)
async def complete_quiz(payload: dict, db = Depends(get_db)):
    """
    Finalizes the quiz session and returns the computed scorecard.
    """
    session_id_str = payload.get("sessionId")
    if not session_id_str:
        raise HTTPException(status_code=400, detail="sessionId is required")
        
    sid = parse_id(session_id_str)
    session = await db.quiz_sessions.find_one({"_id": sid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Mark as completed
    await db.quiz_sessions.update_one(
        {"_id": sid},
        {
            "$set": {
                "completionStatus": "COMPLETED",
                "completedAt": datetime.utcnow()
            }
        }
    )
    
    # Fetch all attempts
    attempts_cursor = db.question_attempts.find({"sessionId": sid})
    attempts = await attempts_cursor.to_list(100)
    
    total_qs = session.get("totalQuestions", len(attempts))
    correct = sum([1 for a in attempts if a.get("isCorrect") == True])
    
    # Count unattempted questions as skipped
    unattempted = max(0, total_qs - len(attempts))
    attempted = len(attempts)
    skipped = sum([1 for a in attempts if a.get("skipped") == True]) + unattempted
    incorrect = total_qs - correct - skipped
    
    # Response times
    response_times = [a.get("responseTime", 0.0) for a in attempts if not a.get("skipped", False)]
    avg_response_time = round(sum(response_times) / len(response_times), 2) if response_times else 0.0
    
    percentage = round((correct / total_qs) * 100, 1) if total_qs > 0 else 0.0
    
    # Pick feedback
    if percentage >= 90:
        feedback = "Outstanding! You have masterly command over this topic."
    elif percentage >= 70:
        feedback = "Great work! Solid grasp, but a few areas need polishing."
    elif percentage >= 50:
        feedback = "Decent effort. review the questions you got wrong and retry!"
    else:
        feedback = "Needs practice. Go back to basics and try again, you will surely improve!"
        
    # Track completion event
    await db.analytics_events.insert_one({
        "eventType": "COMPLETE_QUIZ",
        "userId": session["userId"],
        "timestamp": datetime.utcnow(),
        "metadata": {"sessionId": str(sid), "score": correct, "percentage": percentage}
    })
    
    # Save/update the best score for this user & chapter
    await db.user_chapter_best_scores.update_one(
        {"userId": session["userId"], "chapterId": session["chapterId"]},
        {
            "$max": {
                "bestScore": correct,
                "bestPercentage": percentage
            },
            "$setOnInsert": {
                "userId": session["userId"],
                "chapterId": session["chapterId"]
            },
            "$set": {
                "updatedAt": datetime.utcnow()
            }
        },
        upsert=True
    )

    # Broadcast event to all active leaderboard websockets for real-time update
    await manager.broadcast({"type": "LEADERBOARD_REFRESH"})
    
    return CompleteSessionResponse(
        sessionId=str(sid),
        chapterId=str(session.get("chapterId", "")),
        score=correct,
        percentage=percentage,
        correctAnswers=correct,
        incorrectAnswers=incorrect,
        skippedAnswers=skipped,
        attemptedQuestions=attempted,
        unattemptedQuestions=unattempted,
        averageResponseTime=avg_response_time,
        totalQuestions=total_qs,
        feedback=feedback
    )
from datetime import timedelta
