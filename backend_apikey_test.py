#!/usr/bin/env python3
"""
Backend API Key + Password Change + 2FA Toggle Test
Tests the three main areas from the review_request:
1. API key works across ALL services (reseller + checkout endpoints)
2. Password change functionality
3. 2FA toggle functionality
"""

import requests
import json
import time
import uuid
from datetime import datetime, timedelta

# Base URL - test locally since frontend dist is not built
BASE_URL = "http://localhost:8001/api/v1"
TIMEOUT = 30

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_section(name):
    print(f"\n{'='*80}")
    print(f"SECTION: {name}")
    print(f"{'='*80}\n")

# ============================================================================
# SECTION 1: API KEY ACROSS ALL SERVICES
# ============================================================================
test_section("1. API KEY ACROSS ALL SERVICES")

# Step 1: Login as buyer
log("Step 1: Login as buyer@nameword.local")
login_resp = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": "buyer@nameword.local", "password": "Buyer@12345"},
    timeout=TIMEOUT
)
log(f"Login status: {login_resp.status_code}")
if login_resp.status_code != 200:
    log(f"ERROR: Login failed - {login_resp.text}")
    exit(1)

login_data = login_resp.json()
bearer_token = login_data.get("token")
log(f"✓ Login successful, got Bearer token")

# Step 2: Create API key
log("\nStep 2: Create API key")
expiration = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%SZ")
create_key_resp = requests.post(
    f"{BASE_URL}/user/api-keys",
    headers={"Authorization": f"Bearer {bearer_token}"},
    json={"name": "test", "expiration": expiration},
    timeout=TIMEOUT
)
log(f"Create API key status: {create_key_resp.status_code}")
if create_key_resp.status_code != 201:
    log(f"ERROR: Create API key failed - {create_key_resp.text}")
    exit(1)

key_data = create_key_resp.json()
api_key = key_data.get("data", {}).get("apiKey")
log(f"✓ API key created: {api_key[:20]}...")

# Step 3: Test API key on ALL services (reseller + checkout)
log("\nStep 3: Test API key authentication on ALL services")

# Define all endpoints that should accept API key
endpoints_to_test = [
    # Reseller endpoints
    ("GET", "/reseller/vps", "VPS list"),
    ("GET", "/reseller/domains", "Domains list"),
    ("GET", "/reseller/hosting", "Hosting list"),
    ("GET", "/reseller/rdp", "RDP list"),
    # Checkout endpoints
    ("GET", "/checkout/orders", "Orders list"),
    ("GET", "/checkout/renewals", "Renewals list"),
    # Wallet endpoint (already supported API key)
    ("GET", "/wallet/get", "Wallet balance"),
]

api_key_results = []
for method, endpoint, description in endpoints_to_test:
    log(f"  Testing {description}: {method} {endpoint}")
    resp = requests.request(
        method,
        f"{BASE_URL}{endpoint}",
        headers={"x-api-key": api_key},
        timeout=TIMEOUT
    )
    success = resp.status_code == 200
    api_key_results.append((description, resp.status_code, success))
    if success:
        log(f"    ✓ {resp.status_code} - API key accepted")
    else:
        log(f"    ✗ {resp.status_code} - FAILED: {resp.text[:100]}")

# Step 4: Test NEGATIVE cases
log("\nStep 4: Test NEGATIVE cases")

# 4a: Invalid API key
log("  4a: Invalid API key (bogus|bogus)")
invalid_resp = requests.get(
    f"{BASE_URL}/reseller/vps",
    headers={"x-api-key": "bogus|bogus"},
    timeout=TIMEOUT
)
log(f"    Status: {invalid_resp.status_code}")
if invalid_resp.status_code in [400, 401]:
    log(f"    ✓ Correctly rejected invalid API key")
    invalid_key_pass = True
else:
    log(f"    ✗ FAILED: Expected 400/401, got {invalid_resp.status_code}")
    invalid_key_pass = False

# 4b: No auth header at all
log("  4b: No auth header")
no_auth_resp = requests.get(
    f"{BASE_URL}/reseller/vps",
    timeout=TIMEOUT
)
log(f"    Status: {no_auth_resp.status_code}")
if no_auth_resp.status_code in [400, 401]:
    log(f"    ✓ Correctly rejected no auth")
    no_auth_pass = True
else:
    log(f"    ✗ FAILED: Expected 400/401, got {no_auth_resp.status_code}")
    no_auth_pass = False

# Step 5: Test PUBLIC endpoints (no auth required)
log("\nStep 5: Test PUBLIC endpoints (no auth required)")

public_endpoints = [
    ("GET", "/reseller/vps/plans?region=EU", "VPS plans EU"),
    ("GET", "/reseller/hosting/plans", "Hosting plans"),
    ("GET", "/reseller/domains/search?domain=coolstartup2026.com", "Domain search"),
]

