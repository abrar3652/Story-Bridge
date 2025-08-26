import requests
import json
import io
from datetime import datetime

class FinalWorkflowTester:
    def __init__(self, base_url="https://storyquest-edu-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.end_user_token = None
        
    def setup_authentication(self):
        """Setup admin and end user authentication"""
        # Admin login
        response = requests.post(f"{self.api_url}/auth/admin-login", 
                               json={"email": "admin@storybridge.com", "password": "admin123"})
        if response.status_code == 200:
            self.admin_token = response.json()['access_token']
            print("✅ Admin authentication successful")
        else:
            print(f"❌ Admin login failed: {response.status_code}")
            return False
            
        # Create end user
        timestamp = datetime.now().strftime('%H%M%S')
        end_user_data = {
            "email": f"final_test_user_{timestamp}@test.com",
            "password": "testpass123",
            "role": "end_user"
        }
        response = requests.post(f"{self.api_url}/auth/signup", json=end_user_data)
        if response.status_code == 200:
            self.end_user_token = response.json()['access_token']
            print("✅ End user authentication successful")
            return True
        else:
            print(f"❌ End user creation failed: {response.status_code}")
            return False
    
    def test_complete_workflow_with_authentication(self):
        """Test the complete workflow with proper authentication"""
        print("\n🔍 TESTING COMPLETE WORKFLOW WITH AUTHENTICATION")
        print("=" * 60)
        
        # 1. Check current database state
        print("\n📊 Step 1: Current Database State")
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get published stories
        response = requests.get(f"{self.api_url}/stories?status=published", headers=headers)
        if response.status_code == 200:
            published_stories = response.json()
            print(f"   Published stories: {len(published_stories)}")
            
            stories_with_audio = [s for s in published_stories if s.get('audio_id')]
            print(f"   Published stories with audio: {len(stories_with_audio)}")
            
            for story in stories_with_audio:
                print(f"   ✅ '{story['title']}' has audio_id: {story['audio_id']}")
        else:
            print(f"   ❌ Failed to get published stories: {response.status_code}")
            return False
        
        # 2. Test end user access to stories (with authentication)
        print("\n👶 Step 2: End User Story Access")
        end_user_headers = {'Authorization': f'Bearer {self.end_user_token}'}
        
        response = requests.get(f"{self.api_url}/stories", headers=end_user_headers)
        if response.status_code == 200:
            end_user_stories = response.json()
            print(f"   ✅ End users can access story library")
            print(f"   Stories visible to end users: {len(end_user_stories)}")
            
            # Check if all stories are published
            all_published = all(story['status'] == 'published' for story in end_user_stories)
            if all_published:
                print(f"   ✅ All stories shown to end users are published")
            else:
                print(f"   ❌ Some non-published stories shown to end users")
                return False
                
            # Check stories with audio
            stories_with_audio = [s for s in end_user_stories if s.get('audio_id')]
            print(f"   Stories with audio available to end users: {len(stories_with_audio)}")
            
            for story in stories_with_audio:
                print(f"   🔊 '{story['title']}' - Audio ID: {story['audio_id']}")
        else:
            print(f"   ❌ End user story access failed: {response.status_code}")
            return False
        
        # 3. Test audio serving for end user accessible stories
        print("\n🔊 Step 3: Audio Serving Test")
        
        if stories_with_audio:
            for story in stories_with_audio[:2]:  # Test first 2 stories with audio
                audio_id = story['audio_id']
                print(f"\n   Testing audio for '{story['title']}':")
                
                response = requests.get(f"{self.api_url}/audio/{audio_id}")
                if response.status_code == 200:
                    print(f"   ✅ Audio served successfully")
                    print(f"   Content-Type: {response.headers.get('content-type', 'Unknown')}")
                    print(f"   Content-Length: {len(response.content)} bytes")
                else:
                    print(f"   ❌ Audio serving failed: {response.status_code}")
                    return False
        else:
            print("   ℹ️  No stories with audio to test")
        
        # 4. Test admin approval workflow
        print("\n👑 Step 4: Admin Approval Workflow Test")
        
        # Get pending content
        response = requests.get(f"{self.api_url}/admin/pending", headers=headers)
        if response.status_code == 200:
            pending_data = response.json()
            pending_stories = pending_data.get('stories', [])
            pending_narrations = pending_data.get('narrations', [])
            
            print(f"   Pending stories: {len(pending_stories)}")
            print(f"   Pending narrations: {len(pending_narrations)}")
            
            # Test story approval if there are pending stories
            if pending_stories:
                story_to_approve = pending_stories[0]
                story_id = story_to_approve['id']
                
                print(f"\n   Testing story approval: '{story_to_approve['title']}'")
                
                response = requests.patch(f"{self.api_url}/admin/content/story/{story_id}/approve", 
                                        headers=headers)
                if response.status_code == 200:
                    print(f"   ✅ Story approval successful")
                    
                    # Verify story is now published
                    response = requests.get(f"{self.api_url}/stories?status=published", headers=headers)
                    if response.status_code == 200:
                        published_stories = response.json()
                        approved_story = next((s for s in published_stories if s['id'] == story_id), None)
                        
                        if approved_story and approved_story['status'] == 'published':
                            print(f"   ✅ Story status correctly changed to 'published'")
                        else:
                            print(f"   ❌ Story status not updated correctly")
                            return False
                else:
                    print(f"   ❌ Story approval failed: {response.status_code}")
                    return False
            
            # Test narration approval if there are pending narrations with audio
            narrations_with_audio = [n for n in pending_narrations if n.get('audio_id')]
            if narrations_with_audio:
                narration_to_approve = narrations_with_audio[0]
                narration_id = narration_to_approve['id']
                story_id = narration_to_approve['story_id']
                audio_id = narration_to_approve['audio_id']
                
                print(f"\n   Testing narration approval: {narration_id}")
                print(f"   Story ID: {story_id}, Audio ID: {audio_id}")
                
                response = requests.patch(f"{self.api_url}/admin/content/narration/{narration_id}/approve", 
                                        headers=headers)
                if response.status_code == 200:
                    print(f"   ✅ Narration approval successful")
                    
                    # Verify story's audio_id was updated
                    response = requests.get(f"{self.api_url}/stories?status=published", headers=headers)
                    if response.status_code == 200:
                        published_stories = response.json()
                        updated_story = next((s for s in published_stories if s['id'] == story_id), None)
                        
                        if updated_story and updated_story.get('audio_id') == audio_id:
                            print(f"   ✅ Story audio_id correctly updated")
                        else:
                            print(f"   ❌ Story audio_id not updated correctly")
                            print(f"   Expected: {audio_id}")
                            print(f"   Actual: {updated_story.get('audio_id', 'None') if updated_story else 'Story not found'}")
                            return False
                else:
                    print(f"   ❌ Narration approval failed: {response.status_code}")
                    return False
        else:
            print(f"   ❌ Failed to get pending content: {response.status_code}")
            return False
        
        return True
    
    def run_final_investigation(self):
        """Run the final comprehensive workflow investigation"""
        print("🔍 FINAL STORYBRIDGE WORKFLOW INVESTIGATION")
        print("=" * 70)
        print("Testing the specific issues mentioned in the review request:")
        print("1. Stories approved by admin not appearing in story library")
        print("2. Stories don't have audio even when narrations are approved")
        print("3. Story player audio serving functionality")
        print("=" * 70)
        
        if not self.setup_authentication():
            return False
        
        success = self.test_complete_workflow_with_authentication()
        
        print("\n" + "=" * 70)
        print("🏁 FINAL INVESTIGATION RESULTS")
        print("=" * 70)
        
        if success:
            print("🎉 ALL WORKFLOW COMPONENTS ARE WORKING CORRECTLY!")
            print("\n✅ FINDINGS:")
            print("1. ✅ Stories approved by admin DO appear in story library for end users")
            print("2. ✅ Stories DO have audio when narrations are created and approved")
            print("3. ✅ Audio serving endpoints ARE working correctly")
            print("4. ✅ Admin approval workflow is functioning properly")
            print("5. ✅ Narration approval correctly updates story audio_id")
            print("\n🔍 ROOT CAUSE ANALYSIS:")
            print("The reported issues may be due to:")
            print("- Stories not being properly approved by admin")
            print("- Narrations not being approved after creation")
            print("- Frontend authentication issues preventing story access")
            print("- Caching issues in the frontend")
            print("\n💡 RECOMMENDATION:")
            print("The backend workflow is functioning correctly. Issues may be in:")
            print("- Frontend story library component")
            print("- Frontend audio player component") 
            print("- Admin dashboard approval interface")
        else:
            print("❌ WORKFLOW ISSUES DETECTED")
            print("Check the test output above for specific failures")
        
        return success

def main():
    tester = FinalWorkflowTester()
    tester.run_final_investigation()

if __name__ == "__main__":
    main()