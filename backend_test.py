import requests
import sys
import json
from datetime import datetime

class StoryBridgeAPITester:
    def __init__(self, base_url="https://signin-debugger.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different user types
        self.users = {}   # Store user data
        self.stories = [] # Store created stories
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

    def test_get_stories(self):
        """Test getting published stories"""
        success, response = self.run_test(
            "Get published stories",
            "GET",
            "stories",
            200
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
    
    # Test narrator functionality
    print("\n🎤 Testing Narrator Features...")
    if not tester.test_create_narration():
        print("❌ Narration creation failed")
    
    if not tester.test_get_narrator_narrations():
        print("❌ Getting narrator narrations failed")
    
    # Test login functionality
    print("\n🔐 Testing Login...")
    for user_type, user_data in test_users.items():
        if not tester.test_auth_login(user_data['email'], user_data['password'], user_type):
            print(f"❌ Login failed for {user_type}")
    
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