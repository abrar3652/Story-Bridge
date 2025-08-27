#!/usr/bin/env python3
"""
StoryBridge Audio Functionality Test
Specifically tests the audio playback issue mentioned in the review request.
"""

import requests
import sys
import json
from datetime import datetime

class AudioTester:
    def __init__(self, base_url="https://storyquest-edu-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user = None
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}")
        if details:
            print(f"   {details}")

    def test_user_signup_login(self):
        """Create a test user and login"""
        timestamp = datetime.now().strftime('%H%M%S')
        email = f'audio_test_user_{timestamp}@example.com'
        password = 'testpass123'
        
        # Signup
        try:
            response = requests.post(f"{self.api_url}/auth/signup", json={
                "email": email,
                "password": password,
                "role": "end_user"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data['access_token']
                self.user = data['user']
                self.log_test("User signup", True, f"Created user: {email}")
                return True
            else:
                self.log_test("User signup", False, f"Status: {response.status_code}, Error: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User signup", False, f"Exception: {str(e)}")
            return False

    def test_get_stories(self):
        """Get published stories and check for audio information"""
        try:
            headers = {'Authorization': f'Bearer {self.token}'} if self.token else {}
            response = requests.get(f"{self.api_url}/stories", headers=headers)
            
            if response.status_code == 200:
                stories = response.json()
                self.log_test("Get stories", True, f"Found {len(stories)} stories")
                
                # Look for "Brave Little Sparrow" specifically
                brave_sparrow = None
                stories_with_audio = []
                
                for story in stories:
                    if story.get('audio_id'):
                        stories_with_audio.append(story)
                    
                    if 'brave' in story.get('title', '').lower() and 'sparrow' in story.get('title', '').lower():
                        brave_sparrow = story
                        print(f"   🎯 Found 'Brave Little Sparrow': {story['title']}")
                        print(f"      - ID: {story['id']}")
                        print(f"      - Status: {story.get('status', 'unknown')}")
                        print(f"      - Audio ID: {story.get('audio_id', 'None')}")
                        print(f"      - Language: {story.get('language', 'unknown')}")
                
                print(f"   📊 Stories with audio: {len(stories_with_audio)}")
                for story in stories_with_audio:
                    print(f"      - '{story['title']}' (audio_id: {story['audio_id']})")
                
                # Store for further testing
                self.stories = stories
                self.brave_sparrow = brave_sparrow
                
                return True
            else:
                self.log_test("Get stories", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get stories", False, f"Exception: {str(e)}")
            return False

    def test_audio_endpoint_direct(self, audio_id):
        """Test the audio endpoint directly"""
        try:
            audio_url = f"{self.api_url}/audio/{audio_id}"
            print(f"   Testing audio URL: {audio_url}")
            
            response = requests.get(audio_url)
            
            if response.status_code == 200:
                content_type = response.headers.get('Content-Type', '')
                content_length = len(response.content)
                
                self.log_test(f"Audio endpoint (ID: {audio_id})", True, 
                             f"Content-Type: {content_type}, Size: {content_length} bytes")
                
                # Check if it's actually audio content
                if content_type.startswith('audio/'):
                    print(f"   ✅ Valid audio content type: {content_type}")
                else:
                    print(f"   ⚠️  Unexpected content type: {content_type}")
                
                # Check if content is not empty
                if content_length > 0:
                    print(f"   ✅ Audio file has content: {content_length} bytes")
                else:
                    print(f"   ❌ Audio file is empty")
                
                return True
            else:
                self.log_test(f"Audio endpoint (ID: {audio_id})", False, 
                             f"Status: {response.status_code}, Error: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(f"Audio endpoint (ID: {audio_id})", False, f"Exception: {str(e)}")
            return False

    def test_all_audio_files(self):
        """Test all audio files found in stories"""
        if not hasattr(self, 'stories'):
            print("❌ No stories available for audio testing")
            return False
        
        audio_stories = [s for s in self.stories if s.get('audio_id')]
        
        if not audio_stories:
            self.log_test("Audio files test", False, "No stories with audio_id found")
            return False
        
        print(f"\n🔊 Testing {len(audio_stories)} audio files...")
        
        all_passed = True
        for story in audio_stories:
            audio_id = story['audio_id']
            title = story['title']
            print(f"\n   Testing audio for: '{title}'")
            
            if not self.test_audio_endpoint_direct(audio_id):
                all_passed = False
        
        return all_passed

    def test_brave_sparrow_specifically(self):
        """Test the Brave Little Sparrow story specifically"""
        if not hasattr(self, 'brave_sparrow') or not self.brave_sparrow:
            self.log_test("Brave Little Sparrow test", False, "Story not found")
            return False
        
        story = self.brave_sparrow
        print(f"\n🐦 Testing Brave Little Sparrow specifically...")
        print(f"   Title: {story['title']}")
        print(f"   Status: {story.get('status', 'unknown')}")
        print(f"   Audio ID: {story.get('audio_id', 'None')}")
        
        if not story.get('audio_id'):
            self.log_test("Brave Little Sparrow audio", False, "No audio_id found")
            return False
        
        # Test the audio endpoint
        return self.test_audio_endpoint_direct(story['audio_id'])

    def test_cors_and_headers(self, audio_id):
        """Test CORS and headers for audio endpoint"""
        try:
            audio_url = f"{self.api_url}/audio/{audio_id}"
            
            # Test with OPTIONS request (CORS preflight)
            options_response = requests.options(audio_url)
            print(f"   OPTIONS request status: {options_response.status_code}")
            
            # Test GET request and check headers
            response = requests.get(audio_url)
            
            if response.status_code == 200:
                headers = response.headers
                print(f"   Response headers:")
                for key, value in headers.items():
                    if key.lower() in ['content-type', 'content-disposition', 'accept-ranges', 'cache-control', 'access-control-allow-origin']:
                        print(f"      {key}: {value}")
                
                # Check for CORS headers
                cors_origin = headers.get('Access-Control-Allow-Origin')
                if cors_origin:
                    print(f"   ✅ CORS enabled: {cors_origin}")
                else:
                    print(f"   ⚠️  No CORS headers found")
                
                return True
            else:
                self.log_test("CORS and headers test", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("CORS and headers test", False, f"Exception: {str(e)}")
            return False

    def run_comprehensive_audio_test(self):
        """Run all audio-related tests"""
        print("🎵 StoryBridge Audio Functionality Test")
        print("=" * 50)
        
        # Step 1: Create user and login
        print("\n1️⃣ Setting up test user...")
        if not self.test_user_signup_login():
            print("❌ Cannot proceed without user authentication")
            return False
        
        # Step 2: Get stories and check audio information
        print("\n2️⃣ Fetching stories and checking audio information...")
        if not self.test_get_stories():
            print("❌ Cannot proceed without story data")
            return False
        
        # Step 3: Test Brave Little Sparrow specifically
        print("\n3️⃣ Testing Brave Little Sparrow story...")
        brave_sparrow_success = self.test_brave_sparrow_specifically()
        
        # Step 4: Test all audio files
        print("\n4️⃣ Testing all audio files...")
        all_audio_success = self.test_all_audio_files()
        
        # Step 5: Test CORS and headers if we have audio
        if hasattr(self, 'brave_sparrow') and self.brave_sparrow and self.brave_sparrow.get('audio_id'):
            print("\n5️⃣ Testing CORS and headers...")
            self.test_cors_and_headers(self.brave_sparrow['audio_id'])
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if brave_sparrow_success:
            print("✅ Brave Little Sparrow audio test PASSED")
        else:
            print("❌ Brave Little Sparrow audio test FAILED")
        
        return brave_sparrow_success and all_audio_success

def main():
    tester = AudioTester()
    
    success = tester.run_comprehensive_audio_test()
    
    if success:
        print("\n🎉 All audio tests passed! Audio functionality is working.")
        return 0
    else:
        print("\n💥 Audio tests failed! There are issues with audio functionality.")
        return 1

if __name__ == "__main__":
    sys.exit(main())