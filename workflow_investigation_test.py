import requests
import json
import io
from datetime import datetime

class WorkflowInvestigationTester:
    def __init__(self, base_url="https://storyquest-edu-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.creator_token = None
        self.narrator_token = None
        self.end_user_token = None
        
    def login_admin(self):
        """Login as admin"""
        response = requests.post(f"{self.api_url}/auth/admin-login", 
                               json={"email": "admin@storybridge.com", "password": "admin123"})
        if response.status_code == 200:
            self.admin_token = response.json()['access_token']
            print("✅ Admin login successful")
            return True
        print(f"❌ Admin login failed: {response.status_code}")
        return False
    
    def create_test_users(self):
        """Create test users for the workflow"""
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Create creator
        creator_data = {
            "email": f"workflow_creator_{timestamp}@test.com",
            "password": "testpass123",
            "role": "creator"
        }
        response = requests.post(f"{self.api_url}/auth/signup", json=creator_data)
        if response.status_code == 200:
            self.creator_token = response.json()['access_token']
            print("✅ Creator user created")
        else:
            print(f"❌ Creator creation failed: {response.status_code}")
            return False
            
        # Create narrator
        narrator_data = {
            "email": f"workflow_narrator_{timestamp}@test.com", 
            "password": "testpass123",
            "role": "narrator"
        }
        response = requests.post(f"{self.api_url}/auth/signup", json=narrator_data)
        if response.status_code == 200:
            self.narrator_token = response.json()['access_token']
            print("✅ Narrator user created")
        else:
            print(f"❌ Narrator creation failed: {response.status_code}")
            return False
            
        # Create end user
        end_user_data = {
            "email": f"workflow_enduser_{timestamp}@test.com",
            "password": "testpass123", 
            "role": "end_user"
        }
        response = requests.post(f"{self.api_url}/auth/signup", json=end_user_data)
        if response.status_code == 200:
            self.end_user_token = response.json()['access_token']
            print("✅ End user created")
            return True
        else:
            print(f"❌ End user creation failed: {response.status_code}")
            return False
    
    def create_story_with_proper_tprs(self):
        """Create a story that passes TPRS validation"""
        headers = {'Authorization': f'Bearer {self.creator_token}'}
        
        # Create story with proper vocabulary repetitions (3+ times each)
        form_data = {
            "title": "Workflow Test Story",
            "text": "The brave cat was very brave. The brave cat loved to play and play and play. Every day the cat would play with friends. The cat was brave when playing games. Playing games made the brave cat happy. The cat enjoyed playing with other cats. When the brave cat finished playing, it would rest.",
            "language": "en",
            "age_group": "4-6", 
            "vocabulary": json.dumps(["brave", "cat", "play"]),  # Each word appears 3+ times
            "quizzes": json.dumps([{
                "type": "true_false",
                "question": "The cat was brave?",
                "answer": True
            }])
        }
        
        response = requests.post(f"{self.api_url}/stories", data=form_data, headers=headers)
        if response.status_code == 200:
            story = response.json()
            print(f"✅ Story created successfully: {story['id']}")
            print(f"   Status: {story['status']}")
            return story
        else:
            print(f"❌ Story creation failed: {response.status_code}")
            try:
                print(f"   Error: {response.json()}")
            except:
                print(f"   Error: {response.text}")
            return None
    
    def submit_story_for_review(self, story_id):
        """Submit story for admin review"""
        headers = {'Authorization': f'Bearer {self.creator_token}'}
        response = requests.patch(f"{self.api_url}/stories/{story_id}/submit", headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Story {story_id} submitted for review")
            return True
        else:
            print(f"❌ Story submission failed: {response.status_code}")
            return False
    
    def check_pending_content(self):
        """Check what content is pending approval"""
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.get(f"{self.api_url}/admin/pending", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"📊 Pending Content:")
            print(f"   Stories: {len(data.get('stories', []))}")
            print(f"   Narrations: {len(data.get('narrations', []))}")
            
            for story in data.get('stories', []):
                print(f"   📚 Story: '{story['title']}' (ID: {story['id']}, Status: {story['status']})")
                
            for narration in data.get('narrations', []):
                print(f"   🎤 Narration: Story {narration['story_id']} (ID: {narration['id']}, Audio: {'Yes' if narration.get('audio_id') else 'No'})")
                
            return data
        else:
            print(f"❌ Failed to get pending content: {response.status_code}")
            return None
    
    def approve_story(self, story_id):
        """Approve a story as admin"""
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.patch(f"{self.api_url}/admin/content/story/{story_id}/approve", 
                                headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Story {story_id} approved")
            return True
        else:
            print(f"❌ Story approval failed: {response.status_code}")
            try:
                print(f"   Error: {response.json()}")
            except:
                print(f"   Error: {response.text}")
            return False
    
    def check_story_status(self, story_id):
        """Check the current status of a story"""
        # Get all stories to find our specific story
        response = requests.get(f"{self.api_url}/stories?status=published")
        if response.status_code == 200:
            stories = response.json()
            for story in stories:
                if story['id'] == story_id:
                    print(f"📚 Story Status Check:")
                    print(f"   ID: {story['id']}")
                    print(f"   Title: {story['title']}")
                    print(f"   Status: {story['status']}")
                    print(f"   Audio ID: {story.get('audio_id', 'None')}")
                    return story
            print(f"❌ Story {story_id} not found in published stories")
        else:
            print(f"❌ Failed to get stories: {response.status_code}")
        return None
    
    def check_end_user_stories(self):
        """Check what stories end users can see"""
        headers = {'Authorization': f'Bearer {self.end_user_token}'}
        response = requests.get(f"{self.api_url}/stories", headers=headers)
        
        if response.status_code == 200:
            stories = response.json()
            print(f"👶 End User Story Library:")
            print(f"   Total stories visible: {len(stories)}")
            
            for story in stories:
                print(f"   📚 '{story['title']}' (Status: {story['status']}, Audio: {'Yes' if story.get('audio_id') else 'No'})")
                
            return stories
        else:
            print(f"❌ Failed to get end user stories: {response.status_code}")
            return []
    
    def create_narration_with_audio(self, story_id):
        """Create a narration with audio for the story"""
        headers = {'Authorization': f'Bearer {self.narrator_token}'}
        
        # Create sample audio file
        audio_data = b'\xff\xfb\x90' + b'\x00' * 2000  # Minimal MP3 header + data
        audio_file = io.BytesIO(audio_data)
        
        form_data = {
            "story_id": story_id,
            "text": "This is a test narration for the workflow story."
        }
        
        files = {
            "audio": ("workflow_narration.mp3", audio_file, "audio/mpeg")
        }
        
        response = requests.post(f"{self.api_url}/narrations", data=form_data, files=files, headers=headers)
        
        if response.status_code == 200:
            narration = response.json()['narration']
            print(f"✅ Narration created: {narration['id']}")
            print(f"   Audio ID: {narration.get('audio_id', 'None')}")
            print(f"   Status: {narration['status']}")
            return narration
        else:
            print(f"❌ Narration creation failed: {response.status_code}")
            try:
                print(f"   Error: {response.json()}")
            except:
                print(f"   Error: {response.text}")
            return None
    
    def approve_narration(self, narration_id):
        """Approve a narration as admin"""
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.patch(f"{self.api_url}/admin/content/narration/{narration_id}/approve", 
                                headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Narration {narration_id} approved")
            return True
        else:
            print(f"❌ Narration approval failed: {response.status_code}")
            try:
                print(f"   Error: {response.json()}")
            except:
                print(f"   Error: {response.text}")
            return False
    
    def test_audio_serving(self, audio_id):
        """Test if audio file can be served"""
        response = requests.get(f"{self.api_url}/audio/{audio_id}")
        
        if response.status_code == 200:
            print(f"✅ Audio {audio_id} served successfully")
            print(f"   Content-Type: {response.headers.get('content-type', 'Unknown')}")
            print(f"   Content-Length: {len(response.content)} bytes")
            return True
        else:
            print(f"❌ Audio serving failed: {response.status_code}")
            return False
    
    def run_complete_workflow_investigation(self):
        """Run the complete workflow investigation"""
        print("🔍 STORYBRIDGE WORKFLOW INVESTIGATION")
        print("=" * 60)
        
        # Step 1: Setup
        print("\n📋 Step 1: Setting up test environment...")
        if not self.login_admin():
            return False
            
        if not self.create_test_users():
            return False
        
        # Step 2: Create and submit story
        print("\n📝 Step 2: Creating and submitting story...")
        story = self.create_story_with_proper_tprs()
        if not story:
            return False
            
        story_id = story['id']
        
        if not self.submit_story_for_review(story_id):
            return False
        
        # Step 3: Check pending content
        print("\n📊 Step 3: Checking pending content...")
        pending_content = self.check_pending_content()
        if not pending_content:
            return False
        
        # Step 4: Approve story
        print("\n✅ Step 4: Approving story...")
        if not self.approve_story(story_id):
            return False
        
        # Step 5: Check story status after approval
        print("\n🔍 Step 5: Checking story status after approval...")
        approved_story = self.check_story_status(story_id)
        
        # Step 6: Check if end users can see the approved story
        print("\n👶 Step 6: Checking end user story library...")
        end_user_stories = self.check_end_user_stories()
        
        # Check if our approved story is visible to end users
        our_story_visible = any(s['id'] == story_id for s in end_user_stories)
        if our_story_visible:
            print(f"✅ Approved story IS visible to end users")
        else:
            print(f"❌ Approved story is NOT visible to end users")
        
        # Step 7: Create narration
        print("\n🎤 Step 7: Creating narration with audio...")
        narration = self.create_narration_with_audio(story_id)
        if not narration:
            return False
            
        narration_id = narration['id']
        
        # Step 8: Check pending narrations
        print("\n📊 Step 8: Checking pending narrations...")
        self.check_pending_content()
        
        # Step 9: Approve narration
        print("\n✅ Step 9: Approving narration...")
        if not self.approve_narration(narration_id):
            return False
        
        # Step 10: Check story status after narration approval
        print("\n🔍 Step 10: Checking story status after narration approval...")
        final_story = self.check_story_status(story_id)
        
        # Step 11: Check if story now has audio_id
        if final_story and final_story.get('audio_id'):
            print(f"✅ Story now has audio_id: {final_story['audio_id']}")
            
            # Test audio serving
            print("\n🔊 Step 12: Testing audio serving...")
            self.test_audio_serving(final_story['audio_id'])
        else:
            print(f"❌ Story does not have audio_id after narration approval")
        
        # Step 12: Final check - end user story library with audio
        print("\n👶 Step 13: Final check - end user stories with audio...")
        final_end_user_stories = self.check_end_user_stories()
        
        # Find our story in end user library
        our_final_story = next((s for s in final_end_user_stories if s['id'] == story_id), None)
        if our_final_story:
            if our_final_story.get('audio_id'):
                print(f"✅ SUCCESS: End users can see story with audio!")
            else:
                print(f"❌ ISSUE: End users can see story but it has no audio_id")
        else:
            print(f"❌ ISSUE: End users cannot see the approved story")
        
        print("\n" + "=" * 60)
        print("🏁 WORKFLOW INVESTIGATION COMPLETE")
        
        return True

def main():
    tester = WorkflowInvestigationTester()
    tester.run_complete_workflow_investigation()

if __name__ == "__main__":
    main()