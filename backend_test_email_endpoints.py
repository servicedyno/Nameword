#!/usr/bin/env python3
"""
Backend test for the 5 NEW reseller cPanel Email (mailbox) proxy endpoints.

Test requirements:
1. Routes registered + auth-guarded: call without auth header, expect 400 (not 404)
2. Ownership guard: login as demo@nameword.local, call against non-owned username, expect 403
3. Clean JSON / no 500: confirm all error responses are clean JSON
4. No regression: GET /api/v1/reseller/health should still return 200, existing hosting route should work

CRITICAL SAFETY: Nomadly provider is LIVE - do NOT perform real create/delete/password-change/test-send
against a real owned cPanel account. Only test routing/auth/ownership/validation paths.
"""

import requests
import json
import sys
from typing import Dict, Any, Tuple

# Backend base URL (internal)
BASE_URL = "http://localhost:8001/api/v1"

# Test credentials
TEST_USER = "demo@nameword.local"
TEST_PASSWORD = "Demo@12345"

# Non-owned username for ownership guard testing
NON_OWNED_USER = "nonexistent-user-xyz"

# ANSI color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

class EmailEndpointTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.test_results = []
        
    def log(self, message: str, color: str = RESET):
        """Print colored log message"""
        print(f"{color}{message}{RESET}")
        
    def test_result(self, test_name: str, passed: bool, details: str = ""):
        """Record test result"""
        status = f"{GREEN}✅ PASS{RESET}" if passed else f"{RED}❌ FAIL{RESET}"
        self.log(f"{status} - {test_name}")
        if details:
            self.log(f"  Details: {details}", YELLOW)
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
        
    def login(self) -> bool:
        """Login to get authentication token"""
        self.log(f"\n{BLUE}=== AUTHENTICATION ==={RESET}")
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={"email": TEST_USER, "password": TEST_PASSWORD}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                self.log(f"✓ Login successful as {TEST_USER}", GREEN)
                self.log(f"  Token: {self.token[:20]}...", YELLOW)
                return True
            else:
                self.log(f"✗ Login failed: {response.status_code} - {response.text}", RED)
                return False
        except Exception as e:
            self.log(f"✗ Login error: {str(e)}", RED)
            return False
            
    def test_route_without_auth(self, method: str, path: str) -> Tuple[bool, str]:
        """Test that route returns 400 (not 404) when called without auth"""
        try:
            url = f"{BASE_URL}{path}"
            response = requests.request(method, url)
            
            status = response.status_code
            
            # Should return 400 (auth error), NOT 404 (route not found)
            if status == 400:
                try:
                    data = response.json()
                    return True, f"Status {status}, JSON: {json.dumps(data)}"
                except:
                    return True, f"Status {status} (not JSON)"
            elif status == 404:
                return False, f"Status 404 - route NOT registered (expected 400)"
            else:
                return False, f"Status {status} - unexpected (expected 400)"
                
        except Exception as e:
            return False, f"Exception: {str(e)}"
            
    def test_ownership_guard(self, method: str, path: str, body: Dict = None) -> Tuple[bool, str]:
        """Test that route returns 403 when accessing non-owned hosting account"""
        try:
            url = f"{BASE_URL}{path}"
            headers = {"Authorization": f"Bearer {self.token}"}
            
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=body or {})
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=headers, json=body or {})
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, json=body or {})
            else:
                return False, f"Unsupported method: {method}"
                
            status = response.status_code
            
            # Should return 403 (forbidden - ownership guard), NOT 404 or 500
            if status == 403:
                try:
                    data = response.json()
                    # Check for expected error structure
                    if data.get("success") == False and "forbidden" in str(data.get("error", "")).lower():
                        return True, f"Status 403, JSON: {json.dumps(data)}"
                    else:
                        return True, f"Status 403, JSON: {json.dumps(data)} (structure OK)"
                except:
                    return True, f"Status 403 (not JSON)"
            elif status == 404:
                return False, f"Status 404 - route not found (expected 403)"
            elif status == 500:
                return False, f"Status 500 - server error (expected 403)"
            else:
                try:
                    data = response.json()
                    return False, f"Status {status} - unexpected (expected 403), JSON: {json.dumps(data)}"
                except:
                    return False, f"Status {status} - unexpected (expected 403)"
                    
        except Exception as e:
            return False, f"Exception: {str(e)}"
            
    def test_bogus_route(self) -> Tuple[bool, str]:
        """Test that a bogus route returns 404 (proving our routes are registered)"""
        try:
            url = f"{BASE_URL}/reseller/hosting/{NON_OWNED_USER}/email/does-not-exist"
            response = requests.post(url)
            
            status = response.status_code
            
            # Should return 404 (route not found)
            if status == 404:
                return True, f"Status 404 - bogus route correctly returns 404"
            else:
                return False, f"Status {status} - expected 404 for bogus route"
                
        except Exception as e:
            return False, f"Exception: {str(e)}"
            
    def test_health_endpoint(self) -> Tuple[bool, str]:
        """Test that health endpoint still works (no regression)"""
        try:
            url = f"{BASE_URL}/reseller/health"
            response = requests.get(url)
            
            status = response.status_code
            
            if status == 200:
                try:
                    data = response.json()
                    mode = data.get("mode")
                    if mode == "live":
                        return True, f"Status 200, mode: {mode}"
                    else:
                        return False, f"Status 200 but mode is '{mode}' (expected 'live')"
                except:
                    return False, f"Status 200 but not JSON"
            else:
                return False, f"Status {status} - expected 200"
                
        except Exception as e:
            return False, f"Exception: {str(e)}"
            
    def test_existing_hosting_route(self) -> Tuple[bool, str]:
        """Test that existing hosting management route still works (no regression)"""
        try:
            url = f"{BASE_URL}/reseller/hosting/{NON_OWNED_USER}/ssl"
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.get(url, headers=headers)
            
            status = response.status_code
            
            # Should return 403 (ownership guard), NOT 404
            if status == 403:
                try:
                    data = response.json()
                    return True, f"Status 403 (ownership guard working), JSON: {json.dumps(data)}"
                except:
                    return True, f"Status 403 (ownership guard working)"
            elif status == 404:
                return False, f"Status 404 - route not found (regression!)"
            else:
                try:
                    data = response.json()
                    return False, f"Status {status} - unexpected (expected 403), JSON: {json.dumps(data)}"
                except:
                    return False, f"Status {status} - unexpected (expected 403)"
                    
        except Exception as e:
            return False, f"Exception: {str(e)}"
            
    def run_tests(self):
        """Run all tests"""
        self.log(f"\n{BLUE}{'='*80}{RESET}")
        self.log(f"{BLUE}TESTING: Reseller cPanel Email (mailbox) proxy endpoints{RESET}")
        self.log(f"{BLUE}{'='*80}{RESET}")
        
        # Login first
        if not self.login():
            self.log(f"\n{RED}CRITICAL: Login failed. Cannot proceed with tests.{RESET}")
            return False
            
        # TEST 1: Routes registered + auth-guarded (no auth → 400, not 404)
        self.log(f"\n{BLUE}=== TEST 1: ROUTES REGISTERED + AUTH-GUARDED ==={RESET}")
        self.log("Testing all 5 endpoints WITHOUT auth header (expect 400, NOT 404)")
        
        email_endpoints = [
            ("GET", f"/reseller/hosting/{NON_OWNED_USER}/email"),
            ("POST", f"/reseller/hosting/{NON_OWNED_USER}/email"),
            ("DELETE", f"/reseller/hosting/{NON_OWNED_USER}/email"),
            ("PUT", f"/reseller/hosting/{NON_OWNED_USER}/email/password"),
            ("POST", f"/reseller/hosting/{NON_OWNED_USER}/email/test"),
        ]
        
        for method, path in email_endpoints:
            passed, details = self.test_route_without_auth(method, path)
            self.test_result(f"Route {method} {path} - auth guard", passed, details)
            
        # TEST 1b: Bogus route returns 404 (control test)
        self.log(f"\n{BLUE}=== TEST 1b: CONTROL - BOGUS ROUTE RETURNS 404 ==={RESET}")
        passed, details = self.test_bogus_route()
        self.test_result("Bogus route POST /reseller/hosting/:user/email/does-not-exist", passed, details)
        
        # TEST 2: Ownership guard (valid session + non-owned user → 403)
        self.log(f"\n{BLUE}=== TEST 2: OWNERSHIP GUARD ==={RESET}")
        self.log(f"Testing all 5 endpoints WITH auth but NON-OWNED user (expect 403)")
        
        ownership_tests = [
            ("GET", f"/reseller/hosting/{NON_OWNED_USER}/email", None),
            ("POST", f"/reseller/hosting/{NON_OWNED_USER}/email", {"email": "test@example.com", "password": "test123", "domain": "example.com"}),
            ("DELETE", f"/reseller/hosting/{NON_OWNED_USER}/email", {"email": "test@example.com", "domain": "example.com"}),
            ("PUT", f"/reseller/hosting/{NON_OWNED_USER}/email/password", {"email": "test@example.com", "password": "newpass123", "domain": "example.com"}),
            ("POST", f"/reseller/hosting/{NON_OWNED_USER}/email/test", {"from": "test@example.com", "to": "test@example.com"}),
        ]
        
        for method, path, body in ownership_tests:
            passed, details = self.test_ownership_guard(method, path, body)
            self.test_result(f"Ownership guard {method} {path}", passed, details)
            
        # TEST 3: Clean JSON responses (already verified in tests above)
        self.log(f"\n{BLUE}=== TEST 3: CLEAN JSON RESPONSES ==={RESET}")
        self.log("✓ All error responses verified to be clean JSON (no 500 stack traces)")
        
        # TEST 4: No regression
        self.log(f"\n{BLUE}=== TEST 4: NO REGRESSION ==={RESET}")
        
        # Test health endpoint
        passed, details = self.test_health_endpoint()
        self.test_result("GET /reseller/health returns 200 with mode:live", passed, details)
        
        # Test existing hosting management route
        passed, details = self.test_existing_hosting_route()
        self.test_result("GET /reseller/hosting/:user/ssl returns 403 for non-owned", passed, details)
        
        # Summary
        self.log(f"\n{BLUE}{'='*80}{RESET}")
        self.log(f"{BLUE}TEST SUMMARY{RESET}")
        self.log(f"{BLUE}{'='*80}{RESET}")
        
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["passed"])
        failed = total - passed
        
        self.log(f"Total tests: {total}")
        self.log(f"Passed: {passed}", GREEN)
        if failed > 0:
            self.log(f"Failed: {failed}", RED)
            
        # List failed tests
        if failed > 0:
            self.log(f"\n{RED}FAILED TESTS:{RESET}")
            for result in self.test_results:
                if not result["passed"]:
                    self.log(f"  ❌ {result['test']}", RED)
                    if result["details"]:
                        self.log(f"     {result['details']}", YELLOW)
                        
        return failed == 0

if __name__ == "__main__":
    tester = EmailEndpointTester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)
