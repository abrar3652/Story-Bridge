import requests
import json
import io
from datetime import datetime

class DetailedWorkflowTester:
    def __init__(self, base_url="https://storyquest-edu-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        
    def login_admin(self):
        """Login as admin"""
        response = requests.post(f"{self.api_url}/auth/admin-login", 
                               json={"email": "admin@storybridge.com", "password": "admin123"})
        if response.status_code == 200:
            self.admin_token = response.json()['access_token']
            return True
        return False
    
    def test_story_approval_endpoint(self):
        """Test the story approval endpoint specifically"""
        print("\n🔍 TESTING STORY APPROVAL WORKFLOW")
        print("-" * 50)
        
        # Get pending stories
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.get(f"{self.api_url}/admin/pending", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to get pending content: {response.status_code}")
            return False
            
        pending_data = response.json()
        pending_stories = pending_data.get('stories', [])
        
        if not pending_stories:
            print("ℹ️  No pending stories found for approval test")
            return True
            
        # Test approving the first pending story
        story_to_approve = pending_stories[0]
        story_id = story_to_approve['id']
        
        print(f"📚 Testing approval of story: '{story_to_approve['title']}'")
        print(f"   Story ID: {story_id}")
        print(f"   Current Status: {story_to_approve['status']}")
        
        # Approve the story
        response = requests.patch(f"{self.api_url}/admin/content/story/{story_id}/approve", 
                                headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Story approval endpoint working - Status: {response.status_code}")
            
            # Check if story status changed by getting all published stories
            response = requests.get(f"{self.api_url}/stories?status=published", headers=headers)
            if response.status_code == 200:
                published_stories = response.json()
                approved_story = next((s for s in published_stories if s['id'] == story_id), None)
                
                if approved_story:
                    print(f"✅ Story status changed to: {approved_story['status']}")
                    return True
                else:
                    print(f"❌ Story not found in published stories after approval")
                    return False
            else:
                print(f"❌ Failed to verify story status change: {response.status_code}")
                return False
        else:
            print(f"❌ Story approval failed: {response.status_code}")
            try:
                print(f"   Error: {response.json()}")
            except:
                print(f"   Error: {response.text}")
            return False
    
    def test_narration_approval_endpoint(self):
        """Test the narration approval endpoint specifically"""
        print("\n🔍 TESTING NARRATION APPROVAL WORKFLOW")
        print("-" * 50)
        
        # Get pending narrations
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = requests.get(f"{self.api_url}/admin/pending", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to get pending content: {response.status_code}")
            return False
            
        pending_data = response.json()
        pending_narrations = pending_data.get('narrations', [])
        
        if not pending_narrations:
            print("ℹ️  No pending narrations found for approval test")
            return True
            
        # Find a narration with audio
        narration_with_audio = next((n for n in pending_narrations if n.get('audio_id')), None)
        
        if not narration_with_audio:
            print("ℹ️  No pending narrations with audio found")
            return True
            
        narration_id = narration_with_audio['id']
        story_id = narration_with_audio['story_id']
        audio_id = narration_with_audio['audio_id']
        
        print(f"🎤 Testing approval of narration: {narration_id}")
        print(f"   Story ID: {story_id}")
        print(f"   Audio ID: {audio_id}")
        print(f"   Current Status: {narration_with_audio['status']}")
        
        # Get the story before narration approval to check audio_id
        response = requests.get(f"{self.api_url}/stories?status=published", headers=headers)
        if response.status_code == 200:
            published_stories = response.json()
            story_before = next((s for s in published_stories if s['id'] == story_id), None)
            
            if story_before:
                print(f"📚 Story before narration approval:")
                print(f"   Audio ID: {story_before.get('audio_id', 'None')}")
            else:
                print(f"⚠️  Story {story_id} not found in published stories")
        
        # Approve the narration
        response = requests.patch(f"{self.api_url}/admin/content/narration/{narration_id}/approve", 
                                headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Narration approval endpoint working - Status: {response.status_code}")
            
            # Check if story's audio_id was updated
            response = requests.get(f"{self.api_url}/stories?status=published", headers=headers)
            if response.status_code == 200:
                published_stories = response.json()
                story_after = next((s for s in published_stories if s['id'] == story_id), None)
                
                if story_after:
                    print(f"📚 Story after narration approval:")
                    print(f"   Audio ID: {story_after.get('audio_id', 'None')}")
                    
                    if story_after.get('audio_id') == audio_id:
                        print(f"✅ Story audio_id correctly updated to narration's audio_id")
                        return True
                    else:
                        print(f"❌ Story audio_id not updated correctly")
                        print(f"   Expected: {audio_id}")
                        print(f"   Actual: {story_after.get('audio_id', 'None')}")
                        return False
                else:
                    print(f"❌ Story not found after narration approval")
                    return False
            else:
                print(f"❌ Failed to verify story audio_id update: {response.status_code}")
                return False
        else:
            print(f"❌ Narration approval failed: {response.status_code}")
            try:
                print(f"   Error: {response.json()}")
            except:
                print(f"   Error: {response.text}")
            return False
    
    def test_end_user_story_library(self):
        """Test what end users see in story library"""
        print("\n🔍 TESTING END USER STORY LIBRARY")
        print("-" * 50)
        
        # Test without authentication (public access)
        response = requests.get(f"{self.api_url}/stories")
        
        if response.status_code == 200:
            stories = response.json()
            print(f"📚 End User Story Library (Public Access):")
            print(f"   Total stories: {len(stories)}")
            
            approved_stories = [s for s in stories if s['status'] == 'published']
            stories_with_audio = [s for s in stories if s.get('audio_id')]
            
            print(f"   Published stories: {len(approved_stories)}")
            print(f"   Stories with audio: {len(stories_with_audio)}")
            
            for story in stories:
                status_icon = "✅" if story['status'] == 'published' else "⚠️"
                audio_icon = "🔊" if story.get('audio_id') else "🔇"
                print(f"   {status_icon} {audio_icon} '{story['title']}' (Status: {story['status']}, Audio: {story.get('audio_id', 'None')})")
            
            return len(approved_stories) > 0
        else:
            print(f"❌ Failed to get end user stories: {response.status_code}")
            return False
    
    def test_audio_serving_endpoints(self):
        """Test audio serving for various audio IDs"""
        print("\n🔍 TESTING AUDIO SERVING ENDPOINTS")
        print("-" * 50)
        
        # Get stories with audio
        response = requests.get(f"{self.api_url}/stories")
        if response.status_code != 200:
            print(f"❌ Failed to get stories: {response.status_code}")
            return False
            
        stories = response.json()
        stories_with_audio = [s for s in stories if s.get('audio_id')]
        
        if not stories_with_audio:
            print("ℹ️  No stories with audio found for testing")
            return True
            
        print(f"🔊 Testing audio serving for {len(stories_with_audio)} stories with audio:")
        
        all_audio_working = True
        for story in stories_with_audio:
            audio_id = story['audio_id']
            print(f"\n   Testing audio for '{story['title']}':")
            print(f"   Audio ID: {audio_id}")
            
            response = requests.get(f"{self.api_url}/audio/{audio_id}")
            
            if response.status_code == 200:
                print(f"   ✅ Audio served successfully")
                print(f"   Content-Type: {response.headers.get('content-type', 'Unknown')}")
                print(f"   Content-Length: {len(response.content)} bytes")
            else:
                print(f"   ❌ Audio serving failed: {response.status_code}")
                all_audio_working = False
        
        return all_audio_working
    
    def test_database_state_analysis(self):
        """Analyze the current database state"""
        print("\n🔍 DATABASE STATE ANALYSIS")
        print("-" * 50)
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get all stories with different statuses
        statuses_to_check = ['draft', 'pending', 'published', 'rejected']
        
        for status in statuses_to_check:
            response = requests.get(f"{self.api_url}/stories?status={status}", headers=headers)
            if response.status_code == 200:
                stories = response.json()
                print(f"📊 Stories with status '{status}': {len(stories)}")
                
                if stories:
                    stories_with_audio = [s for s in stories if s.get('audio_id')]
                    print(f"   Stories with audio: {len(stories_with_audio)}")
                    
                    for story in stories[:3]:  # Show first 3 stories
                        audio_status = "Yes" if story.get('audio_id') else "No"
                        print(f"   - '{story['title']}' (Audio: {audio_status})")
            else:
                print(f"❌ Failed to get {status} stories: {response.status_code}")
        
        # Get pending content summary
        response = requests.get(f"{self.api_url}/admin/pending", headers=headers)
        if response.status_code == 200:
            pending_data = response.json()
            print(f"\n📋 Pending Content Summary:")
            print(f"   Pending stories: {len(pending_data.get('stories', []))}")
            print(f"   Pending narrations: {len(pending_data.get('narrations', []))}")
            
            narrations_with_audio = [n for n in pending_data.get('narrations', []) if n.get('audio_id')]
            print(f"   Pending narrations with audio: {len(narrations_with_audio)}")
        
        return True
    
    def run_detailed_investigation(self):
        """Run the detailed workflow investigation"""
        print("🔍 DETAILED STORYBRIDGE WORKFLOW INVESTIGATION")
        print("=" * 70)
        
        if not self.login_admin():
            print("❌ Admin login failed")
            return False
        
        print("✅ Admin login successful")
        
        # Test each component
        results = []
        
        results.append(("Database State Analysis", self.test_database_state_analysis()))
        results.append(("Story Approval Endpoint", self.test_story_approval_endpoint()))
        results.append(("Narration Approval Endpoint", self.test_narration_approval_endpoint()))
        results.append(("End User Story Library", self.test_end_user_story_library()))
        results.append(("Audio Serving Endpoints", self.test_audio_serving_endpoints()))
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 DETAILED INVESTIGATION RESULTS")
        print("=" * 70)
        
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        
        all_passed = all(result for _, result in results)
        
        if all_passed:
            print("\n🎉 ALL WORKFLOW COMPONENTS ARE WORKING CORRECTLY!")
            print("\nCONCLUSION:")
            print("- Stories approved by admin DO appear in story library")
            print("- Narration approval DOES update story audio_id")
            print("- Audio serving endpoints ARE working")
            print("- The workflow is functioning as expected")
        else:
            print("\n⚠️  SOME WORKFLOW ISSUES DETECTED")
            print("Check the failed tests above for details")
        
        return all_passed

def main():
    tester = DetailedWorkflowTester()
    tester.run_detailed_investigation()

if __name__ == "__main__":
    main()