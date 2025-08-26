import requests
import sys
import json
import io
import os
from datetime import datetime

class StoryBridgeAPITester:
    def __init__(self, base_url="https://storyquest-edu-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different user types
        self.users = {}   # Store user data
        self.stories = [] # Store created stories
        self.narrations = [] # Store created narrations
        self.audio_ids = [] # Store audio IDs for testing
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None, form_data=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files is not None or form_data:
                    # Remove Content-Type for multipart/form-data
                    test_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_signup(self, email, password, role, user_type):
        """Test user signup"""
        success, response = self.run_test(
            f"Signup {user_type}",
            "POST",
            "auth/signup",
            200,
            data={"email": email, "password": password, "role": role}
        )
        if success and 'access_token' in response:
            self.tokens[user_type] = response['access_token']
            self.users[user_type] = response['user']
            return True
        return False

    def test_auth_login(self, email, password, user_type):
        """Test user login"""
        success, response = self.run_test(
            f"Login {user_type}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.tokens[user_type] = response['access_token']
            self.users[user_type] = response['user']
            return True
        return False

    def test_auth_me(self, user_type):
        """Test get current user"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        success, response = self.run_test(
            f"Get current user ({user_type})",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        return success

    def test_create_mock_stories(self):
        """Test creating mock stories"""
        success, response = self.run_test(
            "Create mock stories",
            "POST",
            "mock-stories",
            200
        )
        return success

    def test_get_stories(self, user_type="end_user"):
        """Test getting published stories"""
        # Add authentication for getting stories
        headers = {}
        if user_type in self.tokens:
            headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
            
        success, response = self.run_test(
            f"Get published stories ({user_type})",
            "GET",
            "stories",
            200,
            headers=headers
        )
        if success and isinstance(response, list):
            self.stories = response
            print(f"   Found {len(response)} stories")
        return success

    def test_create_story(self, user_type="creator"):
        """Test creating a new story"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        story_data = {
            "title": "Test Story by API",
            "text": "This is a test story created via API testing. It has simple vocabulary and a quiz.",
            "language": "en",
            "age_group": "4-6",
            "vocabulary": ["test", "story", "simple"],
            "quizzes": [
                {
                    "type": "true_false",
                    "question": "This is a test story?",
                    "answer": True
                }
            ]
        }
        
        success, response = self.run_test(
            f"Create story ({user_type})",
            "POST",
            "stories",
            200,
            data=story_data,
            headers=headers
        )
        return success

    def test_get_creator_stories(self, user_type="creator"):
        """Test getting creator's stories"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        success, response = self.run_test(
            f"Get creator stories ({user_type})",
            "GET",
            "stories/creator",
            200,
            headers=headers
        )
        return success

    def test_sync_progress(self, user_type="end_user"):
        """Test syncing user progress"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        if not self.stories:
            print("❌ No stories available for progress test")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        # Note: user_id should be set automatically by backend from token
        progress_data = {
            "user_id": self.users[user_type]['id'],  # Include user_id as required by model
            "story_id": self.stories[0]['id'],
            "completed": True,
            "time_spent": 120,
            "vocabulary_learned": ["brave", "sparrow"],
            "quiz_results": [{"question": 1, "correct": True}],
            "coins_earned": 15,
            "badges_earned": ["Story Starter"]
        }
        
        success, response = self.run_test(
            f"Sync progress ({user_type})",
            "POST",
            "progress",
            200,
            data=progress_data,
            headers=headers
        )
        return success

    def test_get_user_progress(self, user_type="end_user"):
        """Test getting user progress"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        success, response = self.run_test(
            f"Get user progress ({user_type})",
            "GET",
            "progress/user",
            200,
            headers=headers
        )
        return success

    def test_create_narration(self, user_type="narrator"):
        """Test creating a narration"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        if not self.stories:
            print("❌ No stories available for narration test")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        
        # Test with form data as expected by the endpoint
        form_data = {
            "story_id": self.stories[0]['id'],
            "text": "This is a test narration text for the story."
        }
        
        # Use form data instead of JSON
        success, response = self.run_test(
            f"Create narration ({user_type})",
            "POST",
            "narrations",
            200,
            data=form_data,
            headers=headers,
            form_data=True
        )
        
        if success and 'narration' in response:
            self.narrations.append(response['narration'])
        
        return success

    def create_sample_mp3_file(self):
        """Create a sample MP3 file for testing"""
        # Create a minimal MP3 file (just headers, not actual audio)
        mp3_header = b'\xff\xfb\x90\x00' + b'\x00' * 1000  # Minimal MP3 header + padding
        return io.BytesIO(mp3_header)

    def test_create_narration_with_audio(self, user_type="narrator"):
        """Test creating a narration with audio file upload"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        if not self.stories:
            print("❌ No stories available for narration test")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        
        # Create sample MP3 file
        audio_file = self.create_sample_mp3_file()
        
        form_data = {
            "story_id": self.stories[0]['id'],
            "text": "This is a test narration with audio file."
        }
        
        files = {
            "audio": ("test_narration.mp3", audio_file, "audio/mpeg")
        }
        
        success, response = self.run_test(
            f"Create narration with audio ({user_type})",
            "POST",
            "narrations",
            200,
            data=form_data,
            headers=headers,
            files=files,
            form_data=True
        )
        
        if success and 'narration' in response:
            narration = response['narration']
            self.narrations.append(narration)
            if 'audio_id' in narration:
                self.audio_ids.append(narration['audio_id'])
                print(f"   Audio ID: {narration['audio_id']}")
        
        return success

    def test_create_narration_large_file(self, user_type="narrator"):
        """Test creating narration with file exceeding 5MB limit"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        if not self.stories:
            print("❌ No stories available for narration test")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        
        # Create large file (6MB)
        large_audio = io.BytesIO(b'\xff\xfb\x90\x00' + b'\x00' * (6 * 1024 * 1024))
        
        form_data = {
            "story_id": self.stories[0]['id'],
            "text": "This should fail due to large file size."
        }
        
        files = {
            "audio": ("large_test.mp3", large_audio, "audio/mpeg")
        }
        
        success, response = self.run_test(
            f"Create narration with large file ({user_type}) - Should fail",
            "POST",
            "narrations",
            400,  # Expecting 400 Bad Request
            data=form_data,
            headers=headers,
            files=files,
            form_data=True
        )
        
        return success

    def test_create_narration_invalid_file_type(self, user_type="narrator"):
        """Test creating narration with invalid file type"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        if not self.stories:
            print("❌ No stories available for narration test")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        
        # Create text file instead of audio
        text_file = io.BytesIO(b'This is not an audio file')
        
        form_data = {
            "story_id": self.stories[0]['id'],
            "text": "This should fail due to invalid file type."
        }
        
        files = {
            "audio": ("test.txt", text_file, "text/plain")
        }
        
        success, response = self.run_test(
            f"Create narration with invalid file type ({user_type}) - Should fail",
            "POST",
            "narrations",
            400,  # Expecting 400 Bad Request
            data=form_data,
            headers=headers,
            files=files,
            form_data=True
        )
        
        return success

    def test_create_narration_non_narrator(self, user_type="end_user"):
        """Test creating narration with non-narrator role - should fail"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        if not self.stories:
            print("❌ No stories available for narration test")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        
        form_data = {
            "story_id": self.stories[0]['id'],
            "text": "This should fail due to insufficient permissions."
        }
        
        success, response = self.run_test(
            f"Create narration with non-narrator role ({user_type}) - Should fail",
            "POST",
            "narrations",
            403,  # Expecting 403 Forbidden
            data=form_data,
            headers=headers,
            form_data=True
        )
        
        return success

    def test_create_narration_invalid_story(self, user_type="narrator"):
        """Test creating narration with invalid story ID"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        
        form_data = {
            "story_id": "invalid-story-id-12345",
            "text": "This should fail due to invalid story ID."
        }
        
        success, response = self.run_test(
            f"Create narration with invalid story ID ({user_type}) - Should fail",
            "POST",
            "narrations",
            404,  # Expecting 404 Not Found
            data=form_data,
            headers=headers,
            form_data=True
        )
        
        return success

    def test_get_audio_file(self):
        """Test fetching audio files by audio_id"""
        if not self.audio_ids:
            print("❌ No audio IDs available for testing")
            return False
            
        audio_id = self.audio_ids[0]
        
        # Test without authentication (audio serving should be public)
        success, response = self.run_test(
            f"Get audio file (ID: {audio_id})",
            "GET",
            f"audio/{audio_id}",
            200
        )
        
        return success

    def test_get_audio_file_invalid_id(self):
        """Test fetching audio with invalid ID - should return 404"""
        success, response = self.run_test(
            "Get audio file with invalid ID - Should fail",
            "GET",
            "audio/invalid-audio-id-12345",
            404  # Expecting 404 Not Found
        )
        
        return success

    def test_get_stories_with_audio(self, user_type="end_user"):
        """Test that stories with audio_id are returned properly"""
        headers = {}
        if user_type in self.tokens:
            headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
            
        success, response = self.run_test(
            f"Get stories with audio information ({user_type})",
            "GET",
            "stories",
            200,
            headers=headers
        )
        
        if success and isinstance(response, list):
            # Check if any stories have audio_id
            stories_with_audio = [story for story in response if story.get('audio_id')]
            print(f"   Found {len(stories_with_audio)} stories with audio")
            
            # Verify audio_id field is present and valid
            for story in stories_with_audio:
                if 'audio_id' in story and story['audio_id']:
                    print(f"   Story '{story['title']}' has audio_id: {story['audio_id']}")
        
        return success

    def test_get_narrator_narrations(self, user_type="narrator"):
        """Test getting narrator's narrations"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        success, response = self.run_test(
            f"Get narrator narrations ({user_type})",
            "GET",
            "narrations/narrator",
            200,
            headers=headers
        )
        return success

    def test_create_initial_admin(self):
        """Test creating initial admin user"""
        success, response = self.run_test(
            "Create initial admin user",
            "POST",
            "auth/create-initial-admin",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin login",
            "POST",
            "auth/admin-login",
            200,
            data={"email": "admin@storybridge.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.tokens['admin'] = response['access_token']
            self.users['admin'] = response['user']
            return True
        return False

    def test_admin_pending_content(self):
        """Test getting pending content for admin approval"""
        if 'admin' not in self.tokens:
            print("❌ No admin token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.tokens["admin"]}'}
        success, response = self.run_test(
            "Get pending content (admin)",
            "GET",
            "admin/pending",
            200,
            headers=headers
        )
        
        if success:
            print(f"   📊 Pending Content Analysis:")
            if 'stories' in response:
                pending_stories = response['stories']
                print(f"   📚 Pending Stories: {len(pending_stories)}")
                for story in pending_stories:
                    print(f"      - '{story.get('title', 'Unknown')}' (ID: {story.get('id', 'Unknown')})")
            
            if 'narrations' in response:
                pending_narrations = response['narrations']
                print(f"   🎤 Pending Narrations: {len(pending_narrations)}")
                for narration in pending_narrations:
                    story_id = narration.get('story_id', 'Unknown')
                    narration_id = narration.get('id', 'Unknown')
                    has_audio = 'Yes' if narration.get('audio_id') else 'No'
                    print(f"      - Story ID: {story_id}, Narration ID: {narration_id}, Has Audio: {has_audio}")
                    
            # Store pending content for further testing
            self.pending_stories = response.get('stories', [])
            self.pending_narrations = response.get('narrations', [])
            
        return success

    def test_submit_story_for_review(self, user_type="creator"):
        """Test submitting a story for admin review"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        # First create a story
        if not self.test_create_story(user_type):
            print("❌ Failed to create story for submission test")
            return False
            
        # Get creator's stories to find the draft story
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        success, response = self.run_test(
            f"Get creator stories for submission ({user_type})",
            "GET",
            "stories/creator",
            200,
            headers=headers
        )
        
        if not success or not response:
            print("❌ Failed to get creator stories")
            return False
            
        # Find a draft story to submit
        draft_stories = [story for story in response if story.get('status') == 'draft']
        if not draft_stories:
            print("❌ No draft stories found to submit")
            return False
            
        story_id = draft_stories[0]['id']
        
        # Submit the story for review
        success, response = self.run_test(
            f"Submit story for review ({user_type})",
            "PATCH",
            f"stories/{story_id}/submit",
            200,
            headers=headers
        )
        
        return success

    def test_approve_story(self, user_type="admin"):
        """Test approving a pending story"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        if not hasattr(self, 'pending_stories') or not self.pending_stories:
            print("❌ No pending stories available for approval")
            return False
            
        story_id = self.pending_stories[0]['id']
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        
        success, response = self.run_test(
            f"Approve story ({user_type})",
            "PATCH",
            f"admin/content/story/{story_id}/approve",
            200,
            headers=headers
        )
        
        return success

    def test_approve_narration(self, user_type="admin"):
        """Test approving a pending narration"""
        if user_type not in self.tokens:
            print(f"❌ No token for {user_type}")
            return False
            
        if not hasattr(self, 'pending_narrations') or not self.pending_narrations:
            print("❌ No pending narrations available for approval")
            return False
            
        narration_id = self.pending_narrations[0]['id']
        headers = {'Authorization': f'Bearer {self.tokens[user_type]}'}
        
        success, response = self.run_test(
            f"Approve narration ({user_type})",
            "PATCH",
            f"admin/content/narration/{narration_id}/approve",
            200,
            headers=headers
        )
        
        return success

    def test_complete_admin_workflow(self):
        """Test the complete admin workflow: create story → approve → add narration → approve narration"""
        print("\n🔄 Testing Complete Admin Workflow...")
        
        # Step 1: Create and submit a story as creator
        print("   Step 1: Creating and submitting story...")
        if not self.test_submit_story_for_review('creator'):
            print("❌ Failed to create and submit story")
            return False
            
        # Step 2: Get pending content to see the submitted story
        print("   Step 2: Checking pending content...")
        if not self.test_admin_pending_content():
            print("❌ Failed to get pending content")
            return False
            
        # Step 3: Approve the story
        print("   Step 3: Approving story...")
        if not self.test_approve_story('admin'):
            print("❌ Failed to approve story")
            return False
            
        # Step 4: Add narration to the approved story
        print("   Step 4: Adding narration...")
        if not self.test_create_narration_with_audio('narrator'):
            print("❌ Failed to create narration")
            return False
            
        # Step 5: Check pending content again to see the narration
        print("   Step 5: Checking pending narrations...")
        if not self.test_admin_pending_content():
            print("❌ Failed to get pending content after narration")
            return False
            
        # Step 6: Approve the narration
        print("   Step 6: Approving narration...")
        if not self.test_approve_narration('admin'):
            print("❌ Failed to approve narration")
            return False
            
        print("✅ Complete admin workflow test passed!")
        return True

def main():
    print("🚀 Starting StoryBridge API Testing...")
    print("=" * 60)
    
    tester = StoryBridgeAPITester()
    
    # Test data
    timestamp = datetime.now().strftime('%H%M%S')
    test_users = {
        'end_user': {
            'email': f'test_enduser_{timestamp}@example.com',
            'password': 'testpass123',
            'role': 'end_user'
        },
        'creator': {
            'email': f'test_creator_{timestamp}@example.com', 
            'password': 'creatorpass123',
            'role': 'creator'
        },
        'narrator': {
            'email': f'test_narrator_{timestamp}@example.com',
            'password': 'narratorpass123',
            'role': 'narrator'
        }
    }
    
    # Test authentication for all user types
    print("\n📝 Testing Authentication...")
    auth_success = True
    for user_type, user_data in test_users.items():
        if not tester.test_auth_signup(user_data['email'], user_data['password'], user_data['role'], user_type):
            auth_success = False
            break
            
        if not tester.test_auth_me(user_type):
            auth_success = False
            break
    
    if not auth_success:
        print("❌ Authentication tests failed, stopping...")
        return 1
    
    # Test mock stories creation
    print("\n📚 Testing Story Management...")
    if not tester.test_create_mock_stories():
        print("❌ Mock stories creation failed")
        return 1
    
    if not tester.test_get_stories():
        print("❌ Getting stories failed")
        return 1
    
    # Test creator functionality
    print("\n✍️ Testing Creator Features...")
    if not tester.test_create_story():
        print("❌ Story creation failed")
    
    if not tester.test_get_creator_stories():
        print("❌ Getting creator stories failed")
    
    # Test end user functionality
    print("\n👶 Testing End User Features...")
    if not tester.test_sync_progress():
        print("❌ Progress sync failed")
    
    if not tester.test_get_user_progress():
        print("❌ Getting user progress failed")
    
    # Test narrator functionality - COMPREHENSIVE NARRATION TESTING
    print("\n🎤 Testing Narrator Features - Comprehensive Narration Tests...")
    
    # Test basic narration creation (text only)
    if not tester.test_create_narration():
        print("❌ Basic narration creation failed")
    
    # Test narration creation with audio file
    if not tester.test_create_narration_with_audio():
        print("❌ Narration creation with audio failed")
    
    # Test file validation - large file (should fail)
    if not tester.test_create_narration_large_file():
        print("❌ Large file validation test failed")
    
    # Test file validation - invalid file type (should fail)
    if not tester.test_create_narration_invalid_file_type():
        print("❌ Invalid file type validation test failed")
    
    # Test permissions - non-narrator role (should fail)
    if not tester.test_create_narration_non_narrator():
        print("❌ Non-narrator permission test failed")
    
    # Test invalid story ID (should fail)
    if not tester.test_create_narration_invalid_story():
        print("❌ Invalid story ID test failed")
    
    # Test getting narrator's narrations
    if not tester.test_get_narrator_narrations():
        print("❌ Getting narrator narrations failed")
    
    # Test audio file serving
    print("\n🔊 Testing Audio File Serving...")
    if not tester.test_get_audio_file():
        print("❌ Audio file serving failed")
    
    # Test invalid audio ID (should fail)
    if not tester.test_get_audio_file_invalid_id():
        print("❌ Invalid audio ID test failed")
    
    # Test stories with audio information
    print("\n📚 Testing Stories with Audio Information...")
    if not tester.test_get_stories_with_audio():
        print("❌ Getting stories with audio information failed")
    
    # Test login functionality
    print("\n🔐 Testing Login...")
    for user_type, user_data in test_users.items():
        if not tester.test_auth_login(user_data['email'], user_data['password'], user_type):
            print(f"❌ Login failed for {user_type}")
    
    # Test admin functionality
    print("\n👑 Testing Admin Features...")
    
    # Create initial admin if needed
    tester.test_create_initial_admin()  # This might fail if admin exists, that's OK
    
    # Login as admin
    if not tester.test_admin_login():
        print("❌ Admin login failed")
    else:
        # Test admin pending content endpoint
        if not tester.test_admin_pending_content():
            print("❌ Getting pending content failed")
        
        # Test complete admin workflow
        if not tester.test_complete_admin_workflow():
            print("❌ Complete admin workflow failed")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All API tests passed! Backend is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())