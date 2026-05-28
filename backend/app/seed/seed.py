import sys
import os
import random
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, DESCENDING
from faker import Faker

# Add project root to path to allow imports if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database.indexes import create_indexes as ensure_db_indexes

fake = Faker()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "quizpulse")

print(f"Connecting to MongoDB at {MONGO_URI}...")
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def clean_database():
    print("Cleaning database collections...")
    db.users.drop()
    db.exams.drop()
    db.subjects.drop()
    db.chapters.drop()
    db.questions.drop()
    db.quiz_sessions.drop()
    db.question_attempts.drop()
    db.analytics_events.drop()
    print("Database cleaned.")

# Predefined data structure
EXAMS_DATA = [
    {"name": "UPSC (Civil Services)", "code": "upsc", "icon": "Briefcase", "description": "Union Public Service Commission - India's premier civil services examination."},
    {"name": "JEE (Joint Entrance Exam)", "code": "jee", "icon": "Award", "description": "National level engineering entrance exam for top institutes like IITs."},
    {"name": "NEET (Medical Entrance)", "code": "neet", "icon": "Activity", "description": "National Eligibility cum Entrance Test for undergraduate medical programs."},
    {"name": "GATE (Engineering Graduate)", "code": "gate", "icon": "Cpu", "description": "Graduate Aptitude Test in Engineering for masters and PSU recruitments."},
    {"name": "CAT (Management Aptitude)", "code": "cat", "icon": "BarChart3", "description": "Common Admission Test for premium business schools like IIMs."}
]

SUBJECTS_BY_EXAM = {
    "upsc": [
        {"name": "Indian Polity", "description": "Constitution, Governance, and Political System of India."},
        {"name": "Geography", "description": "Physical, Economic, and Social Geography of India and the World."},
        {"name": "Indian History", "description": "Ancient, Medieval, and Modern History of India, and National Movement."},
        {"name": "Indian Economy", "description": "Economic Development, Policies, and Financial Institutions."}
    ],
    "jee": [
        {"name": "Physics", "description": "Mechanics, Thermodynamics, Electromagnetism, and Modern Physics."},
        {"name": "Chemistry", "description": "Physical, Organic, and Inorganic Chemistry."},
        {"name": "Mathematics", "description": "Calculus, Algebra, Coordinate Geometry, and Trigonometry."}
    ],
    "neet": [
        {"name": "Biology", "description": "Botany, Zoology, Genetics, Ecology, and Human Physiology."},
        {"name": "Physics (Medical)", "description": "Simplified Physics focused on Medical application, Optics, and Modern Physics."},
        {"name": "Chemistry (Medical)", "description": "Organic chemistry pathways, Bio-molecules, and General chemistry."}
    ],
    "gate": [
        {"name": "Computer Science (CSE)", "description": "Algorithms, Data Structures, Operating Systems, Databases, and Networks."},
        {"name": "Electrical Engineering (EE)", "description": "Power Systems, Control Systems, Signals and Systems, and Electromagnetics."},
        {"name": "Mechanical Engineering (ME)", "description": "Thermodynamics, Machine Design, Fluid Mechanics, and Heat Transfer."},
        {"name": "Engineering Mathematics", "description": "Linear Algebra, Probability, Calculus, and Numerical Methods."}
    ],
    "cat": [
        {"name": "Quantitative Aptitude", "description": "Arithmetic, Algebra, Geometry, Numbers, and Modern Mathematics."},
        {"name": "Data Interpretation & LR", "description": "Tables, Graphs, Venn Diagrams, Caselets, and Logical Puzzles."},
        {"name": "Verbal Ability & RC", "description": "Reading Comprehension, Paragraph Summary, Jumbled Sentences, and Grammar."}
    ]
}

CHAPTERS_TEMPLATE = [
    # General terms used dynamically
    ["Introduction and Core Concepts", "Easy", 15],
    ["Advanced Applications and Theorems", "Hard", 25],
    ["Key Methods and Problem Solving", "Medium", 20],
    ["Historical Overview and Foundations", "Easy", 15],
    ["Critical Case Studies and Frameworks", "Medium", 20],
    ["Final Practice and Mixed Drill", "Hard", 30]
]