public_results = []
for method, endpoint, description in public_endpoints:
    log(f"  Testing {description}: {method} {endpoint}")
    resp = requests.request(
        method,
        f"{BASE_URL}{endpoint}",
        timeout=TIMEOUT
    )
    success = resp.status_code == 200
    public_results.append((description, resp.status_code, success))
    if success:
        log(f"    ✓ {resp.status_code} - Public endpoint accessible")
    else:
        log(f"    ✗ {resp.status_code} - FAILED: {resp.text[:100]}")

# ============================================================================
# SECTION 2: CHANGE PASSWORD
# ============================================================================
test_section("2. CHANGE PASSWORD")

# Step 1: Register throwaway user
log("Step 1: Register throwaway user")
throwaway_email = f"throwaway-{uuid.uuid4().hex[:8]}@nameword.local"
register_resp = requests.post(
    f"{BASE_URL}/auth/register",
    json={
        "name": "Tmp",
        "email": throwaway_email,
        "password": "Test@12345",
        "passwordConfirmation": "Test@12345"
    },
    timeout=TIMEOUT
)
log(f"Register status: {register_resp.status_code}")
if register_resp.status_code not in [200, 201]:
    log(f"ERROR: Registration failed - {register_resp.text}")
    exit(1)

register_data = register_resp.json()
throwaway_token = register_data.get("token")
log(f"✓ Throwaway user registered: {throwaway_email}")

# Step 2: Change password
log("\nStep 2: Change password")
change_pw_resp = requests.post(
    f"{BASE_URL}/auth/change-password",
    headers={"Authorization": f"Bearer {throwaway_token}"},
    json={
        "oldPassword": "Test@12345",
        "newPassword": "Test@54321",
        "newPasswordConfirmation": "Test@54321"
    },
    timeout=TIMEOUT
)
log(f"Change password status: {change_pw_resp.status_code}")
if change_pw_resp.status_code != 200:
    log(f"ERROR: Change password failed - {change_pw_resp.text}")
    change_password_success = False
else:
    log(f"✓ Password changed successfully")
    change_password_success = True

# Step 3: Login with NEW password
log("\nStep 3: Login with NEW password")
new_pw_login_resp = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": throwaway_email, "password": "Test@54321"},
    timeout=TIMEOUT
)
log(f"Login with new password status: {new_pw_login_resp.status_code}")
if new_pw_login_resp.status_code == 200:
    log(f"✓ Login with NEW password successful")
    new_pw_login_success = True
else:
    log(f"✗ FAILED: Login with new password failed - {new_pw_login_resp.text}")
    new_pw_login_success = False

# Step 4: Login with OLD password (should fail)
log("\nStep 4: Login with OLD password (should fail)")
old_pw_login_resp = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": throwaway_email, "password": "Test@12345"},
    timeout=TIMEOUT
)
log(f"Login with old password status: {old_pw_login_resp.status_code}")
if old_pw_login_resp.status_code in [400, 401]:
    log(f"✓ Login with OLD password correctly rejected")
    old_pw_login_fail = True
else:
    log(f"✗ FAILED: Old password should not work, got {old_pw_login_resp.status_code}")
    old_pw_login_fail = False

# ============================================================================
# SECTION 3: 2FA TOGGLE
# ============================================================================
test_section("3. 2FA TOGGLE")

# Use the throwaway user from Section 2
log("Using throwaway user from Section 2")
# Get fresh token from new password login
if new_pw_login_success:
    throwaway_token = new_pw_login_resp.json().get("token")

# Step 1: Enable 2FA
log("\nStep 1: Enable 2FA")
enable_2fa_resp = requests.post(
    f"{BASE_URL}/auth/update-userDetails",
    headers={"Authorization": f"Bearer {throwaway_token}"},
    json={"enabled2FA": True},
    timeout=TIMEOUT
)
log(f"Enable 2FA status: {enable_2fa_resp.status_code}")
if enable_2fa_resp.status_code != 200:
    log(f"ERROR: Enable 2FA failed - {enable_2fa_resp.text}")
    enable_2fa_success = False
else:
    log(f"✓ 2FA enabled successfully")
    enable_2fa_success = True

# Step 2: Verify 2FA is enabled
log("\nStep 2: Verify 2FA is enabled via /auth/me")
me_resp = requests.get(
    f"{BASE_URL}/auth/me",
    headers={"Authorization": f"Bearer {throwaway_token}"},
    timeout=TIMEOUT
)
log(f"GET /auth/me status: {me_resp.status_code}")
if me_resp.status_code == 200:
    me_data = me_resp.json()
    enabled_2fa = me_data.get("data", {}).get("enabled2FA")
    log(f"  enabled2FA: {enabled_2fa}")
    if enabled_2fa is True:
        log(f"✓ 2FA is enabled (verified)")
        verify_2fa_enabled = True
    else:
        log(f"✗ FAILED: enabled2FA should be true, got {enabled_2fa}")
        verify_2fa_enabled = False
