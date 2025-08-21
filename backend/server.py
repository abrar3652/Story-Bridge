from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
import pyotp
import qrcode
import io
import base64
import os
import logging
import uuid
import re
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
fs = AsyncIOMotorGridFSBucket(db)

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="StoryBridge API")
api_router = APIRouter(prefix="/api")

# Enhanced Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str  # "end_user", "creator", "narrator", "admin"

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    mfa_code: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    role: str
    language: str = "en"
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProfile(BaseModel):
    email: Optional[str] = None
    language: Optional[str] = None
    avatar_url: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User
    mfa_required: Optional[bool] = False

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    review_notes: Optional[str] = None

class NarrationCreate(BaseModel):
    story_id: str
    text: Optional[str] = None

class Narration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    story_id: str
    narrator_id: str
    audio_id: Optional[str] = None
    text: Optional[str] = None
    status: str = "draft"  # draft, pending, published, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Progress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    story_id: str
    completed: bool = False
    time_spent: int = 0
    vocabulary_learned: List[Dict[str, Any]] = []  # [{word, repetitions, learned}]
    quiz_results: List[Dict[str, Any]] = []
    coins_earned: int = 0
    badges_earned: List[str] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Badge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    badge_type: str  # "story_starter", "word_wizard", "quiz_master"
    earned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = {}

class Analytics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    period: str  # "daily", "weekly", "monthly"
    active_users: int = 0
    stories_completed: int = 0
    avg_session_time: float = 0.0
    vocabulary_retention_rate: float = 0.0
    total_quiz_attempts: int = 0
    quiz_success_rate: float = 0.0
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentReview(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content_type: str  # "story", "narration"
    content_id: str
    reviewer_id: str
    status: str  # "approved", "rejected"
    notes: Optional[str] = None
    reviewed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

def verify_mfa_code(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)

def generate_mfa_secret() -> str:
    return pyotp.random_base32()

def generate_qr_code(email: str, secret: str) -> str:
    provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        email, issuer_name="StoryBridge"
    )
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()

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
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user

# TPRS Validation
def validate_tprs_compliance(text: str, vocabulary: List[str]) -> Dict[str, Any]:
    """Validate TPRS compliance: 80% known vocab, 7+ repetitions"""
    words = re.findall(r'\w+', text.lower())
    total_words = len(words)
    
    if total_words == 0:
        return {"valid": False, "reason": "No words found"}
    
    # Check vocabulary repetitions
    vocab_counts = {}
    for word in vocabulary:
        vocab_counts[word.lower()] = words.count(word.lower())
    
    # Check if new vocab words appear 7+ times
    insufficient_reps = [word for word, count in vocab_counts.items() if count < 7]
    if insufficient_reps:
        return {
            "valid": False, 
            "reason": f"Vocabulary words need 7+ repetitions: {insufficient_reps}"
        }
    
    # For now, assume 80% known vocabulary (would need dictionary lookup in production)
    return {"valid": True, "vocab_repetitions": vocab_counts}

# Auth routes
@api_router.post("/auth/signup", response_model=Token)
async def signup(user: UserCreate):
    # Prevent admin signup through public endpoint
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Admin accounts must be created by existing admins")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop("password")
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
    
    user_obj = User(**db_user)
    
    # Check MFA for admin users
    if user_obj.role == "admin" and user_obj.mfa_enabled:
        if not user.mfa_code:
            return {"access_token": "", "token_type": "bearer", "user": user_obj, "mfa_required": True}
        
        if not verify_mfa_code(user_obj.mfa_secret, user.mfa_code):
            raise HTTPException(status_code=401, detail="Invalid MFA code")
    
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

@api_router.post("/auth/setup-mfa")
async def setup_mfa(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="MFA is only available for admin users")
    
    secret = generate_mfa_secret()
    qr_code = generate_qr_code(current_user.email, secret)
    
    # Save secret temporarily (will be confirmed when user verifies)
    await db.users.update_one(
        {"id": current_user.id}, 
        {"$set": {"mfa_secret": secret}}
    )
    
    return {"qr_code": qr_code, "secret": secret}

@api_router.post("/auth/verify-mfa")
async def verify_mfa(code: str, current_user: User = Depends(get_current_user)):
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA not set up")
    
    if verify_mfa_code(current_user.mfa_secret, code):
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"mfa_enabled": True}}
        )
        return {"message": "MFA enabled successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid MFA code")

