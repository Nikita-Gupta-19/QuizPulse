import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.connection import database

# Set default pytest asyncio loop scope
pytestmark = pytest.mark.asyncio

@pytest.fixture(autouse=True)
def setup_db_connection():
    """Fixture to reset the database connection per test, preventing closed loop issues."""
    database.disconnect()
    database.connect()
    yield
    database.disconnect()

async def test_health_check():
    """Verify that the health diagnostic check is operational."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "service" in response.json()

async def test_get_exams():
    """Verify that exams list is fetched and returns valid structures."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/exams")
    assert response.status_code == 200
    exams = response.json()
    assert isinstance(exams, list)
    if len(exams) > 0:
        first = exams[0]
        assert "name" in first
        assert "chaptersCount" in first
        assert "questionsCount" in first

async def test_get_users():
    """Verify that user selector profiles fetch successfully."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/users")
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) > 0
    assert "username" in users[0]
    assert "email" in users[0]

async def test_get_analytics_dashboard():
    """Verify that the SaaS analytics dashboard metrics are compiled correctly."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/analytics/dashboard")
    assert response.status_code == 200
    kpi = response.json()
    assert "dau" in kpi
    assert "wau" in kpi
    assert "totalServed" in kpi
    assert "avgResponseTime" in kpi
    assert "p50ResponseTime" in kpi
    assert "p95ResponseTime" in kpi

async def test_quiz_workflow():
    """Verify end-to-end quiz session lifecycle including answers, skips, and scorecard metrics."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Get user
        users_res = await ac.get("/api/users")
        assert users_res.status_code == 200
        user_id = users_res.json()[0]["id"]

        # 2. Get exams -> subject -> chapter
        exams_res = await ac.get("/api/exams")
        assert exams_res.status_code == 200
        exam_id = exams_res.json()[0]["id"]

        subjects_res = await ac.get(f"/api/subjects/{exam_id}")
        assert subjects_res.status_code == 200
        subject_id = subjects_res.json()[0]["id"]

        chapters_res = await ac.get(f"/api/chapters/{subject_id}")
        assert chapters_res.status_code == 200
        chapter_id = chapters_res.json()[0]["id"]

        # 3. Start quiz
        start_res = await ac.post("/api/quiz/start", json={
            "userId": user_id,
            "chapterId": chapter_id
        })
        assert start_res.status_code == 200
        start_data = start_res.json()
        session_id = start_data["sessionId"]
        total_qs = start_data["totalQuestions"]
        assert total_qs > 0

        # 4. Fetch first question
        q1_res = await ac.get(f"/api/quiz/question/{session_id}?questionIndex=0")
        assert q1_res.status_code == 200
        q1_data = q1_res.json()
        q1_id = q1_data["question"]["id"]

        # 5. Submit answer
        from datetime import datetime
        now_str = datetime.utcnow().isoformat()
        ans_res = await ac.post("/api/quiz/answer", json={
            "sessionId": session_id,
            "questionId": q1_id,
            "selectedOption": 0,
            "skipped": False,
            "shownAt": now_str,
            "answeredAt": now_str
        })
        assert ans_res.status_code == 200
        
        # 6. Skip the second question if it exists
        if total_qs > 1:
            q2_res = await ac.get(f"/api/quiz/question/{session_id}?questionIndex=1")
            assert q2_res.status_code == 200
            q2_id = q2_res.json()["question"]["id"]

            skip_res = await ac.post("/api/quiz/answer", json={
                "sessionId": session_id,
                "questionId": q2_id,
                "selectedOption": None,
                "skipped": True,
                "shownAt": now_str,
                "answeredAt": now_str
            })
            assert skip_res.status_code == 200

        # 7. Complete session
        complete_res = await ac.post("/api/quiz/complete", json={
            "sessionId": session_id
        })
        assert complete_res.status_code == 200
        comp_data = complete_res.json()
        
        # Assertions
        assert comp_data["sessionId"] == session_id
        assert comp_data["chapterId"] == chapter_id
        assert comp_data["totalQuestions"] == total_qs
        expected_attempted = 2 if total_qs > 1 else 1
        assert comp_data["attemptedQuestions"] == expected_attempted
        assert comp_data["unattemptedQuestions"] == total_qs - expected_attempted

async def test_scorecard_math_correctness():
    """Verify that scorecard math satisfies: correct + incorrect + skipped == total."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        users_res = await ac.get("/api/users")
        user_id = users_res.json()[0]["id"]

        exams_res = await ac.get("/api/exams")
        exam_id = exams_res.json()[0]["id"]

        subjects_res = await ac.get(f"/api/subjects/{exam_id}")
        subject_id = subjects_res.json()[0]["id"]

        chapters_res = await ac.get(f"/api/chapters/{subject_id}")
        chapter_id = chapters_res.json()[0]["id"]

        # Start new session
        start_res = await ac.post("/api/quiz/start", json={
            "userId": user_id,
            "chapterId": chapter_id
        })
        session_id = start_res.json()["sessionId"]
        total_qs = start_res.json()["totalQuestions"]

        # Complete immediately without answering anything (100% unattempted)
        complete_res = await ac.post("/api/quiz/complete", json={
            "sessionId": session_id
        })
        comp = complete_res.json()

        # Enforce Correct + Incorrect + Skipped == Total
        assert comp["correctAnswers"] + comp["incorrectAnswers"] + comp["skippedAnswers"] == comp["totalQuestions"]
        assert comp["unattemptedQuestions"] == total_qs
        assert comp["attemptedQuestions"] == 0
        assert comp["skippedAnswers"] == total_qs

