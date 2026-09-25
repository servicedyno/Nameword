#!/usr/bin/env python3
"""
Backend test for NEW reseller proxy endpoints:
- GET /api/v1/reseller/pricing
- POST /api/v1/reseller/domains/:domain/renew

Test requirements:
1. Routes registered + auth-guarded (unauth -> 400, NOT 404)
2. GET /pricing with auth returns 200 + plan catalog WITHOUT wallet_balance_usd
3. POST /domains/:domain/renew with auth returns 403 for non-owned domain
4. NO REGRESSION: GET /reseller/health still returns 200 mode:live
"""

import requests
import json
import sys

# Backend base URL (internal)
BASE_URL = "http://localhost:8001/api/v1"

# Test credentials from /app/memory/test_credentials.md
TEST_USER = "demo@nameword.local"
TEST_PASS = "Demo@12345"

# ANSI color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def log_test(name):
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST: {name}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")

def log_pass(msg):
    print(f"{GREEN}✅ PASS: {msg}{RESET}")

def log_fail(msg):
    print(f"{RED}❌ FAIL: {msg}{RESET}")

def log_info(msg):
    print(f"{YELLOW}ℹ️  INFO: {msg}{RESET}")

def log_critical(msg):
    print(f"{RED}🔴 CRITICAL: {msg}{RESET}")

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "critical_failures": []
}

def test_1_routes_registered_and_auth_guarded():
    """
    TEST 1: Verify routes are registered and auth-guarded
    - Call both endpoints WITHOUT auth
    - Expect HTTP 400 (auth/api-key error), NOT 404
    - Control: GET /api/v1/reseller/pricing-nope should be 404
    """
    log_test("1. Routes Registered + Auth-Guarded")
    
    # Test 1a: GET /pricing without auth should return 400 (not 404)
    log_info("Testing GET /api/v1/reseller/pricing without auth...")
    try:
        resp = requests.get(f"{BASE_URL}/reseller/pricing", timeout=10)
        if resp.status_code == 400:
            log_pass(f"GET /pricing without auth returns 400 (auth required)")
            test_results["passed"] += 1
        elif resp.status_code == 404:
            log_fail(f"GET /pricing without auth returns 404 - route NOT registered!")
            test_results["failed"] += 1
            test_results["critical_failures"].append("GET /pricing route not registered (404)")
        else:
            log_fail(f"GET /pricing without auth returns {resp.status_code} (expected 400)")
            test_results["failed"] += 1
    except Exception as e:
        log_fail(f"GET /pricing without auth failed with exception: {e}")
        test_results["failed"] += 1
    
    # Test 1b: POST /domains/:domain/renew without auth should return 400 (not 404)
    log_info("Testing POST /api/v1/reseller/domains/test.com/renew without auth...")
    try:
        resp = requests.post(f"{BASE_URL}/reseller/domains/test.com/renew", json={}, timeout=10)
        if resp.status_code == 400:
            log_pass(f"POST /domains/:domain/renew without auth returns 400 (auth required)")
            test_results["passed"] += 1
        elif resp.status_code == 404:
            log_fail(f"POST /domains/:domain/renew without auth returns 404 - route NOT registered!")
            test_results["failed"] += 1
            test_results["critical_failures"].append("POST /domains/:domain/renew route not registered (404)")
        else:
            log_fail(f"POST /domains/:domain/renew without auth returns {resp.status_code} (expected 400)")
            test_results["failed"] += 1
    except Exception as e:
        log_fail(f"POST /domains/:domain/renew without auth failed with exception: {e}")
        test_results["failed"] += 1
    
    # Test 1c: Control - bogus route should return 404
    log_info("Testing control: GET /api/v1/reseller/pricing-nope (should be 404)...")
    try:
        resp = requests.get(f"{BASE_URL}/reseller/pricing-nope", timeout=10)
        if resp.status_code == 404:
            log_pass(f"Control route /pricing-nope returns 404 (proves real routes are registered)")
            test_results["passed"] += 1
        else:
            log_fail(f"Control route /pricing-nope returns {resp.status_code} (expected 404)")
            test_results["failed"] += 1
    except Exception as e:
        log_fail(f"Control route test failed with exception: {e}")
        test_results["failed"] += 1

