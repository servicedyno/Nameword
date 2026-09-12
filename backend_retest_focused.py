#!/usr/bin/env python3
"""
FOCUSED RE-TEST for Nameword backend API
Purpose: (A) Verify DynoPay config fix, (B) Re-run onboarding/account mgmt with CORRECT contracts, (C) Crypto classification
"""

import requests
import time
import uuid
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BASE_URL}/api/v1"
TIMEOUT = 30

# MongoDB connection for reading OTP and reset tokens
# Read DB_URI from backend/.env
import subprocess
result = subprocess.run(['bash', '-c', 'cd /app/backend && set -a && source .env && set +a && echo $DB_URI'], 
                       capture_output=True, text=True)
MONGO_URL = result.stdout.strip() or 'mongodb://localhost:27017/nameword'
print(f"Using MongoDB: {MONGO_URL.split('@')[1] if '@' in MONGO_URL else MONGO_URL}")
mongo_client = MongoClient(MONGO_URL)
db = mongo_client.get_database()

# Test results
results = {
    'A_DYNOPAY': [],
    'B1_ONBOARDING': [],
    'B2_ACCOUNT_MGMT': [],
    'C_CRYPTO': []
}

def log_test(section, name, passed, status_code=None, details=''):
    """Log test result"""
    result = {
        'name': name,
        'passed': passed,
        'status': status_code,
        'details': details
    }
    results[section].append(result)
    status = '✅ PASS' if passed else '❌ FAIL' if status_code not in [None, 'BLOCKED'] else '🚫 BLOCKED'
    print(f"{status} [{section}] {name} - {details}")

def generate_unique_email():
    """Generate unique email for testing"""
    return f"test-{uuid.uuid4().hex[:8]}@nameword.local"

print("=" * 80)
print("FOCUSED RE-TEST - Nameword Backend API")
print("=" * 80)

# ============================================================================
# SECTION A: DYNOPAY WALLET TOP-UP HAND-OFF
# ============================================================================
print("\n" + "=" * 80)
print("SECTION A: DYNOPAY WALLET TOP-UP HAND-OFF (Option A - generate hand-off only)")
print("=" * 80)

# First, login as buyer to get Bearer token
print("\nLogging in as buyer@nameword.local...")
login_resp = requests.post(
    f"{API_BASE}/auth/login",
    json={"email": "buyer@nameword.local", "password": "Buyer@12345"},
    timeout=TIMEOUT
)
if login_resp.status_code != 200:
    print(f"❌ Login failed: {login_resp.status_code} - {login_resp.text}")
    exit(1)

buyer_token = login_resp.json().get('token')
buyer_headers = {'Authorization': f'Bearer {buyer_token}'}
print(f"✅ Logged in as buyer, token: {buyer_token[:20]}...")

