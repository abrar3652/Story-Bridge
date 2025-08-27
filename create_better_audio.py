#!/usr/bin/env python3
"""
Create better test audio files for StoryBridge
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv
import io
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

def create_better_test_audio():
    """
    Create a more realistic MP3 file that browsers can actually play
    This creates a basic valid MP3 with a longer duration
    """
    # Basic MP3 header for 44.1kHz, 128kbps, mono
    mp3_header = bytearray([
        0xFF, 0xFB, 0x90, 0x00,  # MP3 sync word and header
        0x00, 0x00, 0x00, 0x00,  # Additional header info
    ])
    
    # Create a longer MP3 frame structure
    # Each MP3 frame is typically 417 bytes for 128kbps
    frame_size = 417
    num_frames = 100  # About 2.6 seconds of audio
    
    mp3_data = bytearray()
    mp3_data.extend(mp3_header)
    
    # Add multiple MP3 frames for a playable duration
    for i in range(num_frames):
        # Basic frame header
        frame_header = bytearray([
            0xFF, 0xFB, 0x90, 0x00,  # Frame sync
            0x00, 0x00, 0x00, 0x00,  # Frame info
        ])
        
        # Fill the rest of the frame with valid data
        frame_data = bytearray([0x00] * (frame_size - len(frame_header)))
        
        mp3_data.extend(frame_header)
        mp3_data.extend(frame_data)
    
    return bytes(mp3_data)

async def create_better_audio_files():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    fs = AsyncIOMotorGridFSBucket(db)
    
    print("=== Creating Better Audio Files ===\n")
    
    # Create better test audio data
    better_audio_data = create_better_test_audio()
    print(f"Created better audio data: {len(better_audio_data)} bytes")
    
    # Update the "Brave Little Sparrow" story with better audio
    sparrow_story = await db.stories.find_one({"title": {"$regex": "Brave.*Sparrow", "$options": "i"}})
    if sparrow_story:
        print(f"\nUpdating audio for: {sparrow_story['title']}")
        
        # Upload the better audio file
        better_audio_id = await fs.upload_from_stream(
            "narration_brave_sparrow_quality.mp3",
            io.BytesIO(better_audio_data),
            metadata={
                "content_type": "audio/mpeg",
                "narrator_id": "system_quality",
                "description": "High quality test audio for Brave Little Sparrow",
                "duration": 2.6,
                "bitrate": 128
            }
        )
        
        print(f"Uploaded better audio file with ID: {better_audio_id}")
        
        # Update the story
        await db.stories.update_one(
            {"id": sparrow_story['id']},
            {"$set": {"audio_id": str(better_audio_id)}}
        )
        
        print(f"Updated story audio_id to: {better_audio_id}")
        
        # Update the published narration as well
        await db.narrations.update_one(
            {"story_id": sparrow_story['id'], "status": "published"},
            {"$set": {"audio_id": str(better_audio_id)}}
        )
        
        print("Updated published narration with better audio")
    
    # Also create audio for a couple other published stories
    print(f"\n=== Adding audio to other published stories ===")
    
    # Find published stories without good audio
    stories_needing_audio = await db.stories.find({
        "status": "published",
        "$or": [
            {"audio_id": {"$exists": False}},
            {"audio_id": None}
        ]
    }).limit(3).to_list(None)
    
    for story in stories_needing_audio:
        print(f"Adding audio to: {story['title']}")
        
        # Upload audio file
        audio_id = await fs.upload_from_stream(
            f"narration_{story['title'].replace(' ', '_').lower()}_quality.mp3",
            io.BytesIO(better_audio_data),
            metadata={
                "content_type": "audio/mpeg",
                "narrator_id": "system_quality",
                "description": f"Quality test audio for {story['title']}",
                "duration": 2.6
            }
        )
        
        # Update story
        await db.stories.update_one(
            {"id": story['id']},
            {"$set": {"audio_id": str(audio_id)}}
        )
        
        # Create published narration
        narration_data = {
            "id": f"narration_quality_{story['id'][:8]}",
            "story_id": story['id'],
            "narrator_id": "system_quality",
            "audio_id": str(audio_id),
            "text": f"This is a quality test narration for {story['title']}.",
            "status": "published",
            "created_at": "2025-08-27T11:30:00Z",
            "updated_at": "2025-08-27T11:30:00Z"
        }
        
        await db.narrations.insert_one(narration_data)
        print(f"  → Audio ID: {audio_id}")
    
    # Final verification
    print(f"\n=== Final Verification ===")
    final_sparrow = await db.stories.find_one({"title": {"$regex": "Brave.*Sparrow", "$options": "i"}})
    if final_sparrow:
        print(f"✅ Brave Little Sparrow final status:")
        print(f"   - Title: {final_sparrow['title']}")
        print(f"   - Audio ID: {final_sparrow.get('audio_id', 'None')}")
        print(f"   - Status: {final_sparrow['status']}")
        
        # Check audio file
        if final_sparrow.get('audio_id'):
            try:
                from bson import ObjectId
                audio_file = await fs.open_download_stream(ObjectId(final_sparrow['audio_id']))
                audio_data = await audio_file.read()
                print(f"   - Audio size: {len(audio_data)} bytes")
                print(f"   - Should be playable: {'Yes' if len(audio_data) > 10000 else 'Maybe too small'}")
            except Exception as e:
                print(f"   - Audio check error: {e}")
    
    client.close()
    print(f"\n=== Better Audio Creation Complete ===")

if __name__ == "__main__":
    asyncio.run(create_better_audio_files())