QUESTION_POOL = {
    "Easy": [
        ("What is the fundamental unit of this domain?", ["Atom/Cell", "Option B", "Option C", "Option D"], 0),
        ("Which of the following is correct regarding basic parameters?", ["Direct relationship", "Inverse relationship", "No relationship", "Logarithmic relationship"], 1),
        ("Identify the primary source or origin.", ["Primary Source", "Secondary Source", "Tertiary Source", "Quaternary Source"], 0),
        ("Who is widely credited as the pioneer of this subject?", ["Scientist A", "Pioneer B", "Philosopher C", "Innovator D"], 1),
        ("Which simple formula governs this behavior?", ["Linear Form", "Exponential Form", "Quadratic Form", "No governance"], 0)
    ],
    "Medium": [
        ("Under which specific conditions does this model fail?", ["Extremely high pressure", "Standard atmospheric state", "Pure vacuum", "Room temperature"], 0),
        ("Evaluate the impact of changing the control variable.", ["Increases exponentially", "Decreases linearly", "Remains constant, then peaks", "Halves instantly"], 2),
        ("Which intermediate step is crucial for this synthesis?", ["Catalysis", "Hydrolysis", "Isomerization", "Dehydration"], 2),
        ("Select the option that best illustrates the anomaly.", ["Anomaly Case A", "Typical Case B", "Inert Case C", "Neutral Case D"], 0),
        ("How does the system react to external perturbation?", ["Negative feedback loop", "Positive feedback loop", "Instability explosion", "Zero reaction"], 0)
    ],
    "Hard": [
        ("Derive the ultimate limiting value of the efficiency equation.", ["Max limit is 84%", "Approaches 100% asymptotically", "Limited by Carnot Bound", "Exactly 50%"], 2),
        ("Determine the exact solution under boundary condition Y.", ["Solution A", "Complex Solution B", "Degenerate Solution C", "No unique solution"], 1),
        ("Analyze the structural failure when shear stress exceeds limit.", ["Brittle fracture", "Ductile necking", "Delamination", "Elastic rebound"], 0),
        ("Which advanced paradigm directly resolves this computational paradox?", ["Quantum Computing", "P vs NP Heuristics", "Approximation Algorithms", "Distributed Consensus"], 2),
        ("What is the thermodynamic cost of erasing one bit of information here?", ["k*T*ln(2)", "Zero cost", "Infinitive energy", "Planck Constant"], 0)
    ]
}

def seed_users():
    print("Seeding 100 mock users...")
    users = []
    
    # Let's seed 1 specialized user "recruiter@skillbytes.com" for easy demo!
    recruiter = {
        "_id": ObjectId("60d5ec49f3292b21c459f001"),
        "username": "Recruiter Demo",
        "email": "recruiter@skillbytes.com",
        "avatarUrl": "https://api.dicebear.com/7.x/pixel-art/svg?seed=recruiter",
        "streakCount": 5,
        "lastActiveDate": (datetime.utcnow()).strftime("%Y-%m-%d"),
        "bookmarkedQuestions": [],
        "createdAt": datetime.utcnow() - timedelta(days=45)
    }
    users.append(recruiter)
    
    for i in range(1, 100):
        # realistic last active date distribution (some active today, some older)
        last_active = datetime.utcnow() - timedelta(days=random.randint(0, 20))
        streak = random.randint(0, 15) if last_active.date() >= (datetime.utcnow() - timedelta(days=2)).date() else 0
        
        user = {
            "_id": ObjectId(),
            "username": fake.name(),
            "email": f"user{i}@{fake.free_email_domain()}",
            "avatarUrl": f"https://api.dicebear.com/7.x/pixel-art/svg?seed=user{i}",
            "streakCount": streak,
            "lastActiveDate": last_active.strftime("%Y-%m-%d"),
            "bookmarkedQuestions": [],
            "createdAt": datetime.utcnow() - timedelta(days=random.randint(30, 90))
        }
        users.append(user)
    
    db.users.insert_many(users)
    print("Users seeded successfully.")
    return users

