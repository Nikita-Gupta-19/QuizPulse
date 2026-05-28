from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from typing import List, Optional
from app.database.connection import get_db
from app.models.schemas import ExamResponse, SubjectResponse, ChapterResponse
from app.utils.mongo import parse_id

router = APIRouter(tags=["Exams"])

@router.get("/exams", response_model=List[ExamResponse])
async def get_exams(db = Depends(get_db)):
    """
    Retrieves all exams, dynamically computing chapter/question counts.
    """
    exams_cursor = db.exams.find()
    exams = await exams_cursor.to_list(100)
    
    responses = []
    for exam in exams:
        exam_id = exam["_id"]
        
        # Count subjects under this exam
        sub_ids = await db.subjects.distinct("_id", {"examId": exam_id})
        
        # Count chapters and questions
        chapters_count = await db.chapters.count_documents({"subjectId": {"$in": sub_ids}})
        chap_ids = await db.chapters.distinct("_id", {"subjectId": {"$in": sub_ids}})
        questions_count = await db.questions.count_documents({"chapterId": {"$in": chap_ids}})
        
        # Progress: simulated differently for visual diversity in dashboard
        code = exam.get("code", "")
        progress = 45 if code == "upsc" else (60 if code == "jee" else (15 if code == "cat" else (0 if code == "gate" else 30)))
        
        responses.append(ExamResponse(
            id=str(exam_id),
            name=exam.get("name", ""),
            code=code,
            icon=exam.get("icon", "Award"),
            description=exam.get("description", ""),
            chaptersCount=chapters_count,
            questionsCount=questions_count,
            progress=progress
        ))
        
    return responses

@router.get("/subjects/{exam_id}", response_model=List[SubjectResponse])
async def get_subjects(exam_id: str, db = Depends(get_db)):
    """
    Lists subjects associated with a specific exam.
    """
    eid = parse_id(exam_id)
    subjects_cursor = db.subjects.find({"examId": eid})
    subjects = await subjects_cursor.to_list(100)
    
    responses = []
    for sub in subjects:
        sub_id = sub["_id"]
        chapters_count = await db.chapters.count_documents({"subjectId": sub_id})
        
        # Progress simulated
        progress = 40 if "Polity" in sub.get("name", "") or "Physics" in sub.get("name", "") else 15
        
        responses.append(SubjectResponse(
            id=str(sub_id),
            examId=str(eid),
            name=sub.get("name", ""),
            description=sub.get("description", ""),
            chaptersCount=chapters_count,
            progress=progress
        ))
        
    return responses

@router.get("/chapters/{subject_id}", response_model=List[ChapterResponse])
async def get_chapters(subject_id: str, userId: Optional[str] = None, db = Depends(get_db)):
    """
    Lists chapters belonging to a subject, with dynamic best scores.
    """
    sid = parse_id(subject_id)
    chapters_cursor = db.chapters.find({"subjectId": sid})
    chapters = await chapters_cursor.to_list(100)
    
    responses = []
    for chap in chapters:
        chap_id = chap["_id"]
        total_questions = await db.questions.count_documents({"chapterId": chap_id})
        
        best_score = None
        if userId and userId != "undefined":
            try:
                uid = parse_id(userId)
                best_doc = await db.user_chapter_best_scores.find_one({"userId": uid, "chapterId": chap_id})
                if best_doc:
                    best_score = best_doc.get("bestPercentage")
            except Exception as e:
                print(f"Error fetching best score for user {userId}: {e}")
        
        responses.append(ChapterResponse(
            id=str(chap_id),
            subjectId=str(sid),
            name=chap.get("name", ""),
            description=chap.get("description", ""),
            estimatedTime=chap.get("estimatedTime", 15),
            difficulty=chap.get("difficulty", "Easy"),
            totalQuestions=total_questions,
            completed=best_score is not None,
            bestScore=best_score
        ))
        
    return responses