def test_2_pricing_endpoint_with_auth():
    """
    TEST 2: GET /pricing with auth - KEY SECURITY CHECK
    - Login as demo@nameword.local / Demo@12345
    - GET /api/v1/reseller/pricing?region=EU with Authorization: Bearer <token>
    - Expect HTTP 200 with JSON plan catalog
    - CRITICAL: Assert wallet_balance_usd is NOT present in response body
    """
    log_test("2. GET /pricing with Auth + Security Check (wallet_balance_usd)")
    
    # Step 1: Login to get token
    log_info(f"Logging in as {TEST_USER}...")
    try:
        login_resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_USER, "password": TEST_PASS},
            timeout=10
        )
        if login_resp.status_code != 200:
            log_fail(f"Login failed with status {login_resp.status_code}: {login_resp.text}")
            test_results["failed"] += 1
            test_results["critical_failures"].append("Login failed - cannot test authenticated endpoints")
            return
        
        login_data = login_resp.json()
        token = login_data.get("token")
        if not token:
            log_fail(f"Login response missing token: {login_data}")
            test_results["failed"] += 1
            test_results["critical_failures"].append("Login token missing")
            return
        
        log_pass(f"Login successful, token obtained")
        test_results["passed"] += 1
        
    except Exception as e:
        log_fail(f"Login failed with exception: {e}")
        test_results["failed"] += 1
        test_results["critical_failures"].append(f"Login exception: {e}")
        return
    
    # Step 2: GET /pricing with auth
    log_info("Testing GET /api/v1/reseller/pricing?region=EU with auth...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        pricing_resp = requests.get(
            f"{BASE_URL}/reseller/pricing",
            params={"region": "EU"},
            headers=headers,
            timeout=10
        )
        
        if pricing_resp.status_code != 200:
            log_fail(f"GET /pricing with auth returned {pricing_resp.status_code}: {pricing_resp.text}")
            test_results["failed"] += 1
            return
        
        log_pass(f"GET /pricing with auth returns 200")
        test_results["passed"] += 1
        
        # Parse response body
        try:
            pricing_data = pricing_resp.json()
        except Exception as e:
            log_fail(f"Failed to parse pricing response as JSON: {e}")
            test_results["failed"] += 1
            return
        
        log_info(f"Pricing response keys: {list(pricing_data.keys())}")
        
        # CRITICAL SECURITY CHECK: wallet_balance_usd must NOT be present
        if "wallet_balance_usd" in pricing_data:
            log_critical("SECURITY ISSUE: wallet_balance_usd is PRESENT in response!")
            log_critical(f"wallet_balance_usd value: {pricing_data['wallet_balance_usd']}")
            test_results["failed"] += 1
            test_results["critical_failures"].append("SECURITY: wallet_balance_usd exposed in /pricing response")
        else:
            log_pass("SECURITY CHECK PASSED: wallet_balance_usd is NOT present in response")
            test_results["passed"] += 1
        
        # Verify response contains plan catalog
        has_catalog = False
        catalog_keys = ["hosting", "vps", "rdp", "plans"]
        for key in catalog_keys:
            if key in pricing_data:
                has_catalog = True
                log_info(f"Found catalog key: {key}")
        
        if has_catalog:
            log_pass("Response contains plan catalog (hosting/vps/rdp/plans)")
            test_results["passed"] += 1
        else:
            log_fail(f"Response missing plan catalog. Keys: {list(pricing_data.keys())}")
            test_results["failed"] += 1
        
        # Also check that 'mode' is stripped (per controller code)
        if "mode" in pricing_data:
            log_fail("SECURITY ISSUE: 'mode' field is present in response (should be stripped)")
            test_results["failed"] += 1
        else:
            log_pass("SECURITY CHECK PASSED: 'mode' field is NOT present in response")
            test_results["passed"] += 1
        
    except Exception as e:
        log_fail(f"GET /pricing with auth failed with exception: {e}")
        test_results["failed"] += 1

