from pymongo import MongoClient, ASCENDING

def create_indexes(db):
    """
    Creates MongoDB database indexes with compound and single field layouts
    to optimize high-performance aggregation pipelines and query speeds.
    """
    print("Creating database indexes for maximum performance...")
    
    # --- Users Collection ---
    # Unique constraint to prevent duplicate emails
    db.users.create_index([("email", ASCENDING)], unique=True)
    # Optimized query speed for listing/checking user active dates
    db.users.create_index([("lastActiveDate", ASCENDING)])
    
    # --- Subjects Collection ---
    # Optimized lookup of subjects matching an examId
    db.subjects.create_index([("examId", ASCENDING)])
    
    # --- Chapters Collection ---
    # Fast filtering of chapters within a subject
    db.chapters.create_index([("subjectId", ASCENDING)])
    
    # --- Questions Collection ---
    # Fast query to list questions by chapter
    db.questions.create_index([("chapterId", ASCENDING)])
    # Compound index for filtering questions by chapter and difficulty level
    db.questions.create_index([("chapterId", ASCENDING), ("difficulty", ASCENDING)])
    
    # --- Quiz Sessions Collection ---
    # Speed up lookup of a specific user's quiz sessions
    db.quiz_sessions.create_index([("userId", ASCENDING)])
    # Speed up chapter attempts count queries
    db.quiz_sessions.create_index([("chapterId", ASCENDING)])
    # Speed up filtering for IN_PROGRESS vs COMPLETED sessions
    db.quiz_sessions.create_index([("completionStatus", ASCENDING)])
    # Compound index to quickly find/resume a user's active session on a chapter
    db.quiz_sessions.create_index([("userId", ASCENDING), ("chapterId", ASCENDING)])
    
    # --- Question Attempts Collection ---
    # Retrieve all question attempts belonging to a specific session
    db.question_attempts.create_index([("sessionId", ASCENDING)])
    # Compound unique index to prevent duplicate attempts on a question within the same session
    db.question_attempts.create_index([("sessionId", ASCENDING), ("questionId", ASCENDING)], unique=True)
    # Speed up queries looking up attempts of a specific question across all sessions
    db.question_attempts.create_index([("questionId", ASCENDING)])
    
    # --- Analytics Events Collection ---
    # Chronological index for trend analysis (DAU/WAU aggregations)
    db.analytics_events.create_index([("timestamp", ASCENDING)])
    # Fast filtering by trigger action types (e.g. STREAK_EARNED, START_QUIZ)
    db.analytics_events.create_index([("eventType", ASCENDING)])
    
    print("Indexes created successfully.")
