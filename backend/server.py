from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str  # "end_user", "creator", "narrator"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    role: str
    language: str = "en"
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
    status: str = "draft"  # draft, pending, published
    audio_id: Optional[str] = None
    images: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

class Progress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    story_id: str
    completed: bool = False
    time_spent: int = 0
    vocabulary_learned: List[str] = []
    quiz_results: List[Dict[str, Any]] = []
    coins_earned: int = 0
    badges_earned: List[str] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Story routes
@api_router.post("/stories", response_model=Story)
async def create_story(story: StoryCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["creator", "narrator"]:
        raise HTTPException(status_code=403, detail="Only creators can create stories")
    
    story_dict = story.dict()
    story_obj = Story(**story_dict, creator_id=current_user.id)
    await db.stories.insert_one(story_obj.dict())
    
    return story_obj

@api_router.get("/stories", response_model=List[Story])
async def get_stories(language: Optional[str] = None, age_group: Optional[str] = None, status: str = "published"):
    filter_dict = {"status": status}
    if language:
        filter_dict["language"] = language
    if age_group:
        filter_dict["age_group"] = age_group
    
    stories = await db.stories.find(filter_dict).to_list(100)
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
    
    update_data = story_update.dict()
    await db.stories.update_one({"id": story_id}, {"$set": update_data})
    
    updated_story = await db.stories.find_one({"id": story_id})
    return Story(**updated_story)

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
        audio_id = await fs.upload_from_stream(
            f"narration_{uuid.uuid4()}.{audio.filename.split('.')[-1]}",
            io.BytesIO(await audio.read()),
            metadata={"content_type": audio.content_type}
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

# Progress routes
@api_router.post("/progress")
async def sync_progress(progress: Progress, current_user: User = Depends(get_current_user)):
    progress_dict = progress.dict()
    progress_dict["user_id"] = current_user.id
    
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
            "created_at": datetime.now(timezone.utc)
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
            "created_at": datetime.now(timezone.utc)
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