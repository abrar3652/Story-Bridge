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
import requests
import json

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
    status: str = "pending"  # draft, pending, published, rejected
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

class MFASetupRequest(BaseModel):
    password: str

class MFAToggleRequest(BaseModel):
    enabled: bool
    password: str
    totp_code: Optional[str] = None

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
def validate_tprs_compliance(text: str, vocabulary: List[str], min_repetitions: int = 3) -> Dict[str, Any]:
    """Validate TPRS compliance: 80% known vocab, 3+ repetitions (configurable)"""
    words = re.findall(r'\w+', text.lower())
    total_words = len(words)
    
    if total_words == 0:
        return {"valid": False, "reason": "No words found"}
    
    # Check vocabulary repetitions
    vocab_counts = {}
    for word in vocabulary:
        vocab_counts[word.lower()] = words.count(word.lower())
    
    # Check if new vocab words appear min_repetitions+ times
    insufficient_reps = [word for word, count in vocab_counts.items() if count < min_repetitions]
    if insufficient_reps:
        return {
            "valid": False, 
            "reason": f"Vocabulary words need {min_repetitions}+ repetitions: {insufficient_reps}"
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

# Enhanced MFA routes for admin dashboard
@api_router.post("/auth/mfa-toggle")
async def toggle_mfa(mfa_request: MFAToggleRequest, current_user: User = Depends(get_current_user)):
    """Toggle MFA for admin users"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="MFA is only available for admin users")
    
    # Verify current password
    db_user = await db.users.find_one({"id": current_user.id})
    if not verify_password(mfa_request.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    if mfa_request.enabled:
        # Enable MFA
        if not current_user.mfa_secret:
            # Generate new secret if not exists
            secret = generate_mfa_secret()
            await db.users.update_one(
                {"id": current_user.id}, 
                {"$set": {"mfa_secret": secret}}
            )
            current_user.mfa_secret = secret
            
        # Verify TOTP code before enabling
        if not mfa_request.totp_code or not verify_mfa_code(current_user.mfa_secret, mfa_request.totp_code):
            raise HTTPException(status_code=400, detail="Invalid TOTP code")
            
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"mfa_enabled": True}}
        )
        
        return {"message": "MFA enabled successfully", "enabled": True}
    else:
        # Disable MFA
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"mfa_enabled": False}}
        )
        
        return {"message": "MFA disabled successfully", "enabled": False}

@api_router.get("/auth/mfa-qr")
async def get_mfa_qr(current_user: User = Depends(get_current_user)):
    """Get MFA QR code for setup"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="MFA is only available for admin users")
    
    # Generate secret if not exists
    if not current_user.mfa_secret:
        secret = generate_mfa_secret()
        await db.users.update_one(
            {"id": current_user.id}, 
            {"$set": {"mfa_secret": secret}}
        )
    else:
        secret = current_user.mfa_secret
    
    qr_code = generate_qr_code(current_user.email, secret)
    
    return {"qr_code": qr_code, "secret": secret, "enabled": current_user.mfa_enabled}

# Admin login route (separate from regular login)
@api_router.post("/auth/admin-login", response_model=Token)
async def admin_login(user: UserLogin):
    """Separate admin login endpoint with MFA support"""
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user_obj = User(**db_user)
    
    # Only allow admin users
    if user_obj.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied - Admin only")
    
    # Check MFA if enabled
    if user_obj.mfa_enabled:
        if not user.mfa_code:
            return {"access_token": "", "token_type": "bearer", "user": user_obj, "mfa_required": True}
        
        if not verify_mfa_code(user_obj.mfa_secret, user.mfa_code):
            raise HTTPException(status_code=401, detail="Invalid MFA code")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

# Story routes
@api_router.post("/stories", response_model=Story)
async def create_story(
    title: str = Form(...),
    text: str = Form(...),
    language: str = Form(...),
    age_group: str = Form(...),
    vocabulary: str = Form(...),  # JSON string
    quizzes: str = Form(...),     # JSON string
    images: List[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["creator", "admin"]:
        raise HTTPException(status_code=403, detail="Only creators can create stories")
    
    # Parse JSON fields
    try:
        vocabulary_list = json.loads(vocabulary) if vocabulary else []
        quizzes_list = json.loads(quizzes) if quizzes else []
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in vocabulary or quizzes field")
    
    # Validate TPRS compliance
    tprs_validation = validate_tprs_compliance(text, vocabulary_list)
    if not tprs_validation["valid"]:
        raise HTTPException(status_code=400, detail=f"TPRS validation failed: {tprs_validation['reason']}")
    
    # Handle SVG image uploads
    image_ids = []
    if images:
        if len(images) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 images allowed")
        
        for image in images:
            if not image.content_type.startswith('image/svg'):
                raise HTTPException(status_code=400, detail="Only SVG images are allowed")
            
            # Check file size (500KB limit)
            content = await image.read()
            if len(content) > 500 * 1024:
                raise HTTPException(status_code=400, detail="Image size must be less than 500KB")
            
            # Upload to GridFS
            image_id = await fs.upload_from_stream(
                f"story_image_{uuid.uuid4()}.svg",
                io.BytesIO(content),
                metadata={"content_type": image.content_type, "creator_id": current_user.id}
            )
            image_ids.append(str(image_id))
    
    # Create story object
    story_data = {
        "title": title,
        "text": text,
        "language": language,
        "age_group": age_group,
        "vocabulary": vocabulary_list,
        "quizzes": quizzes_list,
        "images": image_ids,
        "creator_id": current_user.id
    }
    
    story_obj = Story(**story_data)
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

@api_router.patch("/stories/{story_id}/submit")
async def submit_story_for_review(story_id: str, current_user: User = Depends(get_current_user)):
    """Allow creators to submit their draft stories for review"""
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check permissions
    if current_user.role != "admin" and story["creator_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only submit your own stories")
    
    # Only allow submission if draft
    if story["status"] != "draft":
        raise HTTPException(status_code=400, detail="Can only submit draft stories")
    
    # Update status to pending
    await db.stories.update_one(
        {"id": story_id}, 
        {"$set": {"status": "pending", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Story submitted for review"}

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

# SVG image serving
@api_router.get("/images/{image_id}")
async def get_image(image_id: str):
    try:
        # Convert string ID back to ObjectId for GridFS
        from bson import ObjectId
        grid_out = await fs.open_download_stream(ObjectId(image_id))
        
        image_data = await grid_out.read()
        
        return Response(
            content=image_data,
            media_type="image/svg+xml",
            headers={"Content-Disposition": f"inline; filename=image_{image_id}.svg"}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="Image not found")

# Narration routes
@api_router.post("/narrations")
async def create_narration(
    story_id: str = Form(...),
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["narrator", "admin"]:
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
        # Validate audio file
        if not audio.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be audio format")
        
        # Check file size (5MB limit)
        content = await audio.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Upload to GridFS
        audio_id = await fs.upload_from_stream(
            f"narration_{uuid.uuid4()}.{audio.filename.split('.')[-1]}",
            io.BytesIO(content),
            metadata={"content_type": audio.content_type, "narrator_id": current_user.id}
        )
        narration_data["audio_id"] = str(audio_id)
        
        # Link audio to story
        await db.stories.update_one(
            {"id": story_id},
            {"$set": {"audio_id": str(audio_id)}}
        )
    
    narration_obj = Narration(**narration_data)
    await db.narrations.insert_one(narration_obj.dict())
    
    return {"message": "Narration created successfully", "narration": narration_obj}

@api_router.get("/narrations/narrator")
async def get_narrator_narrations(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["narrator", "admin"]:
        raise HTTPException(status_code=403, detail="Only narrators can access this")
    
    filter_dict = {"narrator_id": current_user.id} if current_user.role == "narrator" else {}
    narrations = await db.narrations.find(filter_dict).to_list(100)
    return [Narration(**narration) for narration in narrations]

@api_router.put("/narrations/{narration_id}")
async def update_narration(
    narration_id: str, 
    story_id: str = Form(...),
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    narration = await db.narrations.find_one({"id": narration_id})
    if not narration:
        raise HTTPException(status_code=404, detail="Narration not found")
    
    # Check permissions
    if current_user.role != "admin" and narration["narrator_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own narrations")
    
    update_data = {"text": text, "updated_at": datetime.now(timezone.utc)}
    
    if audio:
        # Handle new audio upload
        if not audio.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be audio format")
        
        content = await audio.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Delete old audio if exists
        if narration.get("audio_id"):
            try:
                from bson import ObjectId
                await fs.delete(ObjectId(narration["audio_id"]))
            except:
                pass
        
        # Upload new audio
        audio_id = await fs.upload_from_stream(
            f"narration_{uuid.uuid4()}.{audio.filename.split('.')[-1]}",
            io.BytesIO(content),
            metadata={"content_type": audio.content_type, "narrator_id": current_user.id}
        )
        update_data["audio_id"] = str(audio_id)
    
    await db.narrations.update_one({"id": narration_id}, {"$set": update_data})
    
    updated_narration = await db.narrations.find_one({"id": narration_id})
    return Narration(**updated_narration)

@api_router.delete("/narrations/{narration_id}")
async def delete_narration(narration_id: str, current_user: User = Depends(get_current_user)):
    narration = await db.narrations.find_one({"id": narration_id})
    if not narration:
        raise HTTPException(status_code=404, detail="Narration not found")
    
    # Check permissions
    if current_user.role != "admin" and narration["narrator_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own narrations")
    
    # Delete audio file if exists
    if narration.get("audio_id"):
        try:
            from bson import ObjectId
            await fs.delete(ObjectId(narration["audio_id"]))
        except:
            pass
    
    await db.narrations.delete_one({"id": narration_id})
    return {"message": "Narration deleted successfully"}

@api_router.patch("/narrations/{narration_id}/status")
async def update_narration_status(
    narration_id: str, 
    status: str, 
    notes: Optional[str] = None, 
    admin_user: User = Depends(get_admin_user)
):
    valid_statuses = ["draft", "pending", "published", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
    
    update_data = {"status": status, "updated_at": datetime.now(timezone.utc)}
    
    result = await db.narrations.update_one({"id": narration_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Narration not found")
    
    # Create review record
    review = ContentReview(
        content_type="narration",
        content_id=narration_id,
        reviewer_id=admin_user.id,
        status="approved" if status == "published" else "rejected",
        notes=notes
    )
    await db.content_reviews.insert_one(review.dict())
    
    return {"message": f"Narration status updated to {status}"}

# Progress and Badge routes
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
    
    # Check for badge eligibility
    await check_badge_eligibility(current_user.id, progress)
    
    return {"message": "Progress synced successfully"}

@api_router.get("/progress/user")
async def get_user_progress(current_user: User = Depends(get_current_user)):
    progress_list = await db.progress.find({"user_id": current_user.id}).to_list(100)
    return [Progress(**progress) for progress in progress_list]

async def check_badge_eligibility(user_id: str, progress: Progress):
    """Check and award badges based on progress"""
    # Get existing badges
    existing_badges = await db.badges.find({"user_id": user_id}).to_list(100)
    badge_types = [badge["badge_type"] for badge in existing_badges]
    
    # Story Starter: Complete 1 story
    if "story_starter" not in badge_types and progress.completed:
        badge = Badge(
            user_id=user_id,
            badge_type="story_starter",
            metadata={"story_id": progress.story_id}
        )
        await db.badges.insert_one(badge.dict())
    
    # Word Wizard: Learn 10 vocabulary words
    total_vocab = await db.progress.aggregate([
        {"$match": {"user_id": user_id}},
        {"$unwind": "$vocabulary_learned"},
        {"$match": {"vocabulary_learned.learned": True}},
        {"$count": "total"}
    ]).to_list(1)
    
    if "word_wizard" not in badge_types and total_vocab and total_vocab[0]["total"] >= 10:
        badge = Badge(
            user_id=user_id,
            badge_type="word_wizard",
            metadata={"vocab_count": total_vocab[0]["total"]}
        )
        await db.badges.insert_one(badge.dict())
    
    # Quiz Master: Pass 5 quizzes
    total_quizzes = await db.progress.aggregate([
        {"$match": {"user_id": user_id}},
        {"$unwind": "$quiz_results"},
        {"$match": {"quiz_results.correct": True}},
        {"$count": "total"}
    ]).to_list(1)
    
    if "quiz_master" not in badge_types and total_quizzes and total_quizzes[0]["total"] >= 5:
        badge = Badge(
            user_id=user_id,
            badge_type="quiz_master",
            metadata={"quiz_count": total_quizzes[0]["total"]}
        )
        await db.badges.insert_one(badge.dict())

@api_router.get("/badges/user")
async def get_user_badges(current_user: User = Depends(get_current_user)):
    badges = await db.badges.find({"user_id": current_user.id}).to_list(100)
    return [Badge(**badge) for badge in badges]

# Analytics routes
@api_router.get("/analytics/ngo")
async def get_ngo_analytics(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["end_user", "admin"]:  # Teachers (end_user) and admins can access
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate metrics
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    # Active users (unique users with progress in last week)
    active_users_pipeline = [
        {"$match": {"updated_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "active_users"}
    ]
    active_users_result = await db.progress.aggregate(active_users_pipeline).to_list(1)
    active_users = active_users_result[0]["active_users"] if active_users_result else 0
    
    # Stories completed
    completed_stories_pipeline = [
        {"$match": {"completed": True, "updated_at": {"$gte": week_ago}}},
        {"$count": "completed_stories"}
    ]
    completed_result = await db.progress.aggregate(completed_stories_pipeline).to_list(1)
    stories_completed = completed_result[0]["completed_stories"] if completed_result else 0
    
    # Average session time
    avg_time_pipeline = [
        {"$match": {"updated_at": {"$gte": week_ago}, "time_spent": {"$gt": 0}}},
        {"$group": {"_id": None, "avg_time": {"$avg": "$time_spent"}}}
    ]
    avg_time_result = await db.progress.aggregate(avg_time_pipeline).to_list(1)
    avg_session_time = avg_time_result[0]["avg_time"] if avg_time_result else 0
    
    # Vocabulary retention rate
    vocab_pipeline = [
        {"$match": {"updated_at": {"$gte": week_ago}}},
        {"$unwind": "$vocabulary_learned"},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "learned": {"$sum": {"$cond": [{"$eq": ["$vocabulary_learned.learned", True]}, 1, 0]}}
        }}
    ]
    vocab_result = await db.progress.aggregate(vocab_pipeline).to_list(1)
    vocab_retention = 0
    if vocab_result and vocab_result[0]["total"] > 0:
        vocab_retention = (vocab_result[0]["learned"] / vocab_result[0]["total"]) * 100
    
    # Quiz success rate  
    quiz_pipeline = [
        {"$match": {"updated_at": {"$gte": week_ago}}},
        {"$unwind": "$quiz_results"},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "correct": {"$sum": {"$cond": [{"$eq": ["$quiz_results.correct", True]}, 1, 0]}}
        }}
    ]
    quiz_result = await db.progress.aggregate(quiz_pipeline).to_list(1)
    quiz_success_rate = 0
    total_quiz_attempts = 0
    if quiz_result:
        total_quiz_attempts = quiz_result[0]["total"]
        if total_quiz_attempts > 0:
            quiz_success_rate = (quiz_result[0]["correct"] / total_quiz_attempts) * 100
    
    analytics = Analytics(
        period="weekly",
        active_users=active_users,
        stories_completed=stories_completed,
        avg_session_time=round(avg_session_time / 60, 2),  # Convert to minutes
        vocabulary_retention_rate=round(vocab_retention, 2),
        total_quiz_attempts=total_quiz_attempts,
        quiz_success_rate=round(quiz_success_rate, 2)
    )
    
    # Save analytics record
    await db.analytics.insert_one(analytics.dict())
    
    return analytics

@api_router.get("/analytics/export")
async def export_analytics_csv(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["end_user", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get recent analytics records
    analytics_records = await db.analytics.find().sort("generated_at", -1).limit(30).to_list(30)
    
    if not analytics_records:
        raise HTTPException(status_code=404, detail="No analytics data available")
    
    # Convert to CSV format
    import csv
    import io
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        'date', 'period', 'active_users', 'stories_completed', 
        'avg_session_time_minutes', 'vocabulary_retention_rate', 
        'total_quiz_attempts', 'quiz_success_rate'
    ])
    
    writer.writeheader()
    for record in analytics_records:
        writer.writerow({
            'date': record['generated_at'].strftime('%Y-%m-%d'),
            'period': record['period'],
            'active_users': record['active_users'],
            'stories_completed': record['stories_completed'],
            'avg_session_time_minutes': record['avg_session_time'],
            'vocabulary_retention_rate': record['vocabulary_retention_rate'],
            'total_quiz_attempts': record['total_quiz_attempts'],
            'quiz_success_rate': record['quiz_success_rate']
        })
    
    csv_content = output.getvalue()
    output.close()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=storybridge_analytics.csv"}
    )

# Admin routes
@api_router.get("/admin/pending")
async def get_pending_content(admin_user: User = Depends(get_admin_user)):
    pending_stories = await db.stories.find({"status": "pending"}).to_list(100)
    pending_narrations = await db.narrations.find({"status": "pending"}).to_list(100)
    
    return {
        "stories": [Story(**story) for story in pending_stories],
        "narrations": [Narration(**narration) for narration in pending_narrations]
    }

@api_router.patch("/admin/content/{content_type}/{content_id}/approve")
async def approve_content(
    content_type: str, 
    content_id: str, 
    notes: Optional[str] = None,
    admin_user: User = Depends(get_admin_user)
):
    if content_type not in ["story", "narration"]:
        raise HTTPException(status_code=400, detail="Content type must be 'story' or 'narration'")
    
    collection = db.stories if content_type == "story" else db.narrations
    
    result = await collection.update_one(
        {"id": content_id},
        {"$set": {"status": "published", "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"{content_type.title()} not found")
    
    # Create review record
    review = ContentReview(
        content_type=content_type,
        content_id=content_id,
        reviewer_id=admin_user.id,
        status="approved",
        notes=notes
    )
    await db.content_reviews.insert_one(review.dict())
    
    return {"message": f"{content_type.title()} approved successfully"}

@api_router.patch("/admin/content/{content_type}/{content_id}/reject")
async def reject_content(
    content_type: str, 
    content_id: str, 
    notes: str,
    admin_user: User = Depends(get_admin_user)
):
    if content_type not in ["story", "narration"]:
        raise HTTPException(status_code=400, detail="Content type must be 'story' or 'narration'")
    
    collection = db.stories if content_type == "story" else db.narrations
    
    result = await collection.update_one(
        {"id": content_id},
        {"$set": {
            "status": "rejected", 
            "review_notes": notes,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"{content_type.title()} not found")
    
    # Create review record
    review = ContentReview(
        content_type=content_type,
        content_id=content_id,
        reviewer_id=admin_user.id,
        status="rejected",
        notes=notes
    )
    await db.content_reviews.insert_one(review.dict())
    
    return {"message": f"{content_type.title()} rejected"}

@api_router.get("/admin/users")
async def get_all_users(admin_user: User = Depends(get_admin_user)):
    users = await db.users.find({}, {"password": 0, "mfa_secret": 0}).to_list(100)
    return [User(**user) for user in users]

# Admin creation endpoint (for initial setup only)
@api_router.post("/auth/create-initial-admin")
async def create_initial_admin():
    """Create initial admin user for system setup"""
    try:
        # Check if admin already exists
        existing_admin = await db.users.find_one({"role": "admin"})
        if existing_admin:
            raise HTTPException(status_code=400, detail="Admin user already exists")
        
        # Create admin user
        admin_data = {
            "id": str(uuid.uuid4()),
            "email": "admin@storybridge.com",
            "password": get_password_hash("admin123"),
            "role": "admin",
            "language": "en",
            "mfa_enabled": False,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.insert_one(admin_data)
        
        return {"message": "Initial admin user created successfully", "email": "admin@storybridge.com"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating admin: {str(e)}")

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin_user: User = Depends(get_admin_user)):
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clean up user data
    await db.progress.delete_many({"user_id": user_id})
    await db.badges.delete_many({"user_id": user_id})
    await db.stories.delete_many({"creator_id": user_id})
    await db.narrations.delete_many({"narrator_id": user_id})
    
    return {"message": "User deleted successfully"}

# Mock stories for development
@api_router.post("/mock-stories")
async def create_mock_stories():
    """Create comprehensive mock stories for testing - 10 stories total"""
    
    # Mock stories data with enhanced content
    mock_stories_data = [
        # Ages 4-6 Stories (5 stories)
        {
            "title": "The Brave Little Sparrow",
            "text": "Once upon a time, there lived a brave little sparrow named Sam. Sam was brave when he helped his friends. Every day, Sam would fly with his brave wings. The other birds loved Sam because he was so brave. Sam's brave heart made him special. When danger came, Sam was brave and protected everyone. Sam's brave spirit inspired all the forest animals. The brave little sparrow Sam became a hero. Everyone remembered how brave Sam was. Sam's brave actions saved the day. The brave sparrow Sam was loved by all.",
            "language": "en",
            "age_group": "4-6",
            "vocabulary": ["brave", "sparrow", "fly"],
            "quizzes": [
                {"type": "true_false", "question": "Sam was a brave sparrow?", "answer": True},
                {"type": "multiple_choice", "question": "What could Sam do?", "options": ["fly", "swim", "run"], "answer": "fly"},
                {"type": "fill_blank", "question": "Sam was a ____ little sparrow", "answer": "brave"}
            ],
            "status": "pending"
        },
        {
            "title": "العصفور الصغير الشجاع",
            "text": "كان يا ما كان، عصفور صغير شجاع اسمه سام. سام كان شجاع عندما ساعد أصدقاءه. كل يوم، سام كان يطير بجناحيه الشجاع. الطيور الأخرى أحبت سام لأنه كان شجاع جداً. قلب سام الشجاع جعله مميزاً. عندما جاء الخطر، سام كان شجاع وحمى الجميع. روح سام الشجاع ألهمت كل حيوانات الغابة. العصفور الصغير الشجاع سام أصبح بطلاً. الجميع تذكر كم كان سام شجاع. أعمال سام الشجاع أنقذت اليوم.",
            "language": "ar",
            "age_group": "4-6",
            "vocabulary": ["شجاع", "عصفور", "يطير"],
            "quizzes": [
                {"type": "true_false", "question": "سام كان عصفور شجاع؟", "answer": True},
                {"type": "multiple_choice", "question": "ماذا يستطيع سام أن يفعل؟", "options": ["يطير", "يسبح", "يجري"], "answer": "يطير"}
            ],
            "status": "pending"
        },
        {
            "title": "The Magic Garden",
            "text": "In a magic garden, flowers could talk and dance. The magic garden had magic flowers everywhere. Every magic flower in the garden could sing beautiful songs. Children loved visiting the magic garden to see the magic flowers. The magic garden's magic flowers bloomed in rainbow colors. When the sun shone, the magic flowers in the magic garden sparkled. The magic garden was home to many magic creatures. Everyone who visited the magic garden felt happy because of the magic flowers. The magic garden's magic lasted forever.",
            "language": "en", 
            "age_group": "4-6",
            "vocabulary": ["magic", "garden", "flowers"],
            "quizzes": [
                {"type": "true_false", "question": "The flowers in the garden could talk?", "answer": True},
                {"type": "fill_blank", "question": "The ____ garden had talking flowers", "answer": "magic"}
            ],
            "status": "pending"
        },
        {
            "title": "القط الذكي",
            "text": "كان هناك قط ذكي يحب اللعب. القط الذكي كان يحل المشاكل بطريقة ذكي. كل يوم، القط الذكي يتعلم شيئاً جديداً. الأطفال أحبوا القط الذكي لأنه كان ذكي جداً. القط الذكي علم الأطفال أن يكونوا ذكي مثله. عندما كانت هناك مشكلة، القط الذكي يجد الحل بطريقة ذكي. القط الذكي أصبح مشهوراً في الحي. الجميع عرف أن القط ذكي ومفيد.",
            "language": "ar",
            "age_group": "4-6", 
            "vocabulary": ["ذكي", "قط", "يتعلم"],
            "quizzes": [
                {"type": "true_false", "question": "القط كان ذكي؟", "answer": True},
                {"type": "fill_blank", "question": "القط ____ يحب التعلم", "answer": "ذكي"}
            ],
            "status": "pending"
        },
        {
            "title": "The Dancing Rainbow",
            "text": "High in the sky, a rainbow loved to dance. The rainbow would dance across the sky every day. When the rainbow dance, all the children below would smile. The dancing rainbow had seven beautiful colors that dance together. The rainbow's dance made everyone happy who watched it dance. During rain, the rainbow would dance even more beautifully. The dancing rainbow became famous for its magical dance. Everyone waited to see the rainbow dance after every storm. The rainbow's dance brought joy to the world.",
            "language": "en",
            "age_group": "4-6",
            "vocabulary": ["rainbow", "dance", "colors"], 
            "quizzes": [
                {"type": "true_false", "question": "The rainbow loved to dance?", "answer": True},
                {"type": "multiple_choice", "question": "How many colors did the rainbow have?", "options": ["five", "six", "seven"], "answer": "seven"}
            ],
            "status": "pending"
        },
        
        # Ages 7-10 Stories (5 stories)  
        {
            "title": "The Adventure of the Crystal Cave",
            "text": "Maya discovered an adventure waiting in the mysterious crystal cave. The adventure began when Maya found the sparkling entrance. Inside the crystal cave, Maya's adventure became more exciting with each step. The crystal formations created a magical adventure for Maya to explore. Every corner of the crystal cave held a new adventure. Maya's adventure in the crystal cave taught her about courage and friendship. The crystal cave's adventure challenged Maya to solve ancient puzzles. Through her adventure, Maya learned that the crystal cave was protecting the forest. Maya's adventure in the crystal cave became a legend that inspired other young explorers.",
            "language": "en",
            "age_group": "7-10",
            "vocabulary": ["adventure", "crystal", "cave"],
            "quizzes": [
                {"type": "true_false", "question": "Maya found a crystal cave?", "answer": True},
                {"type": "multiple_choice", "question": "What did Maya's adventure teach her?", "options": ["cooking", "courage and friendship", "swimming"], "answer": "courage and friendship"},
                {"type": "fill_blank", "question": "Maya discovered an ____ in the crystal cave", "answer": "adventure"}
            ],
            "status": "pending"
        },
        {
            "title": "مغامرة الكهف الكريستالي",
            "text": "اكتشفت مايا مغامرة تنتظرها في كهف كريستالي غامض. المغامرة بدأت عندما وجدت مايا المدخل اللامع. داخل الكهف الكريستالي، مغامرة مايا أصبحت أكثر إثارة مع كل خطوة. التكوينات الكريستالية خلقت مغامرة سحرية لمايا لاستكشافها. كل زاوية في الكهف الكريستالي احتوت على مغامرة جديدة. مغامرة مايا في الكهف الكريستالي علمتها عن الشجاعة والصداقة. مغامرة الكهف الكريستالي تحدت مايا لحل الألغاز القديمة. من خلال مغامرتها، تعلمت مايا أن الكهف الكريستالي كان يحمي الغابة.",
            "language": "ar",
            "age_group": "7-10",
            "vocabulary": ["مغامرة", "كريستالي", "كهف"],
            "quizzes": [
                {"type": "true_false", "question": "مايا وجدت كهف كريستالي؟", "answer": True},
                {"type": "fill_blank", "question": "اكتشفت مايا ____ في الكهف", "answer": "مغامرة"}
            ],
            "status": "pending"
        },
        {
            "title": "The Time-Traveling Bicycle",
            "text": "Alex inherited a mysterious bicycle that could travel through time. The bicycle looked ordinary, but it had the power to travel to any era. When Alex rode the bicycle, he would travel back to ancient civilizations. The time-traveling bicycle took Alex on incredible journeys through history. Each bicycle ride became a new time-travel adventure. Alex learned that the bicycle belonged to his grandfather, who was also a time traveler. The bicycle taught Alex important lessons about history and responsibility. Through bicycle adventures, Alex discovered that small actions could change the course of history.",
            "language": "en",
            "age_group": "7-10", 
            "vocabulary": ["bicycle", "travel", "time"],
            "quizzes": [
                {"type": "true_false", "question": "Alex's bicycle could travel through time?", "answer": True},
                {"type": "multiple_choice", "question": "Who did the bicycle belong to before Alex?", "options": ["his father", "his grandfather", "his teacher"], "answer": "his grandfather"}
            ],
            "status": "pending"
        },
        {
            "title": "رحلة إلى القمر",
            "text": "قررت سارة أن تذهب في رحلة إلى القمر مع روبوتها الذكي. الرحلة إلى القمر كانت حلم سارة منذ الطفولة. عندما بدأت الرحلة، سارة شعرت بالإثارة الكبيرة. الرحلة إلى القمر استغرقت ثلاثة أيام في المركبة الفضائية. خلال الرحلة، سارة رأت النجوم والكواكب الجميلة. عندما وصلت سارة إلى القمر، وجدت أن الرحلة كانت تستحق الانتظار. الرحلة إلى القمر علمت سارة عن الشجاعة والاستكشاف. سارة قررت أن تصبح رائدة فضاء بعد هذه الرحلة المذهلة.",
            "language": "ar", 
            "age_group": "7-10",
            "vocabulary": ["رحلة", "قمر", "فضاء"],
            "quizzes": [
                {"type": "true_false", "question": "سارة ذهبت في رحلة إلى القمر؟", "answer": True},
                {"type": "fill_blank", "question": "سارة ذهبت في ____ إلى القمر", "answer": "رحلة"}
            ],
            "status": "pending"
        },
        {
            "title": "The Secret of the Ancient Library",
            "text": "Emma discovered that the old library in her neighborhood held ancient secrets. The library contained books that were hundreds of years old with ancient knowledge. Every book in the ancient library seemed to whisper secrets to Emma. The librarian told Emma that the library was built over an ancient temple. Emma spent hours exploring the ancient sections of the library. She found that ancient civilizations had left messages in the books. The ancient library became Emma's favorite place to learn about history. Emma realized that the library was a guardian of ancient wisdom that needed to be protected.",
            "language": "en",
            "age_group": "7-10",
            "vocabulary": ["library", "ancient", "secrets"], 
            "quizzes": [
                {"type": "true_false", "question": "The library contained ancient books?", "answer": True},
                {"type": "multiple_choice", "question": "What was the library built over?", "options": ["ancient temple", "old house", "modern building"], "answer": "ancient temple"},
                {"type": "fill_blank", "question": "Emma discovered ____ in the old library", "answer": "secrets"}
            ],
            "status": "pending"
        }
    ]
    
    try:
        # Clear existing mock stories to avoid duplicates
        await db.stories.delete_many({"creator_id": "mock_creator"})
        
        # Create mock creator user if doesn't exist
        mock_creator = {
            "id": "mock_creator",
            "email": "creator@storybridge.mock",
            "password": get_password_hash("mock123"),
            "role": "creator",
            "language": "en",
            "mfa_enabled": False,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.update_one(
            {"id": "mock_creator"},
            {"$set": mock_creator},
            upsert=True
        )
        
        # Insert mock stories
        stories_to_insert = []
        for story_data in mock_stories_data:
            story = Story(
                **story_data,
                creator_id="mock_creator",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            stories_to_insert.append(story.dict())
        
        result = await db.stories.insert_many(stories_to_insert)
        
        return {
            "message": f"Successfully created {len(result.inserted_ids)} mock stories",
            "stories_created": len(result.inserted_ids),
            "languages": ["en", "ar"],
            "age_groups": ["4-6", "7-10"],
            "status": "All stories created in 'pending' state for admin approval"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating mock stories: {str(e)}")

# Include router and middleware
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)