# Story routes
@api_router.post("/stories", response_model=Story)
async def create_story(story: StoryCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["creator", "admin"]:
        raise HTTPException(status_code=403, detail="Only creators can create stories")
    
    # Validate TPRS compliance
    tprs_validation = validate_tprs_compliance(story.text, story.vocabulary)
    if not tprs_validation["valid"]:
        raise HTTPException(status_code=400, detail=f"TPRS validation failed: {tprs_validation['reason']}")
    
    story_dict = story.dict()
    story_obj = Story(**story_dict, creator_id=current_user.id)
    await db.stories.insert_one(story_obj.dict())
    
    return story_obj

@api_router.get("/stories", response_model=List[Story])
async def get_stories(
    language: Optional[str] = None, 
    age_group: Optional[str] = None, 
    status: str = "published",
    current_user: Optional[User] = Depends(get_current_user)
):
    filter_dict = {}
    
    # Regular users only see published stories
    if not current_user or current_user.role == "end_user":
        filter_dict["status"] = "published"
    else:
        # Creators/narrators/admins can specify status
        filter_dict["status"] = status
    
    if language:
        filter_dict["language"] = language
    if age_group:
        filter_dict["age_group"] = age_group
    
    stories = await db.stories.find(filter_dict).to_list(100)
    return [Story(**story) for story in stories]

@api_router.get("/stories/creator", response_model=List[Story])
async def get_creator_stories(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["creator", "admin"]:
        raise HTTPException(status_code=403, detail="Only creators can access this")
    
    filter_dict = {"creator_id": current_user.id} if current_user.role == "creator" else {}
    stories = await db.stories.find(filter_dict).to_list(100)
    return [Story(**story) for story in stories]

@api_router.put("/stories/{story_id}", response_model=Story)
async def update_story(story_id: str, story_update: StoryCreate, current_user: User = Depends(get_current_user)):
    # Find story
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check permissions
    if current_user.role != "admin" and story["creator_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own stories")
    
    # Only allow editing if draft or rejected
    if story["status"] not in ["draft", "rejected"]:
        raise HTTPException(status_code=400, detail="Can only edit draft or rejected stories")
    
    # Validate TPRS compliance
    tprs_validation = validate_tprs_compliance(story_update.text, story_update.vocabulary)
    if not tprs_validation["valid"]:
        raise HTTPException(status_code=400, detail=f"TPRS validation failed: {tprs_validation['reason']}")
    
    update_data = story_update.dict()
    update_data["updated_at"] = datetime.now(timezone.utc)
    update_data["status"] = "draft"  # Reset to draft after editing
    
    await db.stories.update_one({"id": story_id}, {"$set": update_data})
    
    updated_story = await db.stories.find_one({"id": story_id})
    return Story(**updated_story)

@api_router.delete("/stories/{story_id}")
async def delete_story(story_id: str, current_user: User = Depends(get_current_user)):
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check permissions
    if current_user.role != "admin" and story["creator_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own stories")
    
    # Only allow deletion if draft
    if story["status"] != "draft":
        raise HTTPException(status_code=400, detail="Can only delete draft stories")
    
    await db.stories.delete_one({"id": story_id})
    return {"message": "Story deleted successfully"}

@api_router.patch("/stories/{story_id}/status")
async def update_story_status(story_id: str, status: str, notes: Optional[str] = None, admin_user: User = Depends(get_admin_user)):
    valid_statuses = ["draft", "pending", "published", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
    
    update_data = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if notes:
        update_data["review_notes"] = notes
    
    result = await db.stories.update_one({"id": story_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Create review record
    review = ContentReview(
        content_type="story",
        content_id=story_id,
        reviewer_id=admin_user.id,
        status="approved" if status == "published" else "rejected",
        notes=notes
    )
    await db.content_reviews.insert_one(review.dict())
    
    return {"message": f"Story status updated to {status}"}

# Audio file serving
@api_router.get("/audio/{audio_id}")
async def get_audio(audio_id: str):
    try:
        # Convert string ID back to ObjectId for GridFS
        from bson import ObjectId
        grid_out = await fs.open_download_stream(ObjectId(audio_id))
        
        audio_data = await grid_out.read()
        
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={"Content-Disposition": f"inline; filename=audio_{audio_id}.mp3"}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="Audio not found")

# Continue with remaining endpoints...