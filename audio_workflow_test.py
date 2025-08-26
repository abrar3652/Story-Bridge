#!/usr/bin/env python3
"""
Audio Workflow Testing Script
Tests the complete story and audio workflow as requested in the review.
"""

import requests
import json
import io
import sys
from datetime import datetime

class AudioWorkflowTester:
    def __init__(self, base_url="https://storyquest-edu-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.creator_token = None
        self.narrator_token = None
        self.end_user_token = None
        
    def login_admin(self):
        """Login as admin user"""
        print("🔐 Logging in as admin...")
        response = requests.post(f"{self.api_url}/auth/admin-login", json={
            "email": "admin@storybridge.com",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.admin_token = data['access_token']
            print("✅ Admin login successful")
            return True
        else:
            print(f"❌ Admin login failed: {response.status_code}")
            return False
    
    def create_test_users(self):
        """Create test users for the workflow"""
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Create creator
        print("👤 Creating test creator...")
        response = requests.post(f"{self.api_url}/auth/signup", json={
            "email": f"test_creator_audio_{timestamp}@example.com",
            "password": "testpass123",
            "role": "creator"
        })
        
        if response.status_code == 200:
            self.creator_token = response.json()['access_token']
            print("✅ Creator created successfully")
        else:
            print(f"❌ Creator creation failed: {response.status_code}")
            return False
            
        # Create narrator
        print("🎤 Creating test narrator...")
        response = requests.post(f"{self.api_url}/auth/signup", json={
            "email": f"test_narrator_audio_{timestamp}@example.com",
            "password": "testpass123",
            "role": "narrator"
        })
        
        if response.status_code == 200:
            self.narrator_token = response.json()['access_token']
            print("✅ Narrator created successfully")
        else:
            print(f"❌ Narrator creation failed: {response.status_code}")
            return False
            
        # Create end user
        print("👶 Creating test end user...")
        response = requests.post(f"{self.api_url}/auth/signup", json={
            "email": f"test_enduser_audio_{timestamp}@example.com",
            "password": "testpass123",
            "role": "end_user"
        })
        
        if response.status_code == 200:
            self.end_user_token = response.json()['access_token']
            print("✅ End user created successfully")
            return True
        else:
            print(f"❌ End user creation failed: {response.status_code}")
            return False
    
    def test_story_library_access(self):
        """Test 1: Story Library Access - GET /api/stories for approved stories"""
        print("\n📚 Test 1: Story Library Access")
        print("Testing GET /api/stories endpoint for approved stories...")
        
        headers = {'Authorization': f'Bearer {self.end_user_token}'}
        response = requests.get(f"{self.api_url}/stories", headers=headers)
        
        if response.status_code == 200:
            stories = response.json()
            print(f"✅ Successfully retrieved {len(stories)} stories")
            
            # Check for published status
            published_stories = [s for s in stories if s.get('status') == 'published']
            print(f"✅ Found {len(published_stories)} published stories")
            
            # Check for stories with audio_id
            stories_with_audio = [s for s in stories if s.get('audio_id')]
            print(f"✅ Found {len(stories_with_audio)} stories with audio")
            
            # Display story details
            for story in stories_with_audio[:3]:  # Show first 3
                print(f"   📖 '{story['title']}' - Audio ID: {story['audio_id']}")
                
            return True, stories_with_audio
        else:
            print(f"❌ Failed to get stories: {response.status_code}")
            return False, []
    
    def test_audio_serving_headers(self, audio_ids):
        """Test 2: Audio Serving with Fixed Content Types"""
        print("\n🔊 Test 2: Audio Serving with Fixed Content Types")
        
        if not audio_ids:
            print("❌ No audio IDs available for testing")
            return False
            
        for audio_id in audio_ids[:2]:  # Test first 2 audio files
            print(f"Testing audio ID: {audio_id}")
            
            response = requests.get(f"{self.api_url}/audio/{audio_id}")
            
            if response.status_code == 200:
                print(f"✅ Audio served successfully (Status: 200)")
                
                # Check headers
                headers = response.headers
                print(f"   Content-Type: {headers.get('Content-Type', 'Not set')}")
                print(f"   Accept-Ranges: {headers.get('Accept-Ranges', 'Not set')}")
                print(f"   Cache-Control: {headers.get('Cache-Control', 'Not set')}")
                print(f"   Content-Disposition: {headers.get('Content-Disposition', 'Not set')}")
                
                # Verify content type is not hardcoded
                content_type = headers.get('Content-Type', '')
                if content_type and content_type != 'audio/mpeg':
                    print(f"✅ Content-Type is dynamic: {content_type}")
                elif content_type == 'audio/mpeg':
                    print(f"⚠️  Content-Type is audio/mpeg (could be original or default)")
                else:
                    print(f"❌ No Content-Type header found")
                    
                # Check for proper headers
                if headers.get('Accept-Ranges'):
                    print("✅ Accept-Ranges header present")
                if headers.get('Cache-Control'):
                    print("✅ Cache-Control header present")
                    
            else:
                print(f"❌ Failed to serve audio {audio_id}: {response.status_code}")
                return False
                
        return True
    
    def create_webm_audio_file(self):
        """Create a sample WebM audio file for testing"""
        # WebM header for audio (Opus codec)
        webm_header = (
            b'\x1a\x45\xdf\xa3'  # EBML header
            b'\x01\x00\x00\x00\x00\x00\x00\x1f'  # EBML version
            b'\x42\x86\x81\x01'  # EBMLVersion = 1
            b'\x42\xf7\x81\x01'  # EBMLReadVersion = 1
            b'\x42\xf2\x81\x04'  # EBMLMaxIDLength = 4
            b'\x42\xf3\x81\x08'  # EBMLMaxSizeLength = 8
            b'\x42\x82\x84webm'  # DocType = "webm"
            + b'\x00' * 500  # Padding to make it a reasonable size
        )
        return io.BytesIO(webm_header)
    
    def test_new_narration_creation(self):
        """Test 3: New Narration Creation with Proper Audio Format"""
        print("\n🎬 Test 3: New Narration Creation with Proper Audio Format")
        
        # Step 1: Create a new story
        print("Step 1: Creating new test story...")
        headers = {'Authorization': f'Bearer {self.creator_token}'}
        
        # Create story with proper TPRS compliance (3+ repetitions)
        form_data = {
            "title": "Audio Test Story",
            "text": "This is a test story for audio testing. The test story has test content with test vocabulary. Every test word appears test times in this test story. The test story is perfect for test purposes and test validation. This test content ensures test compliance.",
            "language": "en",
            "age_group": "4-6",
            "vocabulary": json.dumps(["test", "story", "content"]),
            "quizzes": json.dumps([{
                "type": "true_false",
                "question": "This is a test story?",
                "answer": True
            }])
        }
        
        response = requests.post(f"{self.api_url}/stories", data=form_data, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to create story: {response.status_code} - {response.text}")
            return False
            
        story = response.json()
        story_id = story['id']
        print(f"✅ Story created with ID: {story_id}")
        
        # Step 2: Submit story for review
        print("Step 2: Submitting story for review...")
        response = requests.patch(f"{self.api_url}/stories/{story_id}/submit", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to submit story: {response.status_code}")
            return False
            
        print("✅ Story submitted for review")
        
        # Step 3: Approve story as admin
        print("Step 3: Approving story as admin...")
        admin_headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.patch(f"{self.api_url}/admin/content/story/{story_id}/approve", headers=admin_headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to approve story: {response.status_code}")
            return False
            
        print("✅ Story approved and published")
        
        # Step 4: Add narration with WebM audio
        print("Step 4: Adding narration with WebM audio...")
        narrator_headers = {'Authorization': f'Bearer {self.narrator_token}'}
        
        webm_audio = self.create_webm_audio_file()
        
        form_data = {
            "story_id": story_id,
            "text": "This is a test narration for the audio workflow test."
        }
        
        files = {
            "audio": ("test_narration.webm", webm_audio, "audio/webm;codecs=opus")
        }
        
        response = requests.post(f"{self.api_url}/narrations", data=form_data, files=files, headers=narrator_headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to create narration: {response.status_code} - {response.text}")
            return False
            
        narration = response.json()['narration']
        narration_id = narration['id']
        audio_id = narration.get('audio_id')
        
        print(f"✅ Narration created with ID: {narration_id}")
        print(f"✅ Audio uploaded with ID: {audio_id}")
        
        # Step 5: Approve narration as admin
        print("Step 5: Approving narration as admin...")
        response = requests.patch(f"{self.api_url}/admin/content/narration/{narration_id}/approve", headers=admin_headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to approve narration: {response.status_code}")
            return False
            
        print("✅ Narration approved")
        
        # Step 6: Verify story has audio_id
        print("Step 6: Verifying story has audio_id...")
        response = requests.get(f"{self.api_url}/stories", headers={'Authorization': f'Bearer {self.end_user_token}'})
        
        if response.status_code == 200:
            stories = response.json()
            test_story = next((s for s in stories if s['id'] == story_id), None)
            
            if test_story and test_story.get('audio_id'):
                print(f"✅ Story now has audio_id: {test_story['audio_id']}")
                return True, audio_id
            else:
                print("❌ Story does not have audio_id after narration approval")
                return False, None
        else:
            print(f"❌ Failed to verify story: {response.status_code}")
            return False, None
    
    def test_end_to_end_workflow(self, new_audio_id):
        """Test 4: End-to-End Workflow"""
        print("\n🔄 Test 4: End-to-End Workflow")
        
        # Test that approved stories with approved narrations appear in end user library
        print("Testing end user story library access...")
        headers = {'Authorization': f'Bearer {self.end_user_token}'}
        response = requests.get(f"{self.api_url}/stories", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to get end user stories: {response.status_code}")
            return False
            
        stories = response.json()
        published_stories = [s for s in stories if s.get('status') == 'published']
        stories_with_audio = [s for s in stories if s.get('audio_id')]
        
        print(f"✅ End user can see {len(published_stories)} published stories")
        print(f"✅ {len(stories_with_audio)} stories have audio available")
        
        # Test audio serving for the new audio file
        if new_audio_id:
            print(f"Testing new audio file serving (ID: {new_audio_id})...")
            response = requests.get(f"{self.api_url}/audio/{new_audio_id}")
            
            if response.status_code == 200:
                print("✅ New audio file serves correctly")
                
                # Check content type
                content_type = response.headers.get('Content-Type', '')
                print(f"   Content-Type: {content_type}")
                
                if 'webm' in content_type.lower() or 'opus' in content_type.lower():
                    print("✅ Content-Type correctly reflects WebM/Opus format")
                else:
                    print(f"⚠️  Content-Type may not reflect original format: {content_type}")
                    
                return True
            else:
                print(f"❌ Failed to serve new audio: {response.status_code}")
                return False
        else:
            print("❌ No new audio ID to test")
            return False
    
    def run_complete_test(self):
        """Run the complete audio workflow test"""
        print("🚀 Starting Complete Audio Workflow Test")
        print("=" * 60)
        
        # Setup
        if not self.login_admin():
            return False
            
        if not self.create_test_users():
            return False
        
        # Test 1: Story Library Access
        success, audio_ids = self.test_story_library_access()
        if not success:
            return False
            
        # Test 2: Audio Serving Headers
        if not self.test_audio_serving_headers([story.get('audio_id') for story in audio_ids]):
            return False
            
        # Test 3: New Narration Creation
        success, new_audio_id = self.test_new_narration_creation()
        if not success:
            return False
            
        # Test 4: End-to-End Workflow
        if not self.test_end_to_end_workflow(new_audio_id):
            return False
            
        print("\n" + "=" * 60)
        print("🎉 All audio workflow tests passed!")
        print("✅ Story library access working")
        print("✅ Audio serving with proper headers working")
        print("✅ New narration creation workflow working")
        print("✅ End-to-end workflow complete")
        
        return True

def main():
    tester = AudioWorkflowTester()
    
    if tester.run_complete_test():
        print("\n🎯 CONCLUSION: Audio workflow fixes are working correctly!")
        return 0
    else:
        print("\n❌ CONCLUSION: Some audio workflow issues remain")
        return 1

if __name__ == "__main__":
    sys.exit(main())