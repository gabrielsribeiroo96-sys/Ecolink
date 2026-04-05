#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid
import time

class EcolinkE2ETester:
    def __init__(self, base_url="https://reversa-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.restaurant_session = requests.Session()
        self.collector_session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.restaurant_email = None
        self.collector_email = None
        self.publication_id = None
        self.collection_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        return success

    def run_test(self, name, method, endpoint, expected_status, data=None, session=None):
        """Run a single API test"""
        if session is None:
            session = self.session
            
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = session.get(url, headers=headers)
            elif method == 'POST':
                response = session.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                try:
                    return self.log_test(name, True), response.json()
                except:
                    return self.log_test(name, True), {}
            else:
                return self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}"), {}

        except Exception as e:
            return self.log_test(name, False, f"Exception: {str(e)}"), {}

    def test_e2e_flow(self):
        """Test complete end-to-end flow"""
        print("\n🔄 Testing Complete End-to-End Flow...")
        
        # Step 1: Create restaurant account
        timestamp = str(int(time.time()))
        self.restaurant_email = f"restaurant_e2e_{timestamp}@test.com"
        
        success, response = self.run_test(
            "E2E: Restaurant Registration",
            "POST",
            "auth/register",
            200,
            {
                "email": self.restaurant_email,
                "password": "test123",
                "name": "E2E Test Restaurant",
                "role": "restaurant",
                "address": "Test Address 123",
                "latitude": -23.5505,
                "longitude": -46.6333
            },
            self.restaurant_session
        )
        
        if not success:
            print("❌ E2E Flow stopped - Restaurant registration failed")
            return
            
        # Step 2: Create collector account
        self.collector_email = f"collector_e2e_{timestamp}@test.com"
        
        success, response = self.run_test(
            "E2E: Collector Registration",
            "POST",
            "auth/register",
            200,
            {
                "email": self.collector_email,
                "password": "test123",
                "name": "E2E Test Collector",
                "role": "collector",
                "address": "Collector Address 456"
            },
            self.collector_session
        )
        
        if not success:
            print("❌ E2E Flow stopped - Collector registration failed")
            return
            
        # Step 3: Restaurant publishes oil
        success, response = self.run_test(
            "E2E: Restaurant Publishes Oil",
            "POST",
            "restaurants/publish-oil",
            200,
            {
                "volume_liters": 30.0,
                "latitude": -23.5505,
                "longitude": -46.6333
            },
            self.restaurant_session
        )
        
        if success and 'publication_id' in response:
            self.publication_id = response['publication_id']
            print(f"   📍 Publication ID: {self.publication_id}")
        else:
            print("❌ E2E Flow stopped - Oil publication failed")
            return
            
        # Step 4: Collector checks available points
        success, response = self.run_test(
            "E2E: Collector Views Available Points",
            "GET",
            "collectors/available-points",
            200,
            session=self.collector_session
        )
        
        available_points = response if success else []
        found_publication = any(p.get('publication_id') == self.publication_id for p in available_points)
        
        if found_publication:
            print(f"   ✅ Published oil found in available points")
        else:
            print(f"   ❌ Published oil not found in available points")
            
        # Step 5: Collector schedules collection
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        success, response = self.run_test(
            "E2E: Collector Schedules Collection",
            "POST",
            "collectors/schedule-collection",
            200,
            {
                "publication_ids": [self.publication_id],
                "scheduled_date": tomorrow
            },
            self.collector_session
        )
        
        if success and 'collection_ids' in response and response['collection_ids']:
            self.collection_id = response['collection_ids'][0]
            print(f"   📅 Collection ID: {self.collection_id}")
        else:
            print("❌ E2E Flow stopped - Collection scheduling failed")
            return
            
        # Step 6: Check restaurant stats (should still be 0 since not collected yet)
        success, response = self.run_test(
            "E2E: Restaurant Stats Before Collection",
            "GET",
            "restaurants/impact-stats",
            200,
            session=self.restaurant_session
        )
        
        if success:
            stats = response
            print(f"   📊 Stats before collection: {stats['total_oil_collected_liters']}L collected, {stats['collections_count']} collections")
            
        # Step 7: Collector confirms collection
        success, response = self.run_test(
            "E2E: Collector Confirms Collection",
            "POST",
            "collectors/confirm-collection",
            200,
            {
                "collection_id": self.collection_id,
                "collected_volume": 28.5  # Slightly less than scheduled
            },
            self.collector_session
        )
        
        if not success:
            print("❌ E2E Flow stopped - Collection confirmation failed")
            return
            
        # Step 8: Check restaurant stats (should now show collected oil)
        success, response = self.run_test(
            "E2E: Restaurant Stats After Collection",
            "GET",
            "restaurants/impact-stats",
            200,
            session=self.restaurant_session
        )
        
        if success:
            stats = response
            print(f"   📊 Stats after collection: {stats['total_oil_collected_liters']}L collected, {stats['collections_count']} collections")
            
            # Verify stats updated correctly
            if stats['total_oil_collected_liters'] == 28.5 and stats['collections_count'] == 1:
                print("   ✅ Restaurant stats updated correctly!")
            else:
                print(f"   ❌ Restaurant stats not updated correctly. Expected 28.5L and 1 collection")
                
        # Step 9: Check collector's collections
        success, response = self.run_test(
            "E2E: Collector Views Collections",
            "GET",
            "collectors/my-collections",
            200,
            session=self.collector_session
        )
        
        if success:
            collections = response
            completed_collections = [c for c in collections if c.get('status') == 'completed']
            print(f"   📋 Collector has {len(completed_collections)} completed collections")
            
        print("\n🎉 End-to-End Flow Test Completed!")

    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting Ecolink End-to-End Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        
        self.test_e2e_flow()
        
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All E2E tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = EcolinkE2ETester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())