def seed_exams_subjects_chapters():
    print("Seeding exams, subjects, and chapters...")
    exams_inserted = []
    subjects_inserted = []
    chapters_inserted = []
    
    for exam_info in EXAMS_DATA:
        exam_id = ObjectId()
        exam_doc = {
            "_id": exam_id,
            "name": exam_info["name"],
            "code": exam_info["code"],
            "icon": exam_info["icon"],
            "description": exam_info["description"],
            "createdAt": datetime.utcnow() - timedelta(days=60)
        }
        db.exams.insert_one(exam_doc)
        exams_inserted.append(exam_doc)
        
        # subjects for this exam
        sub_list = SUBJECTS_BY_EXAM.get(exam_info["code"], [])
        for sub_info in sub_list:
            sub_id = ObjectId()
            sub_doc = {
                "_id": sub_id,
                "examId": exam_id,
                "name": sub_info["name"],
                "description": sub_info["description"],
                "createdAt": datetime.utcnow() - timedelta(days=60)
            }
            db.subjects.insert_one(sub_doc)
            subjects_inserted.append(sub_doc)
            
            # chapters for this subject (let's create 3 chapters per subject)
            random.shuffle(CHAPTERS_TEMPLATE)
            for j in range(3):
                chap_template = CHAPTERS_TEMPLATE[j]
                chap_id = ObjectId()
                chap_doc = {
                    "_id": chap_id,
                    "subjectId": sub_id,
                    "name": f"Chapter {j+1}: {chap_template[0]}",
                    "description": f"Learn foundational principles, practice drills, and check concepts on {chap_template[0]}.",
                    "estimatedTime": chap_template[2],
                    "difficulty": chap_template[1],
                    "createdAt": datetime.utcnow() - timedelta(days=60)
                }
                db.chapters.insert_one(chap_doc)
                chapters_inserted.append(chap_doc)
                
    print(f"Seeded {len(exams_inserted)} Exams, {len(subjects_inserted)} Subjects, and {len(chapters_inserted)} Chapters.")
    return exams_inserted, subjects_inserted, chapters_inserted

def seed_questions(chapters):
    print("Seeding questions (500+)...")
    questions = []
    
    for chapter in chapters:
        chapter_id = chapter["_id"]
        difficulty = chapter["difficulty"]
        
        # We will create 10-12 questions for each chapter
        num_questions = random.randint(10, 12)
        
        for q_idx in range(num_questions):
            # Select question text pool based on difficulty or mix it up
            pool_diff = difficulty if random.random() < 0.8 else random.choice(["Easy", "Medium", "Hard"])
            pool = QUESTION_POOL[pool_diff]
            base_q, base_opts, correct_opt = random.choice(pool)
            
            # Make it unique
            q_text = f"{base_q} (Set {q_idx + 1} - {chapter['name']})"
            options = [f"{opt} for {chapter['name']}" for opt in base_opts]
            
            # Add dynamic context
            question = {
                "_id": ObjectId(),
                "chapterId": chapter_id,
                "questionText": q_text,
                "options": options,
                "correctOption": correct_opt,
                "difficulty": pool_diff,
                "estimatedTime": 30 if pool_diff == "Easy" else (45 if pool_diff == "Medium" else 60),
                "tags": [chapter["name"].split(":")[1].strip(), pool_diff, "Practice"],
                "createdAt": datetime.utcnow() - timedelta(days=60)
            }
            questions.append(question)
            
    db.questions.insert_many(questions)
    print(f"Successfully seeded {len(questions)} Questions.")
    return questions