def test_3_domain_renew_ownership_guard():
    """
    TEST 3: POST /domains/:domain/renew ownership guard
    - Use same demo session from test 2
    - POST /api/v1/reseller/domains/nonexistent-domain-xyz.com/renew (empty JSON body)
    - Expect HTTP 403 forbidden {success:false, error:"forbidden"}
    - NOT 404 and NOT 500
    """
    log_test("3. POST /domains/:domain/renew Ownership Guard")
    
    # Login to get token
    log_info(f"Logging in as {TEST_USER}...")
    try:
        login_resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_USER, "password": TEST_PASS},
            timeout=10
        )
        if login_resp.status_code != 200:
            log_fail(f"Login failed with status {login_resp.status_code}")
            test_results["failed"] += 1
            return
        
        token = login_resp.json().get("token")
        if not token:
            log_fail("Login token missing")
            test_results["failed"] += 1
            return
        
        log_pass("Login successful")
        test_results["passed"] += 1
        
    except Exception as e:
        log_fail(f"Login failed with exception: {e}")
        test_results["failed"] += 1
        return
    
    # Test ownership guard with non-owned domain
    log_info("Testing POST /api/v1/reseller/domains/nonexistent-domain-xyz.com/renew...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        renew_resp = requests.post(
            f"{BASE_URL}/reseller/domains/nonexistent-domain-xyz.com/renew",
            json={},
            headers=headers,
            timeout=10
        )
        
        if renew_resp.status_code == 403:
            log_pass("POST /domains/:domain/renew returns 403 (ownership guard working)")
            test_results["passed"] += 1
            
            # Verify response body
            try:
                renew_data = renew_resp.json()
                if renew_data.get("success") == False and renew_data.get("error") == "forbidden":
                    log_pass("Response body correct: {success:false, error:'forbidden'}")
                    test_results["passed"] += 1
                else:
                    log_fail(f"Response body incorrect: {renew_data}")
                    test_results["failed"] += 1
            except Exception as e:
                log_fail(f"Failed to parse response body: {e}")
                test_results["failed"] += 1
                
        elif renew_resp.status_code == 404:
            log_fail("POST /domains/:domain/renew returns 404 (should be 403 for ownership guard)")
            test_results["failed"] += 1
        elif renew_resp.status_code == 500:
            log_fail("POST /domains/:domain/renew returns 500 (should be 403 for ownership guard)")
            test_results["failed"] += 1
        else:
            log_fail(f"POST /domains/:domain/renew returns {renew_resp.status_code} (expected 403)")
            log_info(f"Response: {renew_resp.text}")
            test_results["failed"] += 1
            
    except Exception as e:
        log_fail(f"POST /domains/:domain/renew failed with exception: {e}")
        test_results["failed"] += 1

def test_4_no_regression_health_endpoint():
    """
    TEST 4: NO REGRESSION - GET /reseller/health
    - GET /api/v1/reseller/health
    - Expect HTTP 200 with mode:"live"
    """
    log_test("4. NO REGRESSION - GET /reseller/health")
    
    log_info("Testing GET /api/v1/reseller/health...")
    try:
        health_resp = requests.get(f"{BASE_URL}/reseller/health", timeout=10)
        
        if health_resp.status_code != 200:
            log_fail(f"GET /reseller/health returns {health_resp.status_code} (expected 200)")
            test_results["failed"] += 1
            test_results["critical_failures"].append("Health endpoint regression - not returning 200")
            return
        
        log_pass("GET /reseller/health returns 200")
        test_results["passed"] += 1
        
        # Verify response contains mode:"live"
        try:
            health_data = health_resp.json()
            if health_data.get("mode") == "live":
                log_pass("Health response contains mode:'live'")
                test_results["passed"] += 1
            else:
                log_fail(f"Health response mode is '{health_data.get('mode')}' (expected 'live')")
                test_results["failed"] += 1
        except Exception as e:
            log_fail(f"Failed to parse health response: {e}")
            test_results["failed"] += 1
            
    except Exception as e:
        log_fail(f"GET /reseller/health failed with exception: {e}")
        test_results["failed"] += 1
        test_results["critical_failures"].append(f"Health endpoint exception: {e}")

def print_summary():
    """Print test summary"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    total = test_results["passed"] + test_results["failed"]
    pass_rate = (test_results["passed"] / total * 100) if total > 0 else 0
    
    print(f"\nTotal Tests: {total}")
    print(f"{GREEN}Passed: {test_results['passed']}{RESET}")
    print(f"{RED}Failed: {test_results['failed']}{RESET}")
    print(f"Pass Rate: {pass_rate:.1f}%")
    
    if test_results["critical_failures"]:
        print(f"\n{RED}CRITICAL FAILURES:{RESET}")
        for failure in test_results["critical_failures"]:
            print(f"  {RED}• {failure}{RESET}")
    
    print(f"\n{BLUE}{'='*80}{RESET}\n")
    
    return test_results["failed"] == 0

if __name__ == "__main__":
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}BACKEND TEST: Reseller Proxy Endpoints (GET /pricing, POST /domains/:domain/renew){RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test User: {TEST_USER}")
    
    # Run all tests
    test_1_routes_registered_and_auth_guarded()
    test_2_pricing_endpoint_with_auth()
    test_3_domain_renew_ownership_guard()
    test_4_no_regression_health_endpoint()
    
    # Print summary and exit
    success = print_summary()
    sys.exit(0 if success else 1)
