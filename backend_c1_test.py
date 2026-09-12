#!/usr/bin/env python3
"""
C1 Ownership-scoping Backend Test
Tests that "my X" lists and management actions are scoped to the buyer's own Order records.
"""

import requests
import sys
import time
from urllib.parse import quote

# Base URL for internal testing
BASE_URL = "http://localhost:8001/api/v1"

# Test credentials (seeded by seed_c1_test.js)
OWNER_A = {
    "email": "c1-owner-a@nameword.local",
    "password": "Owner@12345",
    "domain": "c1-owner-a.com"
}

OWNER_B = {
    "email": "c1-owner-b@nameword.local",
    "password": "Owner@12345",
    "domain": "c1-owner-b.com"
}

TIMEOUT = 30  # 30s timeout for upstream provider latency

def login(email, password):
    """Login and return Bearer token"""
    print(f"\n🔐 Logging in as {email}...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"   ❌ Login failed: {resp.text}")
        return None
    data = resp.json()
    token = data.get("token")
    if not token:
        print(f"   ❌ No token in response: {data}")
        return None
    print(f"   ✅ Login successful")
    return token

def auth_headers(token):
    """Return Authorization header"""
    return {"Authorization": f"Bearer {token}"}

def test_scoped_lists():
    """TEST 1: SCOPED LISTS - login as A, verify only A's resources"""
    print("\n" + "="*80)
    print("TEST 1: SCOPED LISTS (login as Owner A)")
    print("="*80)
    
    token_a = login(OWNER_A["email"], OWNER_A["password"])
    if not token_a:
        return False
    
    headers = auth_headers(token_a)
    
    # 1a. GET /reseller/domains -> should contain ONLY c1-owner-a.com
    print("\n📋 TEST 1a: GET /reseller/domains (should contain ONLY c1-owner-a.com)")
    resp = requests.get(f"{BASE_URL}/reseller/domains", headers=headers, timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    data = resp.json()
    domains = data.get("domains", [])
    count = data.get("count", 0)
    print(f"   Domains count: {count}")
    print(f"   Domains: {[d.get('domain') for d in domains]}")
    
    if count != 1:
        print(f"   ❌ FAILED: Expected count=1, got {count}")
        return False
    
    if not any(d.get("domain") == OWNER_A["domain"] for d in domains):
        print(f"   ❌ FAILED: {OWNER_A['domain']} not found in domains list")
        return False
    
    if any(d.get("domain") == OWNER_B["domain"] for d in domains):
        print(f"   ❌ CRITICAL SECURITY ISSUE: {OWNER_B['domain']} found in A's list!")
        return False
    
    print(f"   ✅ PASSED: Only {OWNER_A['domain']} in list, {OWNER_B['domain']} NOT present")
    
    # 1b. GET /reseller/vps -> should return exactly 1 item
    print("\n📋 TEST 1b: GET /reseller/vps (should return exactly 1 item)")
    resp = requests.get(f"{BASE_URL}/reseller/vps", headers=headers, timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    data = resp.json()
    vps_list = data.get("vps", [])
    count = data.get("count", 0)
    print(f"   VPS count: {count}")
    
    if count != 1:
        print(f"   ❌ FAILED: Expected count=1, got {count}")
        return False
    
    if len(vps_list) == 0:
        print(f"   ❌ FAILED: VPS list is empty")
        return False
    
    a_vps_id = vps_list[0].get("id")
    print(f"   VPS ID: {a_vps_id}")
    print(f"   VPS hostname: {vps_list[0].get('hostname')}")
    print(f"   VPS status: {vps_list[0].get('status')}")
    print(f"   ✅ PASSED: Exactly 1 VPS in list")
    
    # 1c. GET /reseller/hosting -> should return exactly 1 account
    print("\n📋 TEST 1c: GET /reseller/hosting (should return exactly 1 account)")
    resp = requests.get(f"{BASE_URL}/reseller/hosting", headers=headers, timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    data = resp.json()
    accounts = data.get("accounts", [])
    count = data.get("count", 0)
    print(f"   Hosting accounts count: {count}")
    
    if count != 1:
        print(f"   ❌ FAILED: Expected count=1, got {count}")
        return False
    
    if len(accounts) == 0:
        print(f"   ❌ FAILED: Accounts list is empty")
        return False
    
    a_host_user = accounts[0].get("username")
    print(f"   Hosting username: {a_host_user}")
    print(f"   Hosting domain: {accounts[0].get('domain')}")
    print(f"   Hosting status: {accounts[0].get('status')}")
    print(f"   ✅ PASSED: Exactly 1 hosting account in list")
    
    # 1d. GET /reseller/rdp -> should return empty (A has no RDP order)
    print("\n📋 TEST 1d: GET /reseller/rdp (should return empty, A has no RDP)")
    resp = requests.get(f"{BASE_URL}/reseller/rdp", headers=headers, timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False
    
    data = resp.json()
    rdp_list = data.get("rdp", [])
    count = data.get("count", 0)
    print(f"   RDP count: {count}")
    
    if count != 0:
        print(f"   ❌ FAILED: Expected count=0, got {count}")
        return False
    
    print(f"   ✅ PASSED: RDP list is empty (A has no RDP order)")
    
    return {"a_vps_id": a_vps_id, "a_host_user": a_host_user, "token_a": token_a}

def test_owner_b_resources():
    """TEST 2: Login as B and capture B's resources"""
    print("\n" + "="*80)
    print("TEST 2: CAPTURE OWNER B RESOURCES")
    print("="*80)
    
    token_b = login(OWNER_B["email"], OWNER_B["password"])
    if not token_b:
        return False
    
    headers = auth_headers(token_b)
    
    # 2a. GET /reseller/domains -> should contain ONLY c1-owner-b.com
    print("\n📋 TEST 2a: GET /reseller/domains (should contain ONLY c1-owner-b.com)")
    resp = requests.get(f"{BASE_URL}/reseller/domains", headers=headers, timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        return False
    
    data = resp.json()
    domains = data.get("domains", [])
    count = data.get("count", 0)
    print(f"   Domains count: {count}")
    print(f"   Domains: {[d.get('domain') for d in domains]}")
    
    if count != 1:
        print(f"   ❌ FAILED: Expected count=1, got {count}")
        return False
    
    if not any(d.get("domain") == OWNER_B["domain"] for d in domains):
        print(f"   ❌ FAILED: {OWNER_B['domain']} not found in domains list")
        return False
    
    if any(d.get("domain") == OWNER_A["domain"] for d in domains):
        print(f"   ❌ CRITICAL SECURITY ISSUE: {OWNER_A['domain']} found in B's list!")
        return False
    
    print(f"   ✅ PASSED: Only {OWNER_B['domain']} in list")
    
    # 2b. GET /reseller/vps -> capture B's VPS ID
    print("\n📋 TEST 2b: GET /reseller/vps (capture B's VPS ID)")
    resp = requests.get(f"{BASE_URL}/reseller/vps", headers=headers, timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        return False
    
    data = resp.json()
    vps_list = data.get("vps", [])
    if len(vps_list) == 0:
        print(f"   ❌ FAILED: B's VPS list is empty")
        return False
    
    b_vps_id = vps_list[0].get("id")
    print(f"   B's VPS ID: {b_vps_id}")
    print(f"   ✅ PASSED: Captured B's VPS ID")
    
    # 2c. GET /reseller/hosting -> capture B's hosting username
    print("\n📋 TEST 2c: GET /reseller/hosting (capture B's hosting username)")
    resp = requests.get(f"{BASE_URL}/reseller/hosting", headers=headers, timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        return False
    
    data = resp.json()
    accounts = data.get("accounts", [])
    if len(accounts) == 0:
        print(f"   ❌ FAILED: B's hosting accounts list is empty")
        return False
    
    b_host_user = accounts[0].get("username")
    print(f"   B's Hosting username: {b_host_user}")
    print(f"   ✅ PASSED: Captured B's hosting username")
    
    return {"b_vps_id": b_vps_id, "b_host_user": b_host_user}

def test_cross_owner_rejection(a_data, b_data):
    """TEST 3: CROSS-OWNER REJECTION - A tries to act on B's resources -> 403"""
    print("\n" + "="*80)
    print("TEST 3: CROSS-OWNER REJECTION (A acts on B's resources -> 403)")
    print("="*80)
    
    token_a = a_data["token_a"]
    headers = auth_headers(token_a)
    b_vps_id = b_data["b_vps_id"]
    b_host_user = b_data["b_host_user"]
    
    # URL-encode the IDs since they contain ':'
    b_vps_id_enc = quote(b_vps_id, safe='')
    b_host_user_enc = quote(b_host_user, safe='')
    
    tests = []
    
    # 3a. POST /reseller/vps/<B_VPS_ID>/action
    print(f"\n📋 TEST 3a: POST /reseller/vps/{b_vps_id}/action (reboot)")
    resp = requests.post(
        f"{BASE_URL}/reseller/vps/{b_vps_id_enc}/action",
        headers=headers,
        json={"action": "reboot"},
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.json()}")
    if resp.status_code != 403:
        print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
        tests.append(False)
    else:
        data = resp.json()
        if data.get("error") != "forbidden":
            print(f"   ❌ FAILED: Expected error='forbidden', got {data.get('error')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 403 forbidden")
            tests.append(True)
    
    # 3b. DELETE /reseller/vps/<B_VPS_ID>
    print(f"\n📋 TEST 3b: DELETE /reseller/vps/{b_vps_id}")
    resp = requests.delete(
        f"{BASE_URL}/reseller/vps/{b_vps_id_enc}",
        headers=headers,
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.json()}")
    if resp.status_code != 403:
        print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
        tests.append(False)
    else:
        data = resp.json()
        if data.get("error") != "forbidden":
            print(f"   ❌ FAILED: Expected error='forbidden', got {data.get('error')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 403 forbidden")
            tests.append(True)
    
    # 3c. GET /reseller/vps/<B_VPS_ID>/credentials
    print(f"\n📋 TEST 3c: GET /reseller/vps/{b_vps_id}/credentials")
    resp = requests.get(
        f"{BASE_URL}/reseller/vps/{b_vps_id_enc}/credentials",
        headers=headers,
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.json()}")
    if resp.status_code != 403:
        print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
        tests.append(False)
    else:
        data = resp.json()
        if data.get("error") != "forbidden":
            print(f"   ❌ FAILED: Expected error='forbidden', got {data.get('error')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 403 forbidden")
            tests.append(True)
    
    # 3d. POST /reseller/hosting/<B_HOST_USER>/suspend
    print(f"\n📋 TEST 3d: POST /reseller/hosting/{b_host_user}/suspend")
    resp = requests.post(
        f"{BASE_URL}/reseller/hosting/{b_host_user_enc}/suspend",
        headers=headers,
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.json()}")
    if resp.status_code != 403:
        print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
        tests.append(False)
    else:
        data = resp.json()
        if data.get("error") != "forbidden":
            print(f"   ❌ FAILED: Expected error='forbidden', got {data.get('error')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 403 forbidden")
            tests.append(True)
    
    # 3e. DELETE /reseller/hosting/<B_HOST_USER>
    print(f"\n📋 TEST 3e: DELETE /reseller/hosting/{b_host_user}")
    resp = requests.delete(
        f"{BASE_URL}/reseller/hosting/{b_host_user_enc}",
        headers=headers,
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.json()}")
    if resp.status_code != 403:
        print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
        tests.append(False)
    else:
        data = resp.json()
        if data.get("error") != "forbidden":
            print(f"   ❌ FAILED: Expected error='forbidden', got {data.get('error')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 403 forbidden")
            tests.append(True)
    
    # 3f. POST /reseller/vps/made-up-fake-id-123/action
    print(f"\n📋 TEST 3f: POST /reseller/vps/made-up-fake-id-123/action (fake ID)")
    resp = requests.post(
        f"{BASE_URL}/reseller/vps/made-up-fake-id-123/action",
        headers=headers,
        json={"action": "reboot"},
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.json()}")
    if resp.status_code != 403:
        print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
        tests.append(False)
    else:
        data = resp.json()
        if data.get("error") != "forbidden":
            print(f"   ❌ FAILED: Expected error='forbidden', got {data.get('error')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 403 forbidden")
            tests.append(True)
    
    # 3g. POST /reseller/rdp/made-up-rdp-id/action
    print(f"\n📋 TEST 3g: POST /reseller/rdp/made-up-rdp-id/action (fake RDP ID)")
    resp = requests.post(
        f"{BASE_URL}/reseller/rdp/made-up-rdp-id/action",
        headers=headers,
        json={"action": "reboot"},
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.json()}")
    if resp.status_code != 403:
        print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
        tests.append(False)
    else:
        data = resp.json()
        if data.get("error") != "forbidden":
            print(f"   ❌ FAILED: Expected error='forbidden', got {data.get('error')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 403 forbidden")
            tests.append(True)
    
    passed = sum(tests)
    total = len(tests)
    print(f"\n📊 CROSS-OWNER REJECTION: {passed}/{total} tests passed")
    return all(tests)

def test_own_item_dry_run(a_data):
    """TEST 4: OWN-ITEM DRY-RUN - A acts on A's own resources -> 200"""
    print("\n" + "="*80)
    print("TEST 4: OWN-ITEM DRY-RUN (A acts on A's own resources -> 200)")
    print("="*80)
    
    token_a = a_data["token_a"]
    headers = auth_headers(token_a)
    a_vps_id = a_data["a_vps_id"]
    a_host_user = a_data["a_host_user"]
    
    # URL-encode the IDs
    a_vps_id_enc = quote(a_vps_id, safe='')
    a_host_user_enc = quote(a_host_user, safe='')
    
    tests = []
    
    # 4a. POST /reseller/vps/<A_VPS_ID>/action
    print(f"\n📋 TEST 4a: POST /reseller/vps/{a_vps_id}/action (reboot)")
    resp = requests.post(
        f"{BASE_URL}/reseller/vps/{a_vps_id_enc}/action",
        headers=headers,
        json={"action": "reboot"},
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        tests.append(False)
    else:
        if data.get("mode") != "dry_run":
            print(f"   ❌ FAILED: Expected mode='dry_run', got {data.get('mode')}")
            tests.append(False)
        elif data.get("status") != "test_mode":
            print(f"   ❌ FAILED: Expected status='test_mode', got {data.get('status')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 200 with mode='dry_run', status='test_mode'")
            tests.append(True)
    
    # 4b. GET /reseller/vps/<A_VPS_ID>/credentials
    print(f"\n📋 TEST 4b: GET /reseller/vps/{a_vps_id}/credentials")
    resp = requests.get(
        f"{BASE_URL}/reseller/vps/{a_vps_id_enc}/credentials",
        headers=headers,
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        tests.append(False)
    else:
        if data.get("mode") != "dry_run":
            print(f"   ❌ FAILED: Expected mode='dry_run', got {data.get('mode')}")
            tests.append(False)
        elif data.get("password") is not None:
            print(f"   ❌ FAILED: Expected password=null, got {data.get('password')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 200 with mode='dry_run', password=null")
            tests.append(True)
    
    # 4c. POST /reseller/hosting/<A_HOST_USER>/suspend
    print(f"\n📋 TEST 4c: POST /reseller/hosting/{a_host_user}/suspend")
    resp = requests.post(
        f"{BASE_URL}/reseller/hosting/{a_host_user_enc}/suspend",
        headers=headers,
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        tests.append(False)
    else:
        if data.get("mode") != "dry_run":
            print(f"   ❌ FAILED: Expected mode='dry_run', got {data.get('mode')}")
            tests.append(False)
        elif data.get("status") != "test_mode":
            print(f"   ❌ FAILED: Expected status='test_mode', got {data.get('status')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 200 with mode='dry_run', status='test_mode'")
            tests.append(True)
    
    # 4d. GET /reseller/hosting/<A_HOST_USER>/credentials
    print(f"\n📋 TEST 4d: GET /reseller/hosting/{a_host_user}/credentials")
    resp = requests.get(
        f"{BASE_URL}/reseller/hosting/{a_host_user_enc}/credentials",
        headers=headers,
        timeout=TIMEOUT
    )
    print(f"   Status: {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        tests.append(False)
    else:
        if data.get("mode") != "dry_run":
            print(f"   ❌ FAILED: Expected mode='dry_run', got {data.get('mode')}")
            tests.append(False)
        elif data.get("password") is not None:
            print(f"   ❌ FAILED: Expected password=null, got {data.get('password')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 200 with mode='dry_run', password=null")
            tests.append(True)
    
    passed = sum(tests)
    total = len(tests)
    print(f"\n📊 OWN-ITEM DRY-RUN: {passed}/{total} tests passed")
    return all(tests)

def test_public_endpoints():
    """TEST 5: PUBLIC ENDPOINTS STILL OPEN (no auth header) -> 200"""
    print("\n" + "="*80)
    print("TEST 5: PUBLIC ENDPOINTS (no auth header -> 200)")
    print("="*80)
    
    tests = []
    
    # 5a. GET /reseller/health
    print(f"\n📋 TEST 5a: GET /reseller/health (no auth)")
    resp = requests.get(f"{BASE_URL}/reseller/health", timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        tests.append(False)
    else:
        if not data.get("ok"):
            print(f"   ❌ FAILED: Expected ok=true, got {data.get('ok')}")
            tests.append(False)
        elif data.get("mode") != "dry_run":
            print(f"   ❌ FAILED: Expected mode='dry_run', got {data.get('mode')}")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 200 with ok=true, mode='dry_run'")
            tests.append(True)
    
    # 5b. GET /reseller/vps/plans?region=EU
    print(f"\n📋 TEST 5b: GET /reseller/vps/plans?region=EU (no auth)")
    resp = requests.get(f"{BASE_URL}/reseller/vps/plans?region=EU", timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    data = resp.json()
    plans = data.get("plans", [])
    print(f"   Plans count: {len(plans)}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        tests.append(False)
    else:
        if len(plans) == 0:
            print(f"   ❌ FAILED: Expected non-empty plans array")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 200 with {len(plans)} plans")
            tests.append(True)
    
    # 5c. GET /reseller/hosting/plans
    print(f"\n📋 TEST 5c: GET /reseller/hosting/plans (no auth)")
    resp = requests.get(f"{BASE_URL}/reseller/hosting/plans", timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    data = resp.json()
    plans = data.get("plans", [])
    print(f"   Plans count: {len(plans)}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        tests.append(False)
    else:
        if len(plans) == 0:
            print(f"   ❌ FAILED: Expected non-empty plans array")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 200 with {len(plans)} plans")
            tests.append(True)
    
    # 5d. GET /reseller/domains/search?domain=coolstartup2026.com
    print(f"\n📋 TEST 5d: GET /reseller/domains/search?domain=coolstartup2026.com (no auth)")
    resp = requests.get(f"{BASE_URL}/reseller/domains/search?domain=coolstartup2026.com", timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    if resp.status_code != 200:
        print(f"   ❌ FAILED: Expected 200, got {resp.status_code}")
        tests.append(False)
    else:
        if "available" not in data:
            print(f"   ❌ FAILED: Expected 'available' field in response")
            tests.append(False)
        elif "price_usd" not in data:
            print(f"   ❌ FAILED: Expected 'price_usd' field in response")
            tests.append(False)
        else:
            print(f"   ✅ PASSED: 200 with available={data.get('available')}, price_usd={data.get('price_usd')}")
            tests.append(True)
    
    passed = sum(tests)
    total = len(tests)
    print(f"\n📊 PUBLIC ENDPOINTS: {passed}/{total} tests passed")
    return all(tests)

def test_auth_required():
    """TEST 6: AUTH REQUIRED - GET /reseller/vps with NO Authorization header -> 401"""
    print("\n" + "="*80)
    print("TEST 6: AUTH REQUIRED (no auth header -> 401)")
    print("="*80)
    
    print(f"\n📋 TEST 6: GET /reseller/vps (no Authorization header)")
    resp = requests.get(f"{BASE_URL}/reseller/vps", timeout=TIMEOUT)
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.text[:200]}")
    
    # Accept 401 or 400 (some auth middleware returns 400 with "No API key provided")
    if resp.status_code not in [400, 401]:
        print(f"   ❌ FAILED: Expected 401 or 400, got {resp.status_code}")
        return False
    
    print(f"   ✅ PASSED: {resp.status_code} (auth required)")
    return True

def main():
    print("\n" + "="*80)
    print("C1 OWNERSHIP-SCOPING BACKEND TEST")
    print("Testing that 'my X' lists and management actions are scoped to buyer")
    print("="*80)
    
    results = []
    
    # TEST 1: SCOPED LISTS (login as A)
    a_data = test_scoped_lists()
    if not a_data:
        print("\n❌ TEST 1 FAILED")
        results.append(False)
    else:
        print("\n✅ TEST 1 PASSED")
        results.append(True)
    
    # TEST 2: Capture B's resources
    b_data = test_owner_b_resources()
    if not b_data:
        print("\n❌ TEST 2 FAILED")
        results.append(False)
    else:
        print("\n✅ TEST 2 PASSED")
        results.append(True)
    
    # TEST 3: CROSS-OWNER REJECTION
    if a_data and b_data:
        result = test_cross_owner_rejection(a_data, b_data)
        results.append(result)
        if result:
            print("\n✅ TEST 3 PASSED")
        else:
            print("\n❌ TEST 3 FAILED")
    else:
        print("\n⚠️  TEST 3 SKIPPED (missing data from TEST 1 or 2)")
        results.append(False)
    
    # TEST 4: OWN-ITEM DRY-RUN
    if a_data:
        result = test_own_item_dry_run(a_data)
        results.append(result)
        if result:
            print("\n✅ TEST 4 PASSED")
        else:
            print("\n❌ TEST 4 FAILED")
    else:
        print("\n⚠️  TEST 4 SKIPPED (missing data from TEST 1)")
        results.append(False)
    
    # TEST 5: PUBLIC ENDPOINTS
    result = test_public_endpoints()
    results.append(result)
    if result:
        print("\n✅ TEST 5 PASSED")
    else:
        print("\n❌ TEST 5 FAILED")
    
    # TEST 6: AUTH REQUIRED
    result = test_auth_required()
    results.append(result)
    if result:
        print("\n✅ TEST 6 PASSED")
    else:
        print("\n❌ TEST 6 FAILED")
    
    # FINAL SUMMARY
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    passed = sum(results)
    total = len(results)
    print(f"\n📊 OVERALL: {passed}/{total} test sections passed")
    
    if all(results):
        print("\n🎉 ALL TESTS PASSED - C1 OWNERSHIP-SCOPING IS WORKING CORRECTLY")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED - SEE DETAILS ABOVE")
        return 1

if __name__ == "__main__":
    sys.exit(main())