async def test_best_score_tracking():
    """Verify that MongoDB max best score upsert records correctly and appears in chapters list."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Get ids
        users_res = await ac.get("/api/users")
        user_id = users_res.json()[0]["id"]

        exams_res = await ac.get("/api/exams")
        exam_id = exams_res.json()[0]["id"]

        subjects_res = await ac.get(f"/api/subjects/{exam_id}")
        subject_id = subjects_res.json()[0]["id"]

        chapters_res = await ac.get(f"/api/chapters/{subject_id}")
        chapter_id = chapters_res.json()[0]["id"]

        # Clean up existing attempts / scores for this user and chapter to avoid test pollution
        from bson import ObjectId
        await database.db.user_chapter_best_scores.delete_many({"userId": ObjectId(user_id), "chapterId": ObjectId(chapter_id)})
        await database.db.quiz_sessions.delete_many({"userId": ObjectId(user_id), "chapterId": ObjectId(chapter_id)})

        # 1. Complete session with 0 answers (percentage 0%)
        start_res1 = await ac.post("/api/quiz/start", json={"userId": user_id, "chapterId": chapter_id})
        session_id1 = start_res1.json()["sessionId"]
        await ac.post("/api/quiz/complete", json={"sessionId": session_id1})

        # Check chapter bestScore, should be 0.0
        chaps_res1 = await ac.get(f"/api/chapters/{subject_id}?userId={user_id}")
        chap1 = [c for c in chaps_res1.json() if c["id"] == chapter_id][0]
        assert chap1["completed"] is True
        assert chap1["bestScore"] == 0.0

        # 2. Start another session, answer 1st question correctly (percentage > 0)
        start_res2 = await ac.post("/api/quiz/start", json={"userId": user_id, "chapterId": chapter_id})
        session_id2 = start_res2.json()["sessionId"]
        
        q_res = await ac.get(f"/api/quiz/question/{session_id2}?questionIndex=0")
        q_id = q_res.json()["question"]["id"]
        
        # Submit correct option to guarantee a score > 0%
        # First, submit option 0, get correctOption in response, if it is incorrect, submit the correctOption!
        from datetime import datetime
        now_str = datetime.utcnow().isoformat()
        ans_res = await ac.post("/api/quiz/answer", json={
            "sessionId": session_id2,
            "questionId": q_id,
            "selectedOption": 0,
            "skipped": False,
            "shownAt": now_str,
            "answeredAt": now_str
        })
        correct_opt = ans_res.json()["correctOption"]
        # Resubmit with the correct option
        await ac.post("/api/quiz/answer", json={
            "sessionId": session_id2,
            "questionId": q_id,
            "selectedOption": correct_opt,
            "skipped": False,
            "shownAt": now_str,
            "answeredAt": now_str
        })
        
        # Complete session
        complete_res2 = await ac.post("/api/quiz/complete", json={"sessionId": session_id2})
        score2 = complete_res2.json()["percentage"]
        assert score2 > 0.0

        # Check chapter bestScore, should be score2
        chaps_res2 = await ac.get(f"/api/chapters/{subject_id}?userId={user_id}")
        chap2 = [c for c in chaps_res2.json() if c["id"] == chapter_id][0]
        assert chap2["bestScore"] == score2

        # 3. Complete a 3rd session with a lower score (0%)
        start_res3 = await ac.post("/api/quiz/start", json={"userId": user_id, "chapterId": chapter_id})
        session_id3 = start_res3.json()["sessionId"]
        await ac.post("/api/quiz/complete", json={"sessionId": session_id3})

        # Check chapter bestScore, should STILL be score2 (retaining the max!)
        chaps_res3 = await ac.get(f"/api/chapters/{subject_id}?userId={user_id}")
        chap3 = [c for c in chaps_res3.json() if c["id"] == chapter_id][0]
        assert chap3["bestScore"] == score2