def seed_quiz_history_and_analytics(users, chapters, questions):
    print("Seeding quiz history (1000+ attempts) and analytics events over the past 30 days...")
    
    # Map questions by chapter for faster lookup
    questions_by_chapter = {}
    for q in questions:
        c_id = str(q["chapterId"])
        if c_id not in questions_by_chapter:
            questions_by_chapter[c_id] = []
        questions_by_chapter[c_id].append(q)
        
    sessions = []
    attempts = []
    events = []
    
    # Generate mock attempts over the last 30 days
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # 1200 mock sessions
    total_sessions_to_create = 1200
    
    for session_idx in range(total_sessions_to_create):
        # Pick random user & chapter
        user = random.choice(users)
        user_id = user["_id"]
        chapter = random.choice(chapters)
        chapter_id = chapter["_id"]
        
        # Pick time in last 30 days
        session_time = start_date + timedelta(
            days=random.randint(0, 29),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        
        # Chapter questions
        chap_qs = questions_by_chapter.get(str(chapter_id), [])
        if not chap_qs:
            continue
            
        num_qs = min(len(chap_qs), random.choice([5, 8, 10]))
        selected_qs = random.sample(chap_qs, num_qs)
        
        # Session state
        session_id = ObjectId()
        
        # 15% chance of being abandoned or in progress (if recent)
        recent_cutoff = datetime.utcnow() - timedelta(days=2)
        if session_time > recent_cutoff and random.random() < 0.15:
            completion_status = "IN_PROGRESS"
            completed_at = None
            answered_count = random.randint(1, num_qs - 1)
        else:
            completion_status = "COMPLETED"
            # duration between 1 and 10 minutes
            completed_at = session_time + timedelta(seconds=random.randint(60, 600))
            answered_count = num_qs
            
        session_doc = {
            "_id": session_id,
            "userId": user_id,
            "chapterId": chapter_id,
            "startedAt": session_time,
            "completedAt": completed_at,
            "completionStatus": completion_status,
            "totalQuestions": num_qs,
            "answeredQuestions": answered_count
        }
        sessions.append(session_doc)
        
        # Generate attempts
        curr_time = session_time
        for idx in range(answered_count):
            q = selected_qs[idx]
            
            # shown timestamp
            shown_at = curr_time
            
            # answer details
            skipped = random.random() < 0.08 # 8% skip rate
            
            if skipped:
                answered_at = shown_at + timedelta(seconds=random.randint(2, 8))
                response_time = (answered_at - shown_at).total_seconds()
                selected_option = None
                is_correct = None
            else:
                answered_at = shown_at + timedelta(seconds=random.randint(5, 50))
                response_time = (answered_at - shown_at).total_seconds()
                
                # Accuracy: 70% for Easy, 55% for Medium, 40% for Hard
                diff = q["difficulty"]
                success_prob = 0.70 if diff == "Easy" else (0.55 if diff == "Medium" else 0.40)
                
                correct = random.random() < success_prob
                if correct:
                    selected_option = q["correctOption"]
                    is_correct = True
                else:
                    wrong_opts = [o for o in [0,1,2,3] if o != q["correctOption"]]
                    selected_option = random.choice(wrong_opts)
                    is_correct = False
                    
            attempt_doc = {
                "_id": ObjectId(),
                "sessionId": session_id,
                "questionId": q["_id"],
                "shownAt": shown_at,
                "answeredAt": answered_at,
                "responseTime": response_time,
                "selectedOption": selected_option,
                "isCorrect": is_correct,
                "skipped": skipped
            }
            attempts.append(attempt_doc)
            curr_time = answered_at + timedelta(seconds=random.randint(1, 3)) # delay between questions
            
        # Analytics events
        # Event: START_QUIZ
        events.append({
            "_id": ObjectId(),
            "eventType": "START_QUIZ",
            "userId": user_id,
            "timestamp": session_time,
            "metadata": {"sessionId": str(session_id), "chapterId": str(chapter_id)}
        })
        
        if completion_status == "COMPLETED":
            events.append({
                "_id": ObjectId(),
                "eventType": "COMPLETE_QUIZ",
                "userId": user_id,
                "timestamp": completed_at,
                "metadata": {"sessionId": str(session_id), "chapterId": str(chapter_id)}
            })
            
        # PAGE_VIEWS dynamically
        if random.random() < 0.4:
            events.append({
                "_id": ObjectId(),
                "eventType": "PAGE_VIEW",
                "userId": user_id,
                "timestamp": session_time - timedelta(minutes=random.randint(1, 5)),
                "metadata": {"page": "exams"}
            })

    print(f"Inserting {len(sessions)} Sessions...")
    db.quiz_sessions.insert_many(sessions)
    
    print(f"Inserting {len(attempts)} Attempts...")
    # chunk attempts if too large (pymongo limit)
    attempt_chunks = [attempts[i:i + 5000] for i in range(0, len(attempts), 5000)]
    for chunk in attempt_chunks:
        db.question_attempts.insert_many(chunk)
        
    print(f"Inserting {len(events)} Analytics Events...")
    event_chunks = [events[i:i + 5000] for i in range(0, len(events), 5000)]
    for chunk in event_chunks:
        db.analytics_events.insert_many(chunk)
        
    print("History and analytics seeded completely.")

def main():
    print("=== SEEDING PROCESS STARTED ===")
    clean_database()
    ensure_db_indexes(db)
    
    users = seed_users()
    exams, subjects, chapters = seed_exams_subjects_chapters()
    questions = seed_questions(chapters)
    seed_quiz_history_and_analytics(users, chapters, questions)
    
    print("=== SEEDING PROCESS COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
