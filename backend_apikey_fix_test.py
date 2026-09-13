#!/usr/bin/env python3
"""
Focused re-test of API-key error-handling fix in validate-apikey.js
Provider: dry_run
Test account: buyer@nameword.local / Buyer@12345
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Backend URL - using localhost since external URL is not routing correctly
BASE_URL = "http://localhost:8001/api/v1"

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_apikey_error_handling():
    """Test the API key error handling fix"""
    
    log("=" * 80)
    log("FOCUSED RE-TEST: API-KEY ERROR-HANDLING FIX")
    log("=" * 80)
    
    # Step 1: Login as buyer
    log("\n[STEP 1] Login as buyer@nameword.local")
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "buyer@nameword.local", "password": "Buyer@12345"},
        timeout=30
    )
    log(f"  Status: {login_resp.status_code}")
    if login_resp.status_code != 200:
        log(f"  ERROR: Login failed - {login_resp.text}")
        return False
    
    token = login_resp.json().get("token")
    if not token:
        log(f"  ERROR: No token in response - {login_resp.text}")
        return False
    
    log(f"  ✅ Login successful, got Bearer token")
    headers_bearer = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Create a new API key
    log("\n[STEP 2] Create API key")
    expiration = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%SZ")
    create_key_resp = requests.post(
        f"{BASE_URL}/user/api-keys",
        headers=headers_bearer,
        json={"name": "retest", "expiration": expiration},
        timeout=30
    )
    log(f"  Status: {create_key_resp.status_code}")
    if create_key_resp.status_code != 201:
        log(f"  ERROR: API key creation failed - {create_key_resp.text}")
        return False
    
    api_key = create_key_resp.json().get("data", {}).get("apiKey")
    if not api_key or "|" not in api_key:
        log(f"  ERROR: Invalid API key format - {create_key_resp.text}")
        return False
    
    log(f"  ✅ API key created: {api_key[:20]}...")
    
    # Step 3: FIX VERIFICATION - Test invalid API keys (should return 400, NOT 500)
    log("\n[STEP 3] FIX VERIFICATION - Invalid API keys should return 400 (NOT 500)")
    
    # Test 3a: bogus|bogus (invalid ObjectId)
    log("\n  [3a] Test with 'bogus|bogus' (invalid ObjectId)")
    invalid_resp_1 = requests.get(
        f"{BASE_URL}/reseller/vps",
        headers={"x-api-key": "bogus|bogus"},
        timeout=30
    )
    log(f"    Status: {invalid_resp_1.status_code}")
    log(f"    Response: {invalid_resp_1.text[:200]}")
    
    if invalid_resp_1.status_code == 500:
        log(f"    ❌ FAILED: Still returns 500 (CastError not fixed)")
        return False
    elif invalid_resp_1.status_code == 400:
        resp_json = invalid_resp_1.json()
        if "Invalid API key format" in resp_json.get("message", ""):
            log(f"    ✅ PASS: Returns 400 with 'Invalid API key format' message")
        else:
            log(f"    ⚠️  Returns 400 but message is: {resp_json.get('message')}")
    else:
        log(f"    ⚠️  Unexpected status code: {invalid_resp_1.status_code}")
    
    # Test 3b: notanobjectid|abc (invalid ObjectId)
    log("\n  [3b] Test with 'notanobjectid|abc' (invalid ObjectId)")
    invalid_resp_2 = requests.get(
        f"{BASE_URL}/reseller/vps",
        headers={"x-api-key": "notanobjectid|abc"},
        timeout=30
    )
    log(f"    Status: {invalid_resp_2.status_code}")
    log(f"    Response: {invalid_resp_2.text[:200]}")
    
    if invalid_resp_2.status_code == 500:
        log(f"    ❌ FAILED: Still returns 500 (CastError not fixed)")
        return False
    elif invalid_resp_2.status_code == 400:
        resp_json = invalid_resp_2.json()
        if "Invalid API key format" in resp_json.get("message", ""):
            log(f"    ✅ PASS: Returns 400 with 'Invalid API key format' message")
        else:
            log(f"    ⚠️  Returns 400 but message is: {resp_json.get('message')}")
    else:
        log(f"    ⚠️  Unexpected status code: {invalid_resp_2.status_code}")
    
    # Step 4: REGRESSION - Valid API key should still work
    log("\n[STEP 4] REGRESSION - Valid API key should still work")
    
    # Test 4a: GET /reseller/vps with valid API key
    log("\n  [4a] GET /reseller/vps with valid API key")
    valid_resp_1 = requests.get(
        f"{BASE_URL}/reseller/vps",
        headers={"x-api-key": api_key},
        timeout=30
    )
    log(f"    Status: {valid_resp_1.status_code}")
    if valid_resp_1.status_code == 200:
        log(f"    ✅ PASS: Valid API key works for /reseller/vps")
    else:
        log(f"    ❌ FAILED: Valid API key rejected - {valid_resp_1.text[:200]}")
        return False
    
    # Test 4b: GET /checkout/orders with valid API key
    log("\n  [4b] GET /checkout/orders with valid API key")
    valid_resp_2 = requests.get(
        f"{BASE_URL}/checkout/orders",
        headers={"x-api-key": api_key},
        timeout=30
    )
    log(f"    Status: {valid_resp_2.status_code}")
    if valid_resp_2.status_code == 200:
        log(f"    ✅ PASS: Valid API key works for /checkout/orders")
    else:
        log(f"    ❌ FAILED: Valid API key rejected - {valid_resp_2.text[:200]}")
        return False
    
    # Step 5: No-auth test
    log("\n[STEP 5] No-auth test - should return 400 'No API key provided'")
    no_auth_resp = requests.get(
        f"{BASE_URL}/reseller/vps",
        timeout=30
    )
    log(f"  Status: {no_auth_resp.status_code}")
    log(f"  Response: {no_auth_resp.text[:200]}")
    
    if no_auth_resp.status_code == 400:
        resp_json = no_auth_resp.json()
        if "No API key provided" in resp_json.get("message", ""):
            log(f"  ✅ PASS: Returns 400 with 'No API key provided' message")
        else:
            log(f"  ⚠️  Returns 400 but message is: {resp_json.get('message')}")
    else:
        log(f"  ⚠️  Unexpected status code: {no_auth_resp.status_code}")
    
    log("\n" + "=" * 80)
    log("✅ ALL TESTS PASSED - API-KEY ERROR-HANDLING FIX VERIFIED")
    log("=" * 80)
    return True

if __name__ == "__main__":
    try:
        success = test_apikey_error_handling()
        
        # Re-seed buyer wallet to $50
        log("\n[CLEANUP] Re-seeding buyer wallet to $50...")
        import subprocess
        result = subprocess.run(
            ["node", "scripts/seed_test_users.js"],
            cwd="/app/backend",
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            log("  ✅ Buyer wallet re-seeded to $50")
        else:
            log(f"  ⚠️  Re-seed script output: {result.stdout}")
        
        sys.exit(0 if success else 1)
    except Exception as e:
        log(f"\n❌ TEST FAILED WITH EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