else:
    log(f"ERROR: GET /auth/me failed - {me_resp.text}")
    verify_2fa_enabled = False

# Step 3: Disable 2FA
log("\nStep 3: Disable 2FA")
disable_2fa_resp = requests.post(
    f"{BASE_URL}/auth/update-userDetails",
    headers={"Authorization": f"Bearer {throwaway_token}"},
    json={"enabled2FA": False},
    timeout=TIMEOUT
)
log(f"Disable 2FA status: {disable_2fa_resp.status_code}")
if disable_2fa_resp.status_code != 200:
    log(f"ERROR: Disable 2FA failed - {disable_2fa_resp.text}")
    disable_2fa_success = False
else:
    log(f"✓ 2FA disabled successfully")
    disable_2fa_success = True

# Step 4: Verify 2FA is disabled
log("\nStep 4: Verify 2FA is disabled via /auth/me")
me_resp2 = requests.get(
    f"{BASE_URL}/auth/me",
    headers={"Authorization": f"Bearer {throwaway_token}"},
    timeout=TIMEOUT
)
log(f"GET /auth/me status: {me_resp2.status_code}")
if me_resp2.status_code == 200:
    me_data2 = me_resp2.json()
    enabled_2fa2 = me_data2.get("data", {}).get("enabled2FA")
    log(f"  enabled2FA: {enabled_2fa2}")
    if enabled_2fa2 is False:
        log(f"✓ 2FA is disabled (verified)")
        verify_2fa_disabled = True
    else:
        log(f"✗ FAILED: enabled2FA should be false, got {enabled_2fa2}")
        verify_2fa_disabled = False
else:
    log(f"ERROR: GET /auth/me failed - {me_resp2.text}")
    verify_2fa_disabled = False

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print(f"\n{'='*80}")
print("FINAL SUMMARY")
print(f"{'='*80}\n")

print("SECTION 1: API KEY ACROSS ALL SERVICES")
print(f"  API key creation: ✓ PASS")
for desc, status, success in api_key_results:
    result = "✓ PASS" if success else f"✗ FAIL ({status})"
    print(f"  {desc}: {result}")
print(f"  Invalid API key rejection: {'✓ PASS' if invalid_key_pass else '✗ FAIL'}")
print(f"  No auth rejection: {'✓ PASS' if no_auth_pass else '✗ FAIL'}")
for desc, status, success in public_results:
    result = "✓ PASS" if success else f"✗ FAIL ({status})"
    print(f"  {desc} (public): {result}")

section1_pass = all([r[2] for r in api_key_results]) and invalid_key_pass and no_auth_pass and all([r[2] for r in public_results])

print(f"\nSECTION 2: CHANGE PASSWORD")
print(f"  Throwaway user registration: ✓ PASS")
print(f"  Change password: {'✓ PASS' if change_password_success else '✗ FAIL'}")
print(f"  Login with NEW password: {'✓ PASS' if new_pw_login_success else '✗ FAIL'}")
print(f"  Login with OLD password (should fail): {'✓ PASS' if old_pw_login_fail else '✗ FAIL'}")

section2_pass = change_password_success and new_pw_login_success and old_pw_login_fail

print(f"\nSECTION 3: 2FA TOGGLE")
print(f"  Enable 2FA: {'✓ PASS' if enable_2fa_success else '✗ FAIL'}")
print(f"  Verify 2FA enabled: {'✓ PASS' if verify_2fa_enabled else '✗ FAIL'}")
print(f"  Disable 2FA: {'✓ PASS' if disable_2fa_success else '✗ FAIL'}")
print(f"  Verify 2FA disabled: {'✓ PASS' if verify_2fa_disabled else '✗ FAIL'}")

section3_pass = enable_2fa_success and verify_2fa_enabled and disable_2fa_success and verify_2fa_disabled

print(f"\n{'='*80}")
print("OVERALL RESULT")
print(f"{'='*80}")
print(f"Section 1 (API Key Across All Services): {'✓ PASS' if section1_pass else '✗ FAIL'}")
print(f"Section 2 (Change Password): {'✓ PASS' if section2_pass else '✗ FAIL'}")
print(f"Section 3 (2FA Toggle): {'✓ PASS' if section3_pass else '✗ FAIL'}")

if section1_pass and section2_pass and section3_pass:
    print(f"\n🎉 ALL TESTS PASSED")
    exit(0)
else:
    print(f"\n❌ SOME TESTS FAILED")
    exit(1)
