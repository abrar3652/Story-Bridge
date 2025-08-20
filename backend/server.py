from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import logging
import uuid
from pathlib import Path
import io
import pyotp
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
fs = AsyncIOMotorGridFSBucket(db)

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-here-change-in-production")
ADMIN_MFA_SECRET = os.environ.get("ADMIN_MFA_SECRET", "STORYBRIDGE2025ADMINSECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="StoryBridge API")
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str  # "end_user", "creator", "narrator", "admin"

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    otp_code: Optional[str] = None  # For admin MFA

class AdminLogin(BaseModel):
    email: EmailStr
    password: str
    otp_code: str

class UserProfile(BaseModel):
    email: Optional[str] = None
    language: Optional[str] = None
    avatar: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    role: str
    language: str = "en"
    avatar: Optional[str] = None
    mfa_secret: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class StoryCreate(BaseModel):
    title: str
    text: str
    language: str = "en"
    age_group: str  # "4-6" or "7-10"
    vocabulary: List[str] = []
    quizzes: List[Dict[str, Any]] = []

class Story(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    text: str
    language: str
    age_group: str
    vocabulary: List[str]
    quizzes: List[Dict[str, Any]]
    creator_id: str
    status: str = "draft"  # draft, pending, published, rejected
    audio_id: Optional[str] = None
    images: List[str] = []
    tprs_score: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NarrationCreate(BaseModel):
    story_id: str
    text: Optional[str] = None

class Narration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    story_id: str
    narrator_id: str
    audio_id: Optional[str] = None
    text: Optional[str] = None
    status: str = "draft"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Progress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    story_id: str
    completed: bool = False
    time_spent: int = 0
    vocabulary_learned: List[Dict[str, Any]] = []  # {word, learned_at, repetitions}
    quiz_results: List[Dict[str, Any]] = []
    coins_earned: int = 0
    badges_earned: List[str] = []
    last_position: int = 0  # For resuming stories
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Analytics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    period: str  # daily, weekly, monthly
    active_users: int = 0
    stories_completed: int = 0
    avg_session_time: float = 0.0
    vocab_retention_rate: float = 0.0
    total_coins_earned: int = 0
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentReview(BaseModel):
    content_id: str
    content_type: str  # "story" or "narration"
    status: str  # "approved" or "rejected"
    reviewer_id: str
    feedback: Optional[str] = None

# Authentication helpers
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def validate_tprs_compliance(text: str, vocabulary: List[str]) -> Dict[str, Any]:
    """Validate TPRS compliance: 80% known vocab, 7+ repetitions"""
    words = re.findall(r'\b\w+\b', text.lower())
    total_words = len(words)
    
    # Check vocabulary repetitions
    vocab_repetitions = {}
    for vocab_word in vocabulary:
        count = text.lower().count(vocab_word.lower())
        vocab_repetitions[vocab_word] = count
    
    # Calculate compliance score
    min_repetitions = min(vocab_repetitions.values()) if vocab_repetitions else 0
    compliance_score = min_repetitions / 7.0 if min_repetitions > 0 else 0
    
    return {
        "compliant": min_repetitions >= 7,
        "min_repetitions": min_repetitions,
        "vocab_repetitions": vocab_repetitions,
        "compliance_score": compliance_score,
        "total_words": total_words
    }

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Auth routes
@api_router.post("/auth/signup", response_model=Token)
async def signup(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop("password")
    
    # Generate MFA secret for admin users
    if user.role == "admin":
        user_dict["mfa_secret"] = pyotp.random_base32()
    
    user_obj = User(**user_dict)
    user_data = user_obj.dict()
    user_data["password"] = hashed_password
    
    await db.users.insert_one(user_data)
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Check MFA for admin users
    if db_user["role"] == "admin":
        if not user.otp_code:
            raise HTTPException(status_code=401, detail="OTP code required for admin login")
        
        totp = pyotp.TOTP(db_user.get("mfa_secret", ADMIN_MFA_SECRET))
        if not totp.verify(user.otp_code):
            raise HTTPException(status_code=401, detail="Invalid OTP code")
    
    user_obj = User(**db_user)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.post("/auth/admin/login", response_model=Token)
async def admin_login(admin: AdminLogin):
    db_user = await db.users.find_one({"email": admin.email, "role": "admin"})
    if not db_user or not verify_password(admin.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    # Verify OTP
    totp = pyotp.TOTP(db_user.get("mfa_secret", ADMIN_MFA_SECRET))
    if not totp.verify(admin.otp_code):
        raise HTTPException(status_code=401, detail="Invalid OTP code")
    
    user_obj = User(**db_user)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/profile", response_model=User)
async def update_profile(profile: UserProfile, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in profile.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.users.update_one({"id": current_user.id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": current_user.id})
    return User(**updated_user)

@api_router.delete("/auth/me")
async def delete_account(current_user: User = Depends(get_current_user)):
    # Delete user data (GDPR compliance)
    await db.users.delete_one({"id": current_user.id})
    await db.progress.delete_many({"user_id": current_user.id})
    
    return {"message": "Account deleted successfully"}

# Story routes
@api_router.post("/stories", response_model=Story)
async def create_story(story: StoryCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["creator", "admin"]:
        raise HTTPException(status_code=403, detail="Only creators can create stories")
    
    # Validate TPRS compliance
    tprs_validation = validate_tprs_compliance(story.text, story.vocabulary)
    
    story_dict = story.dict()
    story_obj = Story(**story_dict, creator_id=current_user.id, tprs_score=tprs_validation["compliance_score"])
    
    # Auto-approve if TPRS compliant, otherwise set to pending
    if tprs_validation["compliant"]:
        story_obj.status = "published"
    else:
        story_obj.status = "pending"
    
    await db.stories.insert_one(story_obj.dict())
    
    return story_obj

@api_router.get("/stories", response_model=List[Story])
async def get_stories(
    language: Optional[str] = Query(None),
    age_group: Optional[str] = Query(None),
    status: str = Query("published"),
    narrator_filter: Optional[str] = Query(None)  # "narrated" or "not_narrated"
):
    filter_dict = {"status": status}
    if language:
        filter_dict["language"] = language
    if age_group:
        filter_dict["age_group"] = age_group
    
    stories = await db.stories.find(filter_dict).to_list(100)
    
    # Apply narrator filter
    if narrator_filter:
        story_ids = [story["id"] for story in stories]
        narrated_story_ids = []
        
        if story_ids:
            narrations = await db.narrations.find({"story_id": {"$in": story_ids}}).to_list(1000)
            narrated_story_ids = [n["story_id"] for n in narrations]
        
        if narrator_filter == "narrated":
            stories = [s for s in stories if s["id"] in narrated_story_ids]
        elif narrator_filter == "not_narrated":
            stories = [s for s in stories if s["id"] not in narrated_story_ids]
    
    return [Story(**story) for story in stories]

@api_router.get("/stories/creator", response_model=List[Story])
async def get_creator_stories(current_user: User = Depends(get_current_user)):
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can access this")
    
    stories = await db.stories.find({"creator_id": current_user.id}).to_list(100)
    return [Story(**story) for story in stories]

@api_router.put("/stories/{story_id}", response_model=Story)
async def update_story(story_id: str, story_update: StoryCreate, current_user: User = Depends(get_current_user)):
    story = await db.stories.find_one({"id": story_id, "creator_id": current_user.id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Re-validate TPRS compliance
    tprs_validation = validate_tprs_compliance(story_update.text, story_update.vocabulary)
    
    update_data = story_update.dict()
    update_data["tprs_score"] = tprs_validation["compliance_score"]
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Reset status to pending if not compliant
    if not tprs_validation["compliant"]:
        update_data["status"] = "pending"
    
    await db.stories.update_one({"id": story_id}, {"$set": update_data})
    
    updated_story = await db.stories.find_one({"id": story_id})
    return Story(**updated_story)

@api_router.delete("/stories/{story_id}")
async def delete_story(story_id: str, current_user: User = Depends(get_current_user)):
    story = await db.stories.find_one({"id": story_id, "creator_id": current_user.id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if story["status"] == "published":
        raise HTTPException(status_code=400, detail="Cannot delete published story")
    
    await db.stories.delete_one({"id": story_id})
    return {"message": "Story deleted successfully"}

@api_router.patch("/stories/{story_id}/status")
async def update_story_status(story_id: str, status: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["creator", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Creators can only set to pending, admins can set any status
    if current_user.role == "creator" and status not in ["pending"]:
        raise HTTPException(status_code=403, detail="Creators can only set status to pending")
    
    await db.stories.update_one(
        {"id": story_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": f"Story status updated to {status}"}

# Narration routes
@api_router.post("/narrations")
async def create_narration(
    story_id: str = Form(...),
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "narrator":
        raise HTTPException(status_code=403, detail="Only narrators can create narrations")
    
    # Check if story exists
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    narration_data = {
        "story_id": story_id,
        "narrator_id": current_user.id,
        "text": text
    }
    
    # Handle audio upload
    if audio:
        if audio.size > 5 * 1024 * 1024:  # 5MB limit
            raise HTTPException(status_code=400, detail="Audio file too large (max 5MB)")
        
        audio_id = await fs.upload_from_stream(
            f"narration_{uuid.uuid4()}.{audio.filename.split('.')[-1]}",
            io.BytesIO(await audio.read()),
            metadata={"content_type": audio.content_type, "narrator_id": current_user.id}
        )
        narration_data["audio_id"] = str(audio_id)
    
    narration_obj = Narration(**narration_data)
    await db.narrations.insert_one(narration_obj.dict())
    
    return {"message": "Narration created successfully", "narration": narration_obj}

@api_router.get("/narrations/narrator")
async def get_narrator_narrations(current_user: User = Depends(get_current_user)):
    if current_user.role != "narrator":
        raise HTTPException(status_code=403, detail="Only narrators can access this")
    
    narrations = await db.narrations.find({"narrator_id": current_user.id}).to_list(100)
    return [Narration(**narration) for narration in narrations]

@api_router.get("/narrations/{narration_id}/audio")
async def get_narration_audio(narration_id: str):
    narration = await db.narrations.find_one({"id": narration_id})
    if not narration or not narration.get("audio_id"):
        raise HTTPException(status_code=404, detail="Audio not found")
    
    try:
        grid_out = await fs.open_download_stream(narration["audio_id"])
        return StreamingResponse(
            io.BytesIO(await grid_out.read()),
            media_type="audio/mpeg"
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Audio file not found")

# Progress routes
@api_router.post("/progress")
async def sync_progress(progress: Progress, current_user: User = Depends(get_current_user)):
    progress_dict = progress.dict()
    progress_dict["user_id"] = current_user.id
    progress_dict["updated_at"] = datetime.now(timezone.utc)
    
    # Upsert progress
    await db.progress.update_one(
        {"user_id": current_user.id, "story_id": progress.story_id},
        {"$set": progress_dict},
        upsert=True
    )
    
    return {"message": "Progress synced successfully"}

@api_router.get("/progress/user")
async def get_user_progress(current_user: User = Depends(get_current_user)):
    progress_list = await db.progress.find({"user_id": current_user.id}).to_list(100)
    return [Progress(**progress) for progress in progress_list]

# Analytics routes
@api_router.get("/analytics/ngo")
async def get_ngo_analytics(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["end_user", "admin"]:  # Teachers and admins
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate analytics
    total_users = await db.users.count_documents({"role": "end_user"})
    total_progress = await db.progress.count_documents({})
    completed_stories = await db.progress.count_documents({"completed": True})
    
    # Average session time calculation
    progress_docs = await db.progress.find({"time_spent": {"$gt": 0}}).to_list(1000)
    avg_session_time = sum(p["time_spent"] for p in progress_docs) / len(progress_docs) if progress_docs else 0
    
    # Vocabulary retention calculation
    vocab_results = []
    for p in progress_docs:
        for result in p.get("quiz_results", []):
            if "correct" in result:
                vocab_results.append(result["correct"])
    
    vocab_retention = (sum(vocab_results) / len(vocab_results) * 100) if vocab_results else 0
    
    # Total coins earned
    total_coins = sum(p.get("coins_earned", 0) for p in progress_docs)
    
    analytics = {
        "active_users": total_users,
        "stories_completed": completed_stories,
        "avg_session_time": round(avg_session_time / 60, 2),  # Convert to minutes
        "vocab_retention_rate": round(vocab_retention, 2),
        "total_coins_earned": total_coins,
        "generated_at": datetime.now(timezone.utc)
    }
    
    return analytics

# Admin routes
@api_router.get("/admin/pending")
async def get_pending_content(admin: User = Depends(get_admin_user)):
    pending_stories = await db.stories.find({"status": "pending"}).to_list(100)
    pending_narrations = await db.narrations.find({"status": "pending"}).to_list(100)
    
    return {
        "stories": [Story(**story) for story in pending_stories],
        "narrations": [Narration(**narration) for narration in pending_narrations]
    }

@api_router.patch("/admin/content/{content_id}/approve")
async def approve_content(
    content_id: str,
    content_type: str,
    feedback: Optional[str] = None,
    admin: User = Depends(get_admin_user)
):
    collection = db.stories if content_type == "story" else db.narrations
    
    result = await collection.update_one(
        {"id": content_id},
        {"$set": {"status": "published", "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Log review
    review = ContentReview(
        content_id=content_id,
        content_type=content_type,
        status="approved",
        reviewer_id=admin.id,
        feedback=feedback
    )
    await db.content_reviews.insert_one(review.dict())
    
    return {"message": f"{content_type.title()} approved successfully"}

@api_router.patch("/admin/content/{content_id}/reject")
async def reject_content(
    content_id: str,
    content_type: str,
    feedback: str,
    admin: User = Depends(get_admin_user)
):
    collection = db.stories if content_type == "story" else db.narrations
    
    result = await collection.update_one(
        {"id": content_id},
        {"$set": {"status": "rejected", "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Log review
    review = ContentReview(
        content_id=content_id,
        content_type=content_type,
        status="rejected",
        reviewer_id=admin.id,
        feedback=feedback
    )
    await db.content_reviews.insert_one(review.dict())
    
    return {"message": f"{content_type.title()} rejected successfully"}

@api_router.get("/admin/users")
async def get_all_users(admin: User = Depends(get_admin_user)):
    users = await db.users.find({}, {"password": 0, "mfa_secret": 0}).to_list(1000)
    return users

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(get_admin_user)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clean up user data
    await db.progress.delete_many({"user_id": user_id})
    await db.stories.delete_many({"creator_id": user_id})
    await db.narrations.delete_many({"narrator_id": user_id})
    
    return {"message": "User deleted successfully"}

# Mock stories for development
@api_router.post("/mock-stories")
async def create_mock_stories():
    mock_stories = [
        {
            "id": str(uuid.uuid4()),
            "title": "The Brave Sparrow",
            "text": "Once upon a time, in a beautiful garden, there lived a brave sparrow named Pip. Pip was brave, very brave indeed. Every morning, the brave sparrow would fly high in the sky. The sparrow loved to fly, fly, fly above the trees. One day, Pip saw a little cat stuck in a tree. The brave sparrow decided to help. Pip flew down to help the cat. The sparrow was so brave! With courage, the brave sparrow guided the cat to safety. From that day, everyone knew Pip was the bravest sparrow in the garden.",
            "language": "en",
            "age_group": "4-6",
            "vocabulary": ["brave", "sparrow", "fly", "courage", "garden"],
            "quizzes": [
                {"type": "true_false", "question": "Pip was a brave sparrow?", "answer": True},
                {"type": "multiple_choice", "question": "What did Pip love to do?", "options": ["swim", "fly", "run"], "answer": "fly"},
                {"type": "fill_blank", "question": "Pip was a very _____ sparrow.", "answer": "brave"}
            ],
            "creator_id": "system",
            "status": "published",
            "tprs_score": 1.0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "The Magic Tree",
            "text": "In an enchanted forest, there grew a magic tree. The tree was magic, truly magic! This magic tree could grant wishes. Every child in the village knew about the magic tree. One day, a kind girl named Luna visited the magic tree. She wished for happiness for everyone. The magic tree glowed with golden light. The tree granted her wish! From that day, the magic tree brought joy to all who visited. The magic tree was loved by everyone in the enchanted forest.",
            "language": "en", 
            "age_group": "7-10",
            "vocabulary": ["magic", "enchanted", "wishes", "granted", "golden"],
            "quizzes": [
                {"type": "true_false", "question": "The tree could grant wishes?", "answer": True},
                {"type": "multiple_choice", "question": "What did Luna wish for?", "options": ["money", "happiness", "toys"], "answer": "happiness"},
                {"type": "fill_blank", "question": "The tree was _____ and could grant wishes.", "answer": "magic"}
            ],
            "creator_id": "system",
            "status": "published",
            "tprs_score": 1.0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "الطائر الشجاع",
            "text": "في يوم من الأيام، في حديقة جميلة، عاش طائر شجاع يدعى نقيق. كان نقيق شجاعاً، شجاعاً جداً. كل صباح، كان الطائر الشجاع يطير عالياً في السماء. أحب الطائر أن يطير، يطير، يطير فوق الأشجار. في يوم من الأيام، رأى نقيق قطة صغيرة عالقة في شجرة. قرر الطائر الشجاع أن يساعد. طار نقيق لمساعدة القطة. كان الطائر شجاعاً جداً! بشجاعة، ساعد الطائر الشجاع القطة للوصول إلى الأمان. من ذلك اليوم، عرف الجميع أن نقيق هو أشجع طائر في الحديقة.",
            "language": "ar",
            "age_group": "4-6",
            "vocabulary": ["شجاع", "طائر", "يطير", "شجاعة", "حديقة"],
            "quizzes": [
                {"type": "true_false", "question": "هل كان نقيق طائراً شجاعاً؟", "answer": True},
                {"type": "multiple_choice", "question": "ماذا أحب نقيق أن يفعل؟", "options": ["يسبح", "يطير", "يجري"], "answer": "يطير"},
                {"type": "fill_blank", "question": "كان نقيق طائراً _____ جداً.", "answer": "شجاع"}
            ],
            "creator_id": "system",
            "status": "published",
            "tprs_score": 1.0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    for story in mock_stories:
        await db.stories.insert_one(story)
    
    return {"message": f"Created {len(mock_stories)} mock stories"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()