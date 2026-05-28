from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from typing import List
from app.database.connection import get_db
from app.models.schemas import UserResponse, BookmarkRequest, BookmarkResponse, User
from app.utils.mongo import parse_id

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
async def get_all_users(db = Depends(get_db)):
    """
    Returns list of seeded mock users for the frontend selector dropdown.
    """
    users_cursor = db.users.find().limit(100)
    users = await users_cursor.to_list(100)
    return [UserResponse.from_db(u) for u in users]

@router.get("/leaderboard", response_model=List[UserResponse])
async def get_leaderboard(db = Depends(get_db)):
    """
    Retrieves top 10 users ranked by learning streak.
    """
    cursor = db.users.find().sort("streakCount", -1).limit(10)
    users = await cursor.to_list(10)
    return [UserResponse.from_db(u) for u in users]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: str, db = Depends(get_db)):
    """
    Retrieves details of a single user profile.
    """
    uid = parse_id(user_id)
    user_doc = await db.users.find_one({"_id": uid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.from_db(user_doc)

@router.post("/{user_id}/bookmark", response_model=BookmarkResponse)
async def toggle_bookmark(user_id: str, payload: BookmarkRequest, db = Depends(get_db)):
    """
    Add or remove a question bookmark for a user.
    """
    uid = parse_id(user_id)
    user_doc = await db.users.find_one({"_id": uid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_bookmarks = user_doc.get("bookmarkedQuestions", [])
    
    if payload.action == "add":
        if payload.questionId not in current_bookmarks:
            await db.users.update_one(
                {"_id": uid},
                {"$addToSet": {"bookmarkedQuestions": payload.questionId}}
            )
        bookmarked = True
    elif payload.action == "remove":
        await db.users.update_one(
            {"_id": uid},
            {"$pull": {"bookmarkedQuestions": payload.questionId}}
        )
        bookmarked = False
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'add' or 'remove'")
        
    return BookmarkResponse(bookmarked=bookmarked, questionId=payload.questionId)
