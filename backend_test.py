#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class EcolinkAPITester:
    def __init__(self, base_url="https://reversa-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.restaurant_user = None
        self.collector_user = None
        self.admin_user = None
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

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

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

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            {"email": "admin@ecolink.com", "password": "admin123"}
        )
        if success:
            self.admin_user = response
        
        # Test restaurant registration
        restaurant_email = f"restaurant_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Restaurant Registration",
            "POST",
            "auth/register",
            200,
            {
                "email": restaurant_email,
                "password": "test123",
                "name": "Test Restaurant",
                "role": "restaurant",
                "address": "Test Address 123",
                "cnpj_cpf": "12345678901",
                "contact": "(11) 99999-9999",
                "latitude": -23.5505,
                "longitude": -46.6333
            }
        )
        if success:
            self.restaurant_user = response
            
        # Test collector registration
        collector_email = f"collector_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Collector Registration",
            "POST",
            "auth/register",
            200,
            {
                "email": collector_email,
                "password": "test123",
                "name": "Test Collector",
                "role": "collector",
                "address": "Collector Address 456",
                "cnpj_cpf": "98765432100",
                "contact": "(11) 88888-8888"
            }
        )
        if success:
            self.collector_user = response
            
        # Test /auth/me endpoint
        self.run_test("Get Current User", "GET", "auth/me", 200)
        
        # Test duplicate email registration
        self.run_test(
            "Duplicate Email Registration",
            "POST",
            "auth/register",
            400,
            {
                "email": restaurant_email,
                "password": "test123",
                "name": "Duplicate Restaurant",
                "role": "restaurant"
            }
        )
        
        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            {"email": "invalid@test.com", "password": "wrongpass"}
        )

    def test_restaurant_endpoints(self):
        """Test restaurant-specific endpoints"""
        print("\n🍽️ Testing Restaurant Endpoints...")
        
        if not self.restaurant_user:
            print("❌ Skipping restaurant tests - no restaurant user available")
            return
            
        # Login as restaurant
        restaurant_email = self.restaurant_user.get('email')
        success, _ = self.run_test(
            "Restaurant Login",
            "POST",
            "auth/login",
            200,
            {"email": restaurant_email, "password": "test123"}
        )
        
        if not success:
            print("❌ Skipping restaurant tests - login failed")
            return
            
        # Test publish oil (minimum volume)
        success, response = self.run_test(
            "Publish Oil (Valid Volume)",
            "POST",
            "restaurants/publish-oil",
            200,
            {
                "volume_liters": 15.5,
                "latitude": -23.5505,
                "longitude": -46.6333
            }
        )
        if success and 'publication_id' in response:
            self.publication_id = response['publication_id']
            
        # Test publish oil (invalid volume - below minimum)
        self.run_test(
            "Publish Oil (Invalid Volume)",
            "POST",
            "restaurants/publish-oil",
            422,  # Validation error expected
            {
                "volume_liters": 5.0,  # Below minimum
                "latitude": -23.5505,
                "longitude": -46.6333
            }
        )
        
        # Test get impact stats
        self.run_test("Get Impact Stats", "GET", "restaurants/impact-stats", 200)
        
        # Test get volume history
        self.run_test("Get Volume History", "GET", "restaurants/volume-history", 200)

    def test_collector_endpoints(self):
        """Test collector-specific endpoints"""
        print("\n🚛 Testing Collector Endpoints...")
        
        if not self.collector_user:
            print("❌ Skipping collector tests - no collector user available")
            return
            
        # Login as collector
        collector_email = self.collector_user.get('email')
        success, _ = self.run_test(
            "Collector Login",
            "POST",
            "auth/login",
            200,
            {"email": collector_email, "password": "test123"}
        )
        
        if not success:
            print("❌ Skipping collector tests - login failed")
            return
            
        # Test get available points
        success, response = self.run_test("Get Available Points", "GET", "collectors/available-points", 200)
        available_points = response if success else []
        
        # Test schedule collection (if we have publication)
        if self.publication_id:
            tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
            success, response = self.run_test(
                "Schedule Collection",
                "POST",
                "collectors/schedule-collection",
                200,
                {
                    "publication_ids": [self.publication_id],
                    "scheduled_date": tomorrow
                }
            )
            if success and 'collection_ids' in response and response['collection_ids']:
                self.collection_id = response['collection_ids'][0]
        
        # Test get my collections
        success, response = self.run_test("Get My Collections", "GET", "collectors/my-collections", 200)
        collections = response if success else []
        
        # Test confirm collection (if we have collection)
        if self.collection_id:
            self.run_test(
                "Confirm Collection",
                "POST",
                "collectors/confirm-collection",
                200,
                {
                    "collection_id": self.collection_id,
                    "collected_volume": 15.0
                }
            )

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n🔒 Testing Role-Based Access Control...")
        
        # Login as restaurant
        if self.restaurant_user:
            restaurant_email = self.restaurant_user.get('email')
            self.run_test(
                "Restaurant Login for Access Test",
                "POST",
                "auth/login",
                200,
                {"email": restaurant_email, "password": "test123"}
            )
            
            # Restaurant trying to access collector endpoints
            self.run_test(
                "Restaurant Access to Collector Endpoint (Should Fail)",
                "GET",
                "collectors/available-points",
                403
            )
        
        # Login as collector
        if self.collector_user:
            collector_email = self.collector_user.get('email')
            self.run_test(
                "Collector Login for Access Test",
                "POST",
                "auth/login",
                200,
                {"email": collector_email, "password": "test123"}
            )
            
            # Collector trying to access restaurant endpoints
            self.run_test(
                "Collector Access to Restaurant Endpoint (Should Fail)",
                "GET",
                "restaurants/impact-stats",
                403
            )

    def test_logout(self):
        """Test logout functionality"""
        print("\n🚪 Testing Logout...")
        
        # Test logout
        self.run_test("Logout", "POST", "auth/logout", 200)
        
        # Test accessing protected endpoint after logout
        self.run_test(
            "Access Protected Endpoint After Logout",
            "GET",
            "auth/me",
            401
        )

    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting Ecolink API Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        
        self.test_auth_endpoints()
        self.test_restaurant_endpoints()
        self.test_collector_endpoints()
        self.test_role_based_access()
        self.test_logout()
        
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = EcolinkAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())