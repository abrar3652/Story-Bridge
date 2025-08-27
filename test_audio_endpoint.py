#!/usr/bin/env python3
"""
Test the audio endpoint directly
"""
import asyncio
import os
import requests
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

async def test_audio_endpoint():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("=== Testing Audio Endpoint ===\n")
    
    # Get the "Brave Little Sparrow" story
    sparrow_story = await db.stories.find_one({"title": {"$regex": "Brave.*Sparrow", "$options": "i"}})
    if sparrow_story and sparrow_story.get('audio_id'):
        audio_id = sparrow_story['audio_id']
        print(f"Testing with Brave Little Sparrow audio_id: {audio_id}")
        
        # Test the audio endpoint
        backend_url = "https://storyquest-edu-2.preview.emergentagent.com"
        audio_url = f"{backend_url}/api/audio/{audio_id}"
        
        print(f"Testing URL: {audio_url}")
        
        try:
            # Make a GET request to the audio endpoint
            response = requests.get(audio_url, stream=True, timeout=10)
            
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                # Check the response content
                content_length = len(response.content) if hasattr(response, 'content') else 0
                print(f"✅ Audio endpoint working!")
                print(f"   - Content-Type: {response.headers.get('Content-Type', 'unknown')}")
                print(f"   - Content-Length: {content_length} bytes")
                print(f"   - First few bytes: {response.content[:20] if response.content else 'No content'}")
            else:
                print(f"❌ Audio endpoint failed with status: {response.status_code}")
                print(f"   - Response text: {response.text}")
                
        except Exception as e:
            print(f"❌ Error testing audio endpoint: {e}")
            
        # Also test with localhost (internal)
        print(f"\n--- Testing localhost endpoint ---")
        local_url = f"http://localhost:8001/api/audio/{audio_id}"
        print(f"Testing local URL: {local_url}")
        
        try:
            response = requests.get(local_url, stream=True, timeout=5)
            print(f"Local response status: {response.status_code}")
            print(f"Local response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                print(f"✅ Local audio endpoint working!")
                print(f"   - Content-Type: {response.headers.get('Content-Type', 'unknown')}")
                print(f"   - Content-Length: {len(response.content)} bytes")
            else:
                print(f"❌ Local audio endpoint failed: {response.text}")
                
        except Exception as e:
            print(f"❌ Error testing local endpoint: {e}")
            
    else:
        print("❌ No story found with audio_id to test")
    
    client.close()
    print(f"\n=== Audio Endpoint Test Complete ===")

if __name__ == "__main__":
    asyncio.run(test_audio_endpoint())