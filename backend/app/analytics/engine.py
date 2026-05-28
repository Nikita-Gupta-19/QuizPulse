from datetime import datetime, timedelta
from bson import ObjectId
import csv
import io
import random

class AnalyticsEngine:
    @staticmethod
    async def get_dashboard_summary(db):
        """
        Calculates key high-level SaaS-style KPIs.
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        seven_days_ago = today_start - timedelta(days=7)
        thirty_days_ago = today_start - timedelta(days=30)

        # 1. DAU: distinct users in past 24 hours
        dau_pipeline = [
            {"$match": {"timestamp": {"$gte": today_start}}},
            {"$group": {"_id": None, "distinct_users": {"$addToSet": "$userId"}}},
            {"$project": {"count": {"$size": "$distinct_users"}}}
        ]
        dau_res = await db.analytics_events.aggregate(dau_pipeline).to_list(1)
        dau = dau_res[0]["count"] if dau_res else 0

        # 2. WAU: distinct users in past 7 days
        wau_pipeline = [
            {"$match": {"timestamp": {"$gte": seven_days_ago}}},
            {"$group": {"_id": None, "distinct_users": {"$addToSet": "$userId"}}},
            {"$project": {"count": {"$size": "$distinct_users"}}}
        ]
        wau_res = await db.analytics_events.aggregate(wau_pipeline).to_list(1)
        wau = wau_res[0]["count"] if wau_res else 0

        # 3. Questions Served & Answered & Avg Response Time
        attempt_stats_pipeline = [
            {
                "$group": {
                    "_id": None,
                    "totalServed": {"$sum": 1},
                    "totalAnswered": {"$sum": {"$cond": [{"$eq": ["$skipped", False]}, 1, 0]}},
                    "avgResponseTime": {"$avg": {"$cond": [{"$eq": ["$skipped", False]}, "$responseTime", None]}},
                    "correctAnswers": {"$sum": {"$cond": [{"$eq": ["$isCorrect", True]}, 1, 0]}}
                }
            }
        ]
        attempt_stats = await db.question_attempts.aggregate(attempt_stats_pipeline).to_list(1)
        
        total_served = 0
        total_answered = 0
        avg_response_time = 0.0
        accuracy_rate = 0.0
        
        if attempt_stats:
            total_served = attempt_stats[0].get("totalServed", 0)
            total_answered = attempt_stats[0].get("totalAnswered", 0)
            avg_response_time = round(attempt_stats[0].get("avgResponseTime", 0.0) or 0.0, 2)
            if total_answered > 0:
                accuracy_rate = round((attempt_stats[0].get("correctAnswers", 0) / total_answered) * 100, 1)

        # 4. Completion Rate
        completion_pipeline = [
            {
                "$group": {
                    "_id": None,
                    "totalSessions": {"$sum": 1},
                    "completedSessions": {"$sum": {"$cond": [{"$eq": ["$completionStatus", "COMPLETED"]}, 1, 0]}}
                }
            }
        ]
        completion_stats = await db.quiz_sessions.aggregate(completion_pipeline).to_list(1)
        completion_rate = 0.0
        total_sessions = 0
        if completion_stats:
            total_sessions = completion_stats[0].get("totalSessions", 0)
            completed = completion_stats[0].get("completedSessions", 0)
            if total_sessions > 0:
                completion_rate = round((completed / total_sessions) * 100, 1)

        # 5. Average Questions Per Session
        avg_q_pipeline = [
            {"$group": {"_id": None, "avgQs": {"$avg": "$totalQuestions"}}}
        ]
        avg_q_res = await db.quiz_sessions.aggregate(avg_q_pipeline).to_list(1)
        avg_qs_per_session = round(avg_q_res[0]["avgQs"] if avg_q_res else 0.0, 1)

        # 6. Response Time Percentiles (p50, p95)
        response_times_cursor = db.question_attempts.find({"skipped": False}, {"responseTime": 1})
        response_times_docs = await response_times_cursor.to_list(20000)
        times = sorted([doc["responseTime"] for doc in response_times_docs if doc.get("responseTime") is not None])
        p50 = 0.0
        p95 = 0.0
        if times:
            n = len(times)
            p50 = round(times[int(n * 0.50)], 2)
            p95 = round(times[int(n * 0.95)], 2)

        return {
            "dau": dau,
            "wau": wau,
            "totalServed": total_served,
            "totalAnswered": total_answered,
            "avgResponseTime": avg_response_time,
            "p50ResponseTime": p50,
            "p95ResponseTime": p95,
            "accuracyRate": accuracy_rate,
            "completionRate": completion_rate,
            "avgQuestionsPerSession": avg_qs_per_session,
            "totalSessions": total_sessions
        }

    @staticmethod
    async def get_activity_charts(db):
        """
        Gathers daily activity parameters for charts over the last 30 days.
        """
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)

        # 1. Daily Active Users Trend
        dau_trend_pipeline = [
            {"$match": {"timestamp": {"$gte": thirty_days_ago}}},
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                        "userId": "$userId"
                    }
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "dauCount": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        dau_trend_res = await db.analytics_events.aggregate(dau_trend_pipeline).to_list(50)
        dau_trend = [{"date": r["_id"], "dau": r["dauCount"]} for r in dau_trend_res]

        # Ensure all 30 days are filled
        dates = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(30)]
        dates.reverse()
        
        dau_map = {d["date"]: d["dau"] for d in dau_trend}
        final_dau_trend = [{"date": d, "dau": dau_map.get(d, 0)} for d in dates]

        # 2. Peak Activity Hours
        peak_hours_pipeline = [
            {
                "$group": {
                    "_id": {"$hour": "$startedAt"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        peak_hours_res = await db.quiz_sessions.aggregate(peak_hours_pipeline).to_list(24)
        
        hours_map = {r["_id"]: r["count"] for r in peak_hours_res}
        final_peak_hours = [{"hour": f"{h:02d}:00", "sessions": hours_map.get(h, 0)} for h in range(24)]

        # 3. Daily Questions Served vs Answered
        q_daily_pipeline = [
            {"$match": {"shownAt": {"$gte": thirty_days_ago}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$shownAt"}},
                    "served": {"$sum": 1},
                    "answered": {"$sum": {"$cond": [{"$eq": ["$skipped", False]}, 1, 0]}}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        q_daily_res = await db.question_attempts.aggregate(q_daily_pipeline).to_list(50)
        q_daily_map = {r["_id"]: {"served": r["served"], "answered": r["answered"]} for r in q_daily_res}
        final_q_daily = [{
            "date": d,
            "served": q_daily_map.get(d, {}).get("served", 0),
            "answered": q_daily_map.get(d, {}).get("answered", 0)
        } for d in dates]

        return {
            "dauTrend": final_dau_trend,
            "peakHours": final_peak_hours,
            "questionsDaily": final_q_daily
        }

    @staticmethod
    async def get_performance_charts(db):
        """
        Assembles accuracy metrics, heatmap parameters, and extreme statistics.
        """
        # 1. Subject-wise Accuracy
        subject_pipeline = [
            # Link attempt -> question -> chapter -> subject
            {
                "$lookup": {
                    "from": "questions",
                    "localField": "questionId",
                    "foreignField": "_id",
                    "as": "q"
                }
            },
            {"$unwind": "$q"},
            {
                "$lookup": {
                    "from": "chapters",
                    "localField": "q.chapterId",
                    "foreignField": "_id",
                    "as": "c"
                }
            },
            {"$unwind": "$c"},
            {
                "$lookup": {
                    "from": "subjects",
                    "localField": "c.subjectId",
                    "foreignField": "_id",
                    "as": "s"
                }
            },
            {"$unwind": "$s"},
            {
                "$group": {
                    "_id": "$s.name",
                    "total": {"$sum": {"$cond": [{"$eq": ["$skipped", False]}, 1, 0]}},
                    "correct": {"$sum": {"$cond": [{"$eq": ["$isCorrect", True]}, 1, 0]}}
                }
            },
            {
                "$project": {
                    "subject": "$_id",
                    "accuracy": {
                        "$cond": [
                            {"$eq": ["$total", 0]},
                            0.0,
                            {"$multiply": [{"$divide": ["$correct", "$total"]}, 100]}
                        ]
                    },
                    "total": 1,
                    "_id": 0
                }
            },
            {"$sort": {"accuracy": -1}}
        ]
        subject_accuracy = await db.question_attempts.aggregate(subject_pipeline).to_list(30)
        for sa in subject_accuracy:
            sa["accuracy"] = round(sa["accuracy"], 1)

        # 2. Chapter Difficulty Heatmap
        heatmap_pipeline = [
            {
                "$lookup": {
                    "from": "questions",
                    "localField": "questionId",
                    "foreignField": "_id",
                    "as": "q"
                }
            },
            {"$unwind": "$q"},
            {
                "$lookup": {
                    "from": "chapters",
                    "localField": "q.chapterId",
                    "foreignField": "_id",
                    "as": "c"
                }
            },
            {"$unwind": "$c"},
            {
                "$group": {
                    "_id": {
                        "chapterName": "$c.name",
                        "difficulty": "$q.difficulty"
                    },
                    "total": {"$sum": {"$cond": [{"$eq": ["$skipped", False]}, 1, 0]}},
                    "correct": {"$sum": {"$cond": [{"$eq": ["$isCorrect", True]}, 1, 0]}}
                }
            },
            {
                "$project": {
                    "chapter": "$_id.chapterName",
                    "difficulty": "$_id.difficulty",
                    "accuracy": {
                        "$cond": [
                            {"$eq": ["$total", 0]},
                            0.0,
                            {"$multiply": [{"$divide": ["$correct", "$total"]}, 100]}
                        ]
                    },
                    "_id": 0
                }
            }
        ]
        heatmap_res = await db.question_attempts.aggregate(heatmap_pipeline).to_list(150)
        
        # Clean chapter names for simple visual mapping
        heatmap = []
        for h in heatmap_res:
            name_clean = h["chapter"].split(":")[-1].strip() if ":" in h["chapter"] else h["chapter"]
            heatmap.append({
                "chapter": name_clean[:25] + "..." if len(name_clean) > 25 else name_clean,
                "difficulty": h["difficulty"],
                "accuracy": round(h["accuracy"], 1)
            })

        # 3. Fastest Responders (users answering correctly in minimal times)
        fast_pipeline = [
            {"$match": {"isCorrect": True, "responseTime": {"$gt": 0.1}}},
            {
                "$lookup": {
                    "from": "quiz_sessions",
                    "localField": "sessionId",
                    "foreignField": "_id",
                    "as": "s"
                }
            },
            {"$unwind": "$s"},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "s.userId",
                    "foreignField": "_id",
                    "as": "u"
                }
            },
            {"$unwind": "$u"},
            {
                "$group": {
                    "_id": "$u.username",
                    "avgSpeed": {"$avg": "$responseTime"},
                    "correctCount": {"$sum": 1}
                }
            },
            {"$sort": {"avgSpeed": 1}},
            {"$limit": 5}
        ]
        fast_responders_res = await db.question_attempts.aggregate(fast_pipeline).to_list(5)
        fast_responders = [{
            "username": r["_id"],
            "speed": round(r["avgSpeed"], 2),
            "correctAnswers": r["correctCount"]
        } for r in fast_responders_res]

        # 4. Most Skipped Questions
        skipped_pipeline = [
            {
                "$group": {
                    "_id": "$questionId",
                    "skipCount": {"$sum": {"$cond": ["$skipped", 1, 0]}},
                    "totalAttempts": {"$sum": 1}
                }
            },
            {"$sort": {"skipCount": -1}},
            {"$limit": 5},
            {
                "$lookup": {
                    "from": "questions",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "q"
                }
            },
            {"$unwind": "$q"}
        ]
        skipped_res = await db.question_attempts.aggregate(skipped_pipeline).to_list(5)
        most_skipped = [{
            "questionId": str(r["_id"]),
            "questionText": r["q"]["questionText"][:50] + "...",
            "skipCount": r["skipCount"],
            "totalAttempts": r["totalAttempts"],
            "skipRatio": round((r["skipCount"] / r["totalAttempts"]) * 100, 1) if r["totalAttempts"] > 0 else 0.0
        } for r in skipped_res]

        # 5. Question Difficulty Calibration (miscalibrated questions: >70% skips or taking >2x the estimated time)
        miscalibrated_pipeline = [
            {
                "$lookup": {
                    "from": "questions",
                    "localField": "questionId",
                    "foreignField": "_id",
                    "as": "q"
                }
            },
            {"$unwind": "$q"},
            {
                "$group": {
                    "_id": "$questionId",
                    "questionText": {"$first": "$q.questionText"},
                    "difficulty": {"$first": "$q.difficulty"},
                    "estimatedTime": {"$first": "$q.estimatedTime"},
                    "totalAttempts": {"$sum": 1},
                    "skipCount": {"$sum": {"$cond": ["$skipped", 1, 0]}},
                    "overtimeCount": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$eq": ["$skipped", False]},
                                        {"$gt": ["$responseTime", {"$multiply": ["$q.estimatedTime", 2]}]}
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                "$project": {
                    "questionId": {"$toString": "$_id"},
                    "questionText": 1,
                    "difficulty": 1,
                    "estimatedTime": 1,
                    "totalAttempts": 1,
                    "skipCount": 1,
                    "overtimeCount": 1,
                    "problematicCount": {"$add": ["$skipCount", "$overtimeCount"]},
                    "problematicRatio": {
                        "$cond": [
                            {"$eq": ["$totalAttempts", 0]},
                            0.0,
                            {"$multiply": [{"$divide": [{"$add": ["$skipCount", "$overtimeCount"]}, "$totalAttempts"]}, 100]}
                        ]
                    }
                }
            },
            {"$match": {"problematicRatio": {"$gt": 70.0}, "totalAttempts": {"$gt": 0}}},
            {"$sort": {"problematicRatio": -1}},
            {"$limit": 5}
        ]
        miscalibrated_res = await db.question_attempts.aggregate(miscalibrated_pipeline).to_list(5)
        miscalibrated = [{
            "questionId": r["questionId"],
            "questionText": r["questionText"][:50] + "..." if len(r["questionText"]) > 50 else r["questionText"],
            "difficulty": r["difficulty"],
            "estimatedTime": r["estimatedTime"],
            "totalAttempts": r["totalAttempts"],
            "skipCount": r["skipCount"],
            "overtimeCount": r["overtimeCount"],
            "problematicRatio": round(r["problematicRatio"], 1)
        } for r in miscalibrated_res]

        return {
            "subjectAccuracy": subject_accuracy,
            "chapterHeatmap": heatmap,
            "fastestResponders": fast_responders,
            "mostSkippedQuestions": most_skipped,
            "miscalibratedQuestions": miscalibrated
        }

    @staticmethod
    async def get_dropoff_funnel(db):
        """
        Drop-off funnel metrics: checks cohort flow across consecutive questions.
        """
        funnel_pipeline = [
            {
                "$group": {
                    "_id": "$answeredQuestions",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        res = await db.quiz_sessions.aggregate(funnel_pipeline).to_list(100)
        
        total_sessions = await db.quiz_sessions.count_documents({})
        answered_counts = {r["_id"]: r["count"] for r in res}
        
        stages = [
            {"stage": "Session Started", "count": total_sessions, "pct": 100.0},
        ]
        
        for stage_idx in range(1, 6):
            stopped_prior = sum([v for k, v in answered_counts.items() if k < stage_idx])
            active_reached = total_sessions - stopped_prior
            
            stages.append({
                "stage": f"Answered Q{stage_idx}",
                "count": max(0, active_reached),
                "pct": round((active_reached / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
            })
            
        completed_sessions = await db.quiz_sessions.count_documents({"completionStatus": "COMPLETED"})
        stages.append({
            "stage": "Completed Quiz",
            "count": completed_sessions,
            "pct": round((completed_sessions / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
        })

        return stages

    @staticmethod
    async def generate_csv_report(db) -> str:
        """
        Compiles high-level analytics historical attempts data into CSV text format.
        """
        pipeline = [
            {
                "$lookup": {
                    "from": "questions",
                    "localField": "questionId",
                    "foreignField": "_id",
                    "as": "q"
                }
            },
            {"$unwind": "$q"},
            {
                "$lookup": {
                    "from": "quiz_sessions",
                    "localField": "sessionId",
                    "foreignField": "_id",
                    "as": "s"
                }
            },
            {"$unwind": "$s"},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "s.userId",
                    "foreignField": "_id",
                    "as": "u"
                }
            },
            {"$unwind": "$u"},
            {
                "$project": {
                    "attempt_id": {"$toString": "$_id"},
                    "username": "$u.username",
                    "email": "$u.email",
                    "question_text": "$q.questionText",
                    "difficulty": "$q.difficulty",
                    "selected_option": "$selectedOption",
                    "is_correct": "$isCorrect",
                    "skipped": "$skipped",
                    "response_time_sec": "$responseTime",
                    "timestamp": {"$dateToString": {"format": "%Y-%m-%d %H:%M:%S", "date": "$shownAt"}}
                }
            },
            {"$limit": 500} # Cap at 500 records for size
        ]
        attempts = await db.question_attempts.aggregate(pipeline).to_list(500)
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        headers = ["attempt_id", "username", "email", "question_text", "difficulty", "selected_option", "is_correct", "skipped", "response_time_sec", "timestamp"]
        writer.writerow(headers)
        
        for attempt in attempts:
            writer.writerow([
                attempt.get("attempt_id", ""),
                attempt.get("username", ""),
                attempt.get("email", ""),
                attempt.get("question_text", ""),
                attempt.get("difficulty", ""),
                attempt.get("selected_option", ""),
                attempt.get("is_correct", ""),
                attempt.get("skipped", ""),
                attempt.get("response_time_sec", ""),
                attempt.get("timestamp", "")
            ])
            
        return output.getvalue()