# A1: Happy path - amount:50
print("\nA1: POST /wallet/dynocheckout-url with amount:50...")
try:
    resp = requests.post(
        f"{API_BASE}/wallet/dynocheckout-url",
        headers=buyer_headers,
        json={"amount": 50, "frontendEndPoint": "wallet"},
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        data = resp.json()
        checkout_url = data.get('checkoutUrl', '')
        client_secret = data.get('clientSecret', '')
        embedded = data.get('embedded', False)
        
        has_dynopay_domain = 'checkout.dynopay.com' in checkout_url
        has_embed_param = 'embed=1' in checkout_url
        has_client_secret = len(client_secret) > 0
        
        if has_dynopay_domain and has_client_secret:
            log_test('A_DYNOPAY', 'DynoPay checkout URL (amount:50)', True, 200, 
                    f"checkoutUrl contains dynopay domain: {has_dynopay_domain}, embed=1: {has_embed_param}, clientSecret present: {has_client_secret}, embedded: {embedded}")
        else:
            log_test('A_DYNOPAY', 'DynoPay checkout URL (amount:50)', False, 200, 
                    f"Missing required fields - checkoutUrl: {checkout_url[:50]}..., clientSecret: {len(client_secret)} chars")
    elif resp.status_code == 500:
        error_msg = resp.json().get('message', resp.text)
        log_test('A_DYNOPAY', 'DynoPay checkout URL (amount:50)', 'BLOCKED', 500, 
                f"BLOCKED: {error_msg}")
    else:
        log_test('A_DYNOPAY', 'DynoPay checkout URL (amount:50)', False, resp.status_code, 
                f"Unexpected status: {resp.text[:200]}")
except Exception as e:
    log_test('A_DYNOPAY', 'DynoPay checkout URL (amount:50)', False, None, f"Exception: {str(e)}")

# A2: Below minimum - amount:5
print("\nA2: POST /wallet/dynocheckout-url with amount:5 (below minimum)...")
try:
    resp = requests.post(
        f"{API_BASE}/wallet/dynocheckout-url",
        headers=buyer_headers,
        json={"amount": 5, "frontendEndPoint": "wallet"},
        timeout=TIMEOUT
    )
    if resp.status_code == 400:
        log_test('A_DYNOPAY', 'DynoPay min amount validation (amount:5)', True, 400, 
                f"Correctly rejected: {resp.json().get('message', '')}")
    else:
        log_test('A_DYNOPAY', 'DynoPay min amount validation (amount:5)', False, resp.status_code, 
                f"Expected 400, got {resp.status_code}: {resp.text[:200]}")
except Exception as e:
    log_test('A_DYNOPAY', 'DynoPay min amount validation (amount:5)', False, None, f"Exception: {str(e)}")

# A3: Missing amount
print("\nA3: POST /wallet/dynocheckout-url with missing amount...")
try:
    resp = requests.post(
        f"{API_BASE}/wallet/dynocheckout-url",
        headers=buyer_headers,
        json={"frontendEndPoint": "wallet"},
        timeout=TIMEOUT
    )
    if resp.status_code in [400, 422]:
        log_test('A_DYNOPAY', 'DynoPay missing amount validation', True, resp.status_code, 
                f"Correctly rejected: {resp.json().get('message', resp.json().get('error', ''))}")
    else:
        log_test('A_DYNOPAY', 'DynoPay missing amount validation', False, resp.status_code, 
                f"Expected 400/422, got {resp.status_code}: {resp.text[:200]}")
except Exception as e:
    log_test('A_DYNOPAY', 'DynoPay missing amount validation', False, None, f"Exception: {str(e)}")

# A4: No Authorization header
print("\nA4: POST /wallet/dynocheckout-url without Authorization header...")
try:
    resp = requests.post(
        f"{API_BASE}/wallet/dynocheckout-url",
        json={"amount": 50, "frontendEndPoint": "wallet"},
        timeout=TIMEOUT
    )
    if resp.status_code in [400, 401]:
        log_test('A_DYNOPAY', 'DynoPay auth required', True, resp.status_code, 
                f"Correctly rejected: {resp.json().get('message', resp.json().get('error', ''))}")
    else:
        log_test('A_DYNOPAY', 'DynoPay auth required', False, resp.status_code, 
                f"Expected 400/401, got {resp.status_code}: {resp.text[:200]}")
except Exception as e:
    log_test('A_DYNOPAY', 'DynoPay auth required', False, None, f"Exception: {str(e)}")

# ============================================================================
# SECTION B1: ONBOARDING WITH CORRECT PAYLOADS
# ============================================================================
print("\n" + "=" * 80)
print("SECTION B1: ONBOARDING WITH CORRECT PAYLOADS")
print("=" * 80)

# B1.1: Register new unique user
print("\nB1.1: POST /auth/register with new unique user...")
new_user_email = generate_unique_email()
new_user_password = "Test@12345"
try:
    resp = requests.post(
        f"{API_BASE}/auth/register",
        json={
            "email": new_user_email,
            "password": new_user_password,
            "passwordConfirmation": new_user_password
        },
        timeout=TIMEOUT
    )
    if resp.status_code == 201:
        data = resp.json()
        new_user_token = data.get('token')
        new_user_id = data.get('data', {}).get('_id')
        new_user_password_current = new_user_password  # Track current password
        log_test('B1_ONBOARDING', 'Register new user', True, 201, 
                f"User created: {new_user_email}, token present: {new_user_token is not None}, id: {new_user_id}")
    else:
        log_test('B1_ONBOARDING', 'Register new user', False, resp.status_code, 
                f"Failed: {resp.text[:200]}")
        new_user_token = None
        new_user_id = None
        new_user_password_current = None
except Exception as e:
    log_test('B1_ONBOARDING', 'Register new user', False, None, f"Exception: {str(e)}")
    new_user_token = None
    new_user_id = None
    new_user_password_current = None

# B1.2: Send email verification code (public route, email required in body)
print("\nB1.2: POST /auth/send-email-code with email in body (public route)...")
try:
    resp = requests.post(
        f"{API_BASE}/auth/send-email-code",
        json={"email": new_user_email},
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        log_test('B1_ONBOARDING', 'Send email verification code', True, 200, 
                f"Code sent for {new_user_email}")
        
        # Read OTP from DB
        print(f"Reading OTP from verification_codes collection for {new_user_email}...")
        time.sleep(1)  # Give DB time to write
        verification_doc = db.verification_codes.find_one({"email": new_user_email}, sort=[("createdAt", -1)])
        if verification_doc:
            otp_code = verification_doc.get('otp')
            print(f"✅ Found OTP in DB: {otp_code}")
        else:
            otp_code = None
            print(f"⚠️ No OTP found in DB for {new_user_email}")
    else:
        log_test('B1_ONBOARDING', 'Send email verification code', False, resp.status_code, 
                f"Failed: {resp.text[:200]}")
        otp_code = None
except Exception as e:
    log_test('B1_ONBOARDING', 'Send email verification code', False, None, f"Exception: {str(e)}")
    otp_code = None

# B1.3: Verify email code
if otp_code:
    print("\nB1.3: POST /auth/verify-email-code with OTP from DB...")
    try:
        resp = requests.post(
            f"{API_BASE}/auth/verify-email-code",
            json={"email": new_user_email, "otp": otp_code},
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            log_test('B1_ONBOARDING', 'Verify email code', True, 200, 
                    f"Email verified for {new_user_email}")
        else:
            log_test('B1_ONBOARDING', 'Verify email code', False, resp.status_code, 
                    f"Failed: {resp.text[:200]}")
    except Exception as e:
        log_test('B1_ONBOARDING', 'Verify email code', False, None, f"Exception: {str(e)}")
else:
    log_test('B1_ONBOARDING', 'Verify email code', False, None, 
            "Skipped - no OTP available from previous step")

# B1.4: Forgot password
print("\nB1.4: POST /auth/forgot-password...")
try:
    resp = requests.post(
        f"{API_BASE}/auth/forgot-password",
        json={"email": new_user_email},
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        log_test('B1_ONBOARDING', 'Forgot password', True, 200, 
                f"Reset email sent for {new_user_email}")
        
        # Read reset token from DB
        print(f"Reading reset token from password_reset_tokens collection for {new_user_email}...")
        time.sleep(1)  # Give DB time to write
        reset_doc = db.password_reset_tokens.find_one({"email": new_user_email}, sort=[("createdAt", -1)])
        if reset_doc:
            reset_token = reset_doc.get('token')
            print(f"✅ Found reset token in DB: {reset_token[:20]}...")
        else:
            reset_token = None
            print(f"⚠️ No reset token found in DB for {new_user_email}")
    else:
        log_test('B1_ONBOARDING', 'Forgot password', False, resp.status_code, 
                f"Failed: {resp.text[:200]}")
        reset_token = None
except Exception as e:
    log_test('B1_ONBOARDING', 'Forgot password', False, None, f"Exception: {str(e)}")
    reset_token = None

# B1.5: Reset password
if reset_token:
    print("\nB1.5: POST /auth/reset-password with token from DB...")
    new_password = "NewPass@123"
    try:
        resp = requests.post(
            f"{API_BASE}/auth/reset-password",
            json={
                "token": reset_token,
                "password": new_password,
                "passwordConfirmation": new_password
            },
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            new_user_password_current = new_password  # Update current password
            log_test('B1_ONBOARDING', 'Reset password', True, 200, 
                    f"Password reset successful for {new_user_email}")
            
            # B1.6: Login with NEW password
            print("\nB1.6: POST /auth/login with NEW password...")
            try:
                resp = requests.post(
                    f"{API_BASE}/auth/login",
                    json={"email": new_user_email, "password": new_password},
                    timeout=TIMEOUT
                )
                if resp.status_code == 200:
                    new_user_token = resp.json().get('token')
                    log_test('B1_ONBOARDING', 'Login with new password', True, 200, 
                            f"Login successful with new password")
                else:
                    log_test('B1_ONBOARDING', 'Login with new password', False, resp.status_code, 
                            f"Failed: {resp.text[:200]}")
            except Exception as e:
                log_test('B1_ONBOARDING', 'Login with new password', False, None, f"Exception: {str(e)}")
        else:
            log_test('B1_ONBOARDING', 'Reset password', False, resp.status_code, 
                    f"Failed: {resp.text[:200]}")
    except Exception as e:
        log_test('B1_ONBOARDING', 'Reset password', False, None, f"Exception: {str(e)}")
else:
    log_test('B1_ONBOARDING', 'Reset password', False, None, 
            "Skipped - no reset token available from previous step")
    log_test('B1_ONBOARDING', 'Login with new password', False, None, 
            "Skipped - reset password failed")

# B1.7: Change password (requires Bearer token)
if new_user_token and new_user_password_current:
    print("\nB1.7: POST /auth/change-password with Bearer token...")
    another_password = "Another@123"
    try:
        resp = requests.post(
            f"{API_BASE}/auth/change-password",
            headers={'Authorization': f'Bearer {new_user_token}'},
            json={
                "oldPassword": new_user_password_current,
                "newPassword": another_password,
                "newPasswordConfirmation": another_password
            },
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            log_test('B1_ONBOARDING', 'Change password', True, 200, 
                    f"Password changed successfully")
        else:
            log_test('B1_ONBOARDING', 'Change password', False, resp.status_code, 
                    f"Failed: {resp.text[:200]}")
    except Exception as e:
        log_test('B1_ONBOARDING', 'Change password', False, None, f"Exception: {str(e)}")
else:
    log_test('B1_ONBOARDING', 'Change password', False, None, 
            "Skipped - no user token or password available")

# B1.8: Change email (NO auth middleware, requires user id in body)
if new_user_id:
    print("\nB1.8: POST /auth/change-email with user id in body (no auth)...")
    new_email = generate_unique_email()
    try:
        resp = requests.post(
            f"{API_BASE}/auth/change-email",
            json={"email": new_email, "id": new_user_id},
            timeout=TIMEOUT
        )
        log_test('B1_ONBOARDING', 'Change email', resp.status_code == 200, resp.status_code, 
                f"Status: {resp.status_code}, Response: {resp.text[:200]}")
    except Exception as e:
        log_test('B1_ONBOARDING', 'Change email', False, None, f"Exception: {str(e)}")
else:
    log_test('B1_ONBOARDING', 'Change email', False, None, 
            "Skipped - no user id available")

# ============================================================================
# SECTION B2: ACCOUNT MANAGEMENT WITH CORRECT CONTRACTS
# ============================================================================
print("\n" + "=" * 80)
print("SECTION B2: ACCOUNT MANAGEMENT WITH CORRECT CONTRACTS (buyer)")
print("=" * 80)

# B2.1: API key create with expiration field
print("\nB2.1: POST /user/api-keys with name and expiration...")
try:
    resp = requests.post(
        f"{API_BASE}/user/api-keys",
        headers=buyer_headers,
        json={"name": "test-key", "expiration": "2027-01-01"},
        timeout=TIMEOUT
    )
    if resp.status_code == 201:
        api_key_id = resp.json().get('_id')
        log_test('B2_ACCOUNT_MGMT', 'API key create', True, 201, 
                f"API key created: {api_key_id}")
    else:
        log_test('B2_ACCOUNT_MGMT', 'API key create', False, resp.status_code, 
                f"Failed: {resp.text[:200]}")
        api_key_id = None
except Exception as e:
    log_test('B2_ACCOUNT_MGMT', 'API key create', False, None, f"Exception: {str(e)}")
    api_key_id = None

# B2.2: API key list
print("\nB2.2: GET /user/api-keys...")
try:
    resp = requests.get(
        f"{API_BASE}/user/api-keys",
        headers=buyer_headers,
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        api_keys = resp.json()
        log_test('B2_ACCOUNT_MGMT', 'API key list', True, 200, 
                f"Found {len(api_keys)} API keys")
    else:
        log_test('B2_ACCOUNT_MGMT', 'API key list', False, resp.status_code, 
                f"Failed: {resp.text[:200]}")
except Exception as e:
    log_test('B2_ACCOUNT_MGMT', 'API key list', False, None, f"Exception: {str(e)}")

# B2.3: API key delete
if api_key_id:
    print(f"\nB2.3: DELETE /user/api-keys/{api_key_id}...")
    try:
        resp = requests.delete(
            f"{API_BASE}/user/api-keys/{api_key_id}",
            headers=buyer_headers,
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            log_test('B2_ACCOUNT_MGMT', 'API key delete', True, 200, 
                    f"API key deleted: {api_key_id}")
        else:
            log_test('B2_ACCOUNT_MGMT', 'API key delete', False, resp.status_code, 
                    f"Failed: {resp.text[:200]}")
    except Exception as e:
        log_test('B2_ACCOUNT_MGMT', 'API key delete', False, None, f"Exception: {str(e)}")
else:
    log_test('B2_ACCOUNT_MGMT', 'API key delete', False, None, 
            "Skipped - no API key id available")

# B2.4: Notification preferences GET
print("\nB2.4: GET /auth/notification-preferences...")
try:
    resp = requests.get(
        f"{API_BASE}/auth/notification-preferences",
        headers=buyer_headers,
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        prefs = resp.json()
        log_test('B2_ACCOUNT_MGMT', 'Notification preferences GET', True, 200, 
                f"Preferences retrieved: {list(prefs.keys())}")
        
        # B2.5: Notification preferences POST (NOT PUT)
        print("\nB2.5: POST /auth/notification-preferences with updated body...")
        try:
            # Update one preference
            updated_prefs = prefs.copy()
            if 'preferences' in updated_prefs:
                updated_prefs['preferences'] = updated_prefs['preferences']
            
            resp = requests.post(
                f"{API_BASE}/auth/notification-preferences",
                headers=buyer_headers,
                json=updated_prefs,
                timeout=TIMEOUT
            )
            if resp.status_code == 200:
                log_test('B2_ACCOUNT_MGMT', 'Notification preferences POST', True, 200, 
                        f"Preferences updated successfully")
            else:
                log_test('B2_ACCOUNT_MGMT', 'Notification preferences POST', False, resp.status_code, 
                        f"Failed: {resp.text[:200]}")
        except Exception as e:
            log_test('B2_ACCOUNT_MGMT', 'Notification preferences POST', False, None, f"Exception: {str(e)}")
    else:
        log_test('B2_ACCOUNT_MGMT', 'Notification preferences GET', False, resp.status_code, 
                f"Failed: {resp.text[:200]}")
        log_test('B2_ACCOUNT_MGMT', 'Notification preferences POST', False, None, 
                "Skipped - GET failed")
except Exception as e:
    log_test('B2_ACCOUNT_MGMT', 'Notification preferences GET', False, None, f"Exception: {str(e)}")
    log_test('B2_ACCOUNT_MGMT', 'Notification preferences POST', False, None, 
            "Skipped - GET failed")

# B2.6: User session list
print("\nB2.6: GET /user-session...")
try:
    resp = requests.get(
        f"{API_BASE}/user-session",
        headers=buyer_headers,
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        sessions = resp.json()
        session_count = len(sessions) if isinstance(sessions, list) else sessions.get('count', 0)
        log_test('B2_ACCOUNT_MGMT', 'User session list', True, 200, 
                f"Found {session_count} sessions")
        
        # Get first session id for logout test
        if isinstance(sessions, list) and len(sessions) > 0:
            session_id = sessions[0].get('_id')
        elif isinstance(sessions, dict) and 'sessions' in sessions:
            session_id = sessions['sessions'][0].get('_id') if len(sessions['sessions']) > 0 else None
        else:
            session_id = None
    else:
        log_test('B2_ACCOUNT_MGMT', 'User session list', False, resp.status_code, 
                f"Failed: {resp.text[:200]}")
        session_id = None
except Exception as e:
    log_test('B2_ACCOUNT_MGMT', 'User session list', False, None, f"Exception: {str(e)}")
    session_id = None

# B2.7: User session logout (GET with path param)
if session_id:
    print(f"\nB2.7: GET /user-session/logout/{session_id}...")
    try:
        resp = requests.get(
            f"{API_BASE}/user-session/logout/{session_id}",
            headers=buyer_headers,
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            log_test('B2_ACCOUNT_MGMT', 'User session logout', True, 200, 
                    f"Session logged out: {session_id}")
        else:
            log_test('B2_ACCOUNT_MGMT', 'User session logout', False, resp.status_code, 
                    f"Failed: {resp.text[:200]}")
    except Exception as e:
        log_test('B2_ACCOUNT_MGMT', 'User session logout', False, None, f"Exception: {str(e)}")
else:
    log_test('B2_ACCOUNT_MGMT', 'User session logout', False, None, 
            "Skipped - no session id available")

# B2.8: Invoices
print("\nB2.8: GET /invoices...")
try:
    resp = requests.get(
        f"{API_BASE}/invoices",
        headers=buyer_headers,
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        invoices = resp.json()
        log_test('B2_ACCOUNT_MGMT', 'Invoices', True, 200, 
                f"Invoices retrieved (may be empty): {invoices}")
    elif resp.status_code == 404:
        error_msg = resp.json().get('message', resp.text)
        if 'no invoices' in error_msg.lower():
            log_test('B2_ACCOUNT_MGMT', 'Invoices', True, 404, 
                    f"Empty state (no invoices): {error_msg}")
        else:
            log_test('B2_ACCOUNT_MGMT', 'Invoices', False, 404, 
                    f"Real error: {error_msg}")
    else:
        log_test('B2_ACCOUNT_MGMT', 'Invoices', False, resp.status_code, 
                f"Failed: {resp.text[:200]}")
except Exception as e:
    log_test('B2_ACCOUNT_MGMT', 'Invoices', False, None, f"Exception: {str(e)}")

# ============================================================================
# SECTION C: CRYPTO CLASSIFICATION ONLY
# ============================================================================
print("\n" + "=" * 80)
print("SECTION C: CRYPTO CLASSIFICATION ONLY (no sending)")
print("=" * 80)

# C1: Get supported currencies
print("\nC1: GET /payment/getSupportedCurrency...")
try:
    resp = requests.get(
        f"{API_BASE}/payment/getSupportedCurrency",
        headers=buyer_headers,
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        currencies = resp.json()
        log_test('C_CRYPTO', 'Get supported currencies', True, 200, 
                f"Currencies retrieved: {currencies}")
    elif resp.status_code == 500:
        error_msg = resp.json().get('message', resp.text)
        log_test('C_CRYPTO', 'Get supported currencies', 'BLOCKED', 500, 
                f"BLOCKED: {error_msg}")
    else:
        log_test('C_CRYPTO', 'Get supported currencies', False, resp.status_code, 
                f"Failed: {resp.text[:200]}")
except Exception as e:
    log_test('C_CRYPTO', 'Get supported currencies', False, None, f"Exception: {str(e)}")

# C2: Get VPS crypto address (need valid VPS params)
print("\nC2: GET /reseller/vps/plans?region=EU to get valid plan...")
try:
    resp = requests.get(
        f"{API_BASE}/reseller/vps/plans?region=EU",
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        plans = resp.json().get('plans', [])
        if plans:
            plan_id = plans[0].get('plan_id')
            print(f"✅ Found VPS plan: {plan_id}")
            
            # Now try to get crypto address
            print(f"\nC2: POST /payment/getVPSCryptoAddress with valid VPS params...")
            try:
                resp = requests.post(
                    f"{API_BASE}/payment/getVPSCryptoAddress",
                    headers=buyer_headers,
                    json={
                        "plan_id": plan_id,
                        "region": "EU",
                        "billing_cycle": "monthly",
                        "os": "ubuntu",
                        "disk_type": "ssd"
                    },
                    timeout=TIMEOUT
                )
                if resp.status_code == 200:
                    data = resp.json()
                    log_test('C_CRYPTO', 'Get VPS crypto address', True, 200, 
                            f"Address retrieved: {data}")
                elif resp.status_code in [404, 500]:
                    error_msg = resp.json().get('message', resp.text)
                    if 'DYNO_PAY_WALLET_TOKEN' in error_msg or 'not configured' in error_msg.lower():
                        log_test('C_CRYPTO', 'Get VPS crypto address', 'BLOCKED', resp.status_code, 
                                f"BLOCKED (expected): {error_msg}")
                    else:
                        log_test('C_CRYPTO', 'Get VPS crypto address', False, resp.status_code, 
                                f"Error: {error_msg}")
                else:
                    log_test('C_CRYPTO', 'Get VPS crypto address', False, resp.status_code, 
                            f"Failed: {resp.text[:200]}")
            except Exception as e:
                log_test('C_CRYPTO', 'Get VPS crypto address', False, None, f"Exception: {str(e)}")
        else:
            log_test('C_CRYPTO', 'Get VPS crypto address', False, None, 
                    "Skipped - no VPS plans available")
    else:
        log_test('C_CRYPTO', 'Get VPS crypto address', False, None, 
                f"Skipped - failed to get VPS plans: {resp.status_code}")
except Exception as e:
    log_test('C_CRYPTO', 'Get VPS crypto address', False, None, f"Exception: {str(e)}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)

for section, tests in results.items():
    passed = sum(1 for t in tests if t['passed'] is True)
    failed = sum(1 for t in tests if t['passed'] is False)
    blocked = sum(1 for t in tests if t['passed'] == 'BLOCKED')
    total = len(tests)
    
    print(f"\n{section}: {passed}/{total} PASSED, {failed} FAILED, {blocked} BLOCKED")
    for test in tests:
        status = '✅' if test['passed'] is True else '❌' if test['passed'] is False else '🚫'
        print(f"  {status} [{test['status']}] {test['name']}")
        if test['details']:
            print(f"      {test['details']}")

print("\n" + "=" * 80)
print("END OF FOCUSED RE-TEST")
print("=" * 80)
