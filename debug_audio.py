#!/usr/bin/env python3
"""
Debug script to investigate audio issues in StoryBridge
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv
import json
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

async def debug_audio_issues():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    fs = AsyncIOMotorGridFSBucket(db)
    
    print("=== StoryBridge Audio Debug Report ===\n")
    
    # 1. Check all stories and their audio status
    print("1. STORIES WITH AUDIO_ID:")
    stories_cursor = db.stories.find({})
    stories_with_audio = []
    all_stories = []
    
    async for story in stories_cursor:
        all_stories.append(story)
        if story.get('audio_id'):
            stories_with_audio.append(story)
            print(f"   - {story['title']} (ID: {story['id'][:8]}) | Audio ID: {story['audio_id'][:8]}... | Status: {story['status']}")
    
    print(f"\n   Total stories: {len(all_stories)}")
    print(f"   Stories with audio_id: {len(stories_with_audio)}")
    
    # 2. Check narrations
    print(f"\n2. NARRATIONS:")
    narrations_cursor = db.narrations.find({})
    narrations_with_audio = []
    all_narrations = []
    
    async for narration in narrations_cursor:
        all_narrations.append(narration)
        if narration.get('audio_id'):
            narrations_with_audio.append(narration)
            # Get story title for reference
            story = await db.stories.find_one({"id": narration['story_id']})
            story_title = story['title'] if story else 'Unknown Story'
            print(f"   - Story: {story_title} | Narration ID: {narration['id'][:8]} | Audio ID: {narration['audio_id'][:8]}... | Status: {narration['status']}")
    
    print(f"\n   Total narrations: {len(all_narrations)}")
    print(f"   Narrations with audio_id: {len(narrations_with_audio)}")
    
    # 3. Check GridFS files
    print(f"\n3. GRIDFS AUDIO FILES:")
    gridfs_cursor = fs.find()
    audio_files = []
    
    async for file in gridfs_cursor:
        if 'audio' in file.filename.lower() or 'narration' in file.filename.lower():
            audio_files.append(file)
            content_type = file.metadata.get('content_type', 'unknown') if file.metadata else 'unknown'
            print(f"   - File: {file.filename} | ID: {str(file._id)[:8]}... | Type: {content_type} | Size: {file.length} bytes")
    
    print(f"\n   Total audio files in GridFS: {len(audio_files)}")
    
    # 4. Check for specific "Brave Little Sparrow" story
    print(f"\n4. 'BRAVE LITTLE SPARROW' ANALYSIS:")
    sparrow_story = await db.stories.find_one({"title": {"$regex": "Brave.*Sparrow", "$options": "i"}})
    if sparrow_story:
        print(f"   - Found story: {sparrow_story['title']}")
        print(f"   - Story ID: {sparrow_story['id']}")
        print(f"   - Audio ID: {sparrow_story.get('audio_id', 'None')}")
        print(f"   - Status: {sparrow_story['status']}")
        
        # Check if there's a narration for this story
        sparrow_narration = await db.narrations.find_one({"story_id": sparrow_story['id']})
        if sparrow_narration:
            print(f"   - Narration found: {sparrow_narration['id']}")
            print(f"   - Narration audio_id: {sparrow_narration.get('audio_id', 'None')}")
            print(f"   - Narration status: {sparrow_narration['status']}")
            
            # Check if the audio file exists in GridFS
            if sparrow_narration.get('audio_id'):
                try:
                    from bson import ObjectId
                    audio_file = await fs.find_one(ObjectId(sparrow_narration['audio_id']))
                    if audio_file:
                        print(f"   - Audio file exists in GridFS: {audio_file.filename} ({audio_file.length} bytes)")
                    else:
                        print(f"   - ⚠️  Audio file NOT found in GridFS!")
                except Exception as e:
                    print(f"   - ⚠️  Error checking GridFS file: {e}")
        else:
            print(f"   - No narration found for this story")
    else:
        print(f"   - 'Brave Little Sparrow' story not found")
    
    # 5. Test audio endpoint for each audio file
    print(f"\n5. TESTING AUDIO ENDPOINT ACCESS:")
    if stories_with_audio:
        test_story = stories_with_audio[0]
        audio_id = test_story['audio_id']
        print(f"   Testing with story: {test_story['title']} (Audio ID: {audio_id[:8]}...)")
        
        try:
            from bson import ObjectId
            # Try to access the audio file directly from GridFS
            grid_out = await fs.open_download_stream(ObjectId(audio_id))
            audio_data = await grid_out.read()
            content_type = grid_out.metadata.get('content_type', 'audio/mpeg') if grid_out.metadata else 'audio/mpeg'
            
            print(f"   ✅ Audio file accessible from GridFS")
            print(f"   - Size: {len(audio_data)} bytes")
            print(f"   - Content-Type: {content_type}")
            
        except Exception as e:
            print(f"   ❌ Error accessing audio file: {e}")
    else:
        print(f"   No stories with audio_id to test")
    
    # Close connection
    client.close()
    print(f"\n=== Debug Report Complete ===")

if __name__ == "__main__":
    asyncio.run(debug_audio_issues())