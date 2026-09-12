#!/usr/bin/env python3
"""
Backend test suite for C4/4c/4d:
- Order confirmation email (C4)
- Hosting management with ownership gating (4d)
- Domain DNS ownership gating (4c)

Tests BACKEND ONLY as instructed.
"""

import requests
import json
import sys
import time
import uuid
from typing import Dict, Any, Tuple

# Base URL - using localhost since backend runs on 0.0.0.0:8001
# The external URL routing is not working, so we test locally
BASE_URL = "http://localhost:8001/api/v1"

# Generous timeout for external API proxy (30 seconds)
TIMEOUT = 30

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_section(title: str):
    """Print section header"""
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}{title}{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")

def print_test(test_num: str, description: str):
    """Print test header"""
    print(f"\n{Colors.YELLOW}--- {test_num}: {description} ---{Colors.END}")

def print_pass(message: str):
    """Print pass message"""
    print(f"{Colors.GREEN}✓ PASS: {message}{Colors.END}")

def print_fail(message: str):
    """Print fail message"""
    print(f"{Colors.RED}✗ FAIL: {message}{Colors.END}")

def print_info(message: str):
    """Print info message"""
    print(f"  {message}")

def make_request(method: str, endpoint: str, **kwargs) -> Tuple[int, Dict[Any, Any], str]:
    """
    Make HTTP request and return status, json data, and error message
    """
    url = f"{BASE_URL}{endpoint}"
    print_info(f"{method} {url}")
    
    try:
        if 'timeout' not in kwargs:
            kwargs['timeout'] = TIMEOUT
        
        response = requests.request(method, url, **kwargs)
        status = response.status_code
        
        try:
            data = response.json()
        except:
            data = {"raw_text": response.text[:500]}
        
        return status, data, ""
    except requests.exceptions.Timeout:
        return 0, {}, f"Request timeout after {TIMEOUT}s"
    except Exception as e:
        return 0, {}, str(e)

def login(email: str, password: str) -> str:
    """Login and return Bearer token"""
    status, data, err = make_request(
        "POST",
        "/auth/login",
        json={"email": email, "password": password}
    )
    
    if status != 200:
        print_fail(f"Login failed for {email}: {status} {data}")
        sys.exit(1)
    
    token = data.get("token")
    if not token:
        print_fail(f"No token in login response for {email}")
        sys.exit(1)
    
    print_pass(f"Logged in as {email}")
    return token

def generate_random_domain() -> str:
    """Generate a fresh random domain to avoid 409 duplicate/taken"""
    return f"test-{uuid.uuid4().hex[:12]}.com"

# ============================================================================
# SECTION A: ORDER CONFIRMATION EMAIL (C4) - REGRESSION ONLY
# ============================================================================

def test_order_confirmation_email(buyer_token: str) -> bool:
    """
    Test that order confirmation email is non-blocking.
    Create a domain order, poll until complete, verify order completes
    regardless of email success/failure.
    """
    print_section("SECTION A: ORDER CONFIRMATION EMAIL (C4) - REGRESSION")
    
    headers = {"Authorization": f"Bearer {buyer_token}"}
    domain = generate_random_domain()
    client_order_id = str(uuid.uuid4())
    
    print_test("A1", "Create domain order")
    status, data, err = make_request(
        "POST",
        "/checkout/orders",
        json={
            "items": [{
                "type": "domain",
                "domain": domain,
                "ns_choice": "cloudflare"
            }],
            "client_order_id": client_order_id
        },
        headers=headers
    )
    
    if status != 201:
        print_fail(f"Order creation failed: {status} {data}")
        return False
    
    order_id = data.get("order", {}).get("_id")
    if not order_id:
        print_fail(f"No order ID in response: {data}")
        return False
    
    print_pass(f"Order created: {order_id}")
    print_info(f"Domain: {domain}")
    
    print_test("A2", "Poll order status until provisioning complete")
    max_polls = 15
    poll_interval = 2
    
    for i in range(max_polls):
        time.sleep(poll_interval)
        print_info(f"Poll {i+1}/{max_polls}...")
        
        status, data, err = make_request(
            "GET",
            f"/checkout/orders/{order_id}/status",
            headers=headers
        )
        
        if status != 200:
            print_fail(f"Status poll failed: {status} {data}")
            return False
        
        provisioning = data.get("provisioning")
        settled = data.get("settled")
        items = data.get("items", [])
        
        print_info(f"  provisioning={provisioning}, settled={settled}")
        
        if provisioning == "complete" and settled:
            if not items:
                print_fail("No items in status response")
                return False
            
            item_status = items[0].get("status")
            print_pass(f"Order settled: provisioning={provisioning}, settled={settled}, item.status={item_status}")
            
            # CRITICAL: In dry_run mode, items settle to 'test_mode' (NOT 'failed')
            # The order MUST complete regardless of email success
            if item_status != "test_mode":
                print_fail(f"Expected item.status='test_mode' in dry_run, got '{item_status}'")
                return False
            
            print_pass("Order completed successfully (email is non-blocking)")
            return True
    
    print_fail(f"Order did not settle after {max_polls * poll_interval}s")
    return False

# ============================================================================
# SECTION B: HOSTING MANAGEMENT (4d) - OWNERSHIP GATING
# ============================================================================

def test_hosting_management(owner_a_token: str, owner_b_token: str) -> bool:
    """
    Test hosting management endpoints with ownership gating.
    All tests as c1-owner-a unless specified.
    """
    print_section("SECTION B: HOSTING MANAGEMENT (4d) - OWNERSHIP GATING")
    
    headers_a = {"Authorization": f"Bearer {owner_a_token}"}
    headers_b = {"Authorization": f"Bearer {owner_b_token}"}
    
    # B1: GET /reseller/hosting to capture account username ref
    print_test("B1", "GET /reseller/hosting (as owner-a)")
    status, data, err = make_request(
        "GET",
        "/reseller/hosting",
        headers=headers_a
    )
    
    if status != 200:
        print_fail(f"GET /reseller/hosting failed: {status} {data}")
        return False
    
    accounts = data.get("accounts", [])
    if not accounts:
        print_fail("No hosting accounts found for owner-a")
        return False
    
    username_a = accounts[0].get("username")
    if not username_a:
        print_fail("No username in hosting account")
        return False
    
    print_pass(f"Captured owner-a hosting username: {username_a}")
    print_info(f"  panel_url: {data.get('panel_url')}")
    print_info(f"  server_ip: {data.get('server_ip')}")
    print_info(f"  account count: {len(accounts)}")
    
    # B2: GET /reseller/hosting/:ref (details)
    print_test("B2", f"GET /reseller/hosting/{username_a} (details)")
    status, data, err = make_request(
        "GET",
        f"/reseller/hosting/{username_a}",
        headers=headers_a
    )
    
    if status != 200:
        print_fail(f"GET hosting details failed: {status} {data}")
        return False
    
    if data.get("mode") != "dry_run":
        print_fail(f"Expected mode='dry_run', got '{data.get('mode')}'")
        return False
    
    print_pass(f"Hosting details: mode={data.get('mode')}, username={data.get('username')}, status={data.get('status')}")
    print_info(f"  deliverables: {json.dumps(data.get('deliverables', {}), indent=2)}")
    
    # B3: POST /reseller/hosting/:ref/upgrade
    print_test("B3", f"POST /reseller/hosting/{username_a}/upgrade")
    status, data, err = make_request(
        "POST",
        f"/reseller/hosting/{username_a}/upgrade",
        json={"plan_id": "golden-monthly"},
        headers=headers_a
    )
    
    if status != 200:
        print_fail(f"Upgrade failed: {status} {data}")
        return False
    
    if data.get("mode") != "dry_run" or data.get("status") != "test_mode":
        print_fail(f"Expected dry_run/test_mode response, got: {data}")
        return False
    
    print_pass(f"Upgrade: mode={data.get('mode')}, status={data.get('status')}")
    print_info(f"  message: {data.get('message')}")
    
    # B4: GET /reseller/hosting/:ref/addons
    print_test("B4", f"GET /reseller/hosting/{username_a}/addons")
    status, data, err = make_request(
        "GET",
        f"/reseller/hosting/{username_a}/addons",
        headers=headers_a
    )
    
    if status != 200:
        print_fail(f"GET addons failed: {status} {data}")
        return False
    
    if data.get("mode") != "dry_run":
        print_fail(f"Expected mode='dry_run', got '{data.get('mode')}'")
        return False
    
    print_pass(f"Addons list: mode={data.get('mode')}, addon_count={data.get('addon_count')}")
    
    # B5: POST /reseller/hosting/:ref/addons
    print_test("B5", f"POST /reseller/hosting/{username_a}/addons")
    addon_domain = generate_random_domain()
    status, data, err = make_request(
        "POST",
        f"/reseller/hosting/{username_a}/addons",
        json={"domain": addon_domain},
        headers=headers_a
    )
    
    if status != 200:
        print_fail(f"Add addon failed: {status} {data}")
        return False
    
    if data.get("mode") != "dry_run" or data.get("status") != "test_mode":
        print_fail(f"Expected dry_run/test_mode response, got: {data}")
        return False
    
    print_pass(f"Add addon: mode={data.get('mode')}, status={data.get('status')}")
    
    # B6: OWNERSHIP - try with made-up username (should be 403)
    print_test("B6", "OWNERSHIP - made-up username should return 403")
    fake_username = "nope-not-mine"
    
    # Try GET details
    status, data, err = make_request(
        "GET",
        f"/reseller/hosting/{fake_username}",
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for fake username, got {status}")
        return False
    
    if data.get("error") != "forbidden":
        print_fail(f"Expected error='forbidden', got '{data.get('error')}'")
        return False
    
    print_pass(f"GET /hosting/{fake_username} -> 403 forbidden")
    
    # Try upgrade
    status, data, err = make_request(
        "POST",
        f"/reseller/hosting/{fake_username}/upgrade",
        json={"plan_id": "golden-monthly"},
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for fake username upgrade, got {status}")
        return False
    
    print_pass(f"POST /hosting/{fake_username}/upgrade -> 403 forbidden")
    
    # Try addons
    status, data, err = make_request(
        "GET",
        f"/reseller/hosting/{fake_username}/addons",
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for fake username addons, got {status}")
        return False
    
    print_pass(f"GET /hosting/{fake_username}/addons -> 403 forbidden")
    
    # B7: CAPTCHA - owned domain (c1-owner-a.com)
    print_test("B7", "GET /reseller/hosting/captcha/c1-owner-a.com (owned)")
    status, data, err = make_request(
        "GET",
        "/reseller/hosting/captcha/c1-owner-a.com",
        headers=headers_a
    )
    
    if status != 200:
        print_fail(f"GET captcha for owned domain failed: {status} {data}")
        return False
    
    if data.get("mode") != "dry_run":
        print_fail(f"Expected mode='dry_run', got '{data.get('mode')}'")
        return False
    
    print_pass(f"Captcha GET (owned): mode={data.get('mode')}, domain={data.get('domain')}")
    
    # POST captcha
    print_test("B7b", "POST /reseller/hosting/captcha/c1-owner-a.com (owned)")
    status, data, err = make_request(
        "POST",
        "/reseller/hosting/captcha/c1-owner-a.com",
        json={"enabled": True},
        headers=headers_a
    )
    
    if status != 200:
        print_fail(f"POST captcha for owned domain failed: {status} {data}")
        return False
    
    if data.get("mode") != "dry_run" or data.get("status") != "test_mode":
        print_fail(f"Expected dry_run/test_mode response, got: {data}")
        return False
    
    print_pass(f"Captcha POST (owned): mode={data.get('mode')}, status={data.get('status')}")
    
    # B8: CAPTCHA - not owned domain (should be 403)
    print_test("B8", "GET /reseller/hosting/captcha/not-owned-xyz.com (not owned)")
    status, data, err = make_request(
        "GET",
        "/reseller/hosting/captcha/not-owned-xyz.com",
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for not-owned domain captcha, got {status}")
        return False
    
    if data.get("error") != "forbidden":
        print_fail(f"Expected error='forbidden', got '{data.get('error')}'")
        return False
    
    print_pass("GET captcha for not-owned domain -> 403 forbidden")
    
    # B9: REGRESSION - GET /reseller/hosting/plans (no auth)
    print_test("B9", "REGRESSION - GET /reseller/hosting/plans (no auth)")
    status, data, err = make_request(
        "GET",
        "/reseller/hosting/plans"
    )
    
    if status != 200:
        print_fail(f"GET hosting plans failed: {status} {data}")
        return False
    
    plans = data.get("plans", [])
    if len(plans) != 3:
        print_fail(f"Expected 3 plans, got {len(plans)}")
        return False
    
    print_pass(f"Hosting plans (no auth): {len(plans)} plans")
    
    # B10: REGRESSION - suspend/unsuspend/terminate on made-up username -> 403
    print_test("B10", "REGRESSION - suspend/unsuspend/terminate on fake username -> 403")
    
    status, data, err = make_request(
        "POST",
        f"/reseller/hosting/{fake_username}/suspend",
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for suspend fake username, got {status}")
        return False
    
    print_pass(f"POST /hosting/{fake_username}/suspend -> 403 forbidden")
    
    status, data, err = make_request(
        "POST",
        f"/reseller/hosting/{fake_username}/unsuspend",
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for unsuspend fake username, got {status}")
        return False
    
    print_pass(f"POST /hosting/{fake_username}/unsuspend -> 403 forbidden")
    
    status, data, err = make_request(
        "DELETE",
        f"/reseller/hosting/{fake_username}",
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for terminate fake username, got {status}")
        return False
    
    print_pass(f"DELETE /hosting/{fake_username} -> 403 forbidden")
    
    print_pass("SECTION B: All hosting management tests passed")
    return True

# ============================================================================
# SECTION C: DOMAIN DNS OWNERSHIP-GATING (4c)
# ============================================================================

def test_dns_ownership_gating(owner_a_token: str, owner_b_token: str) -> bool:
    """
    Test DNS endpoints respect domain ownership.
    """
    print_section("SECTION C: DOMAIN DNS OWNERSHIP-GATING (4c)")
    
    headers_a = {"Authorization": f"Bearer {owner_a_token}"}
    
    # C1: GET /reseller/dns/c1-owner-a.com/records (owned - should NOT be 403)
    print_test("C1", "GET /reseller/dns/c1-owner-a.com/records (owned)")
    status, data, err = make_request(
        "GET",
        "/reseller/dns/c1-owner-a.com/records",
        headers=headers_a
    )
    
    # CRITICAL: In dry_run the zone may not exist upstream, so this can be:
    # - 200 (upstream success)
    # - 4xx/5xx (upstream error)
    # The ONLY assertion is it is NOT 403 (ownership check passed)
    if status == 403:
        print_fail(f"GET DNS records for owned domain returned 403 (should pass ownership check)")
        return False
    
    print_pass(f"GET DNS records (owned): status={status} (NOT 403, ownership check passed)")
    print_info(f"  Response: {json.dumps(data, indent=2)[:200]}")
    
    # C2: GET /reseller/dns/c1-owner-b.com/records (not owned - should be 403)
    print_test("C2", "GET /reseller/dns/c1-owner-b.com/records (not owned)")
    status, data, err = make_request(
        "GET",
        "/reseller/dns/c1-owner-b.com/records",
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for not-owned domain DNS, got {status}")
        return False
    
    if data.get("error") != "forbidden":
        print_fail(f"Expected error='forbidden', got '{data.get('error')}'")
        return False
    
    print_pass("GET DNS records (not owned) -> 403 forbidden")
    
    # C3: PUT /reseller/dns/c1-owner-b.com/nameservers (not owned - should be 403)
    print_test("C3", "PUT /reseller/dns/c1-owner-b.com/nameservers (not owned)")
    status, data, err = make_request(
        "PUT",
        "/reseller/dns/c1-owner-b.com/nameservers",
        json={"nameservers": ["ns1.x.com", "ns2.x.com"]},
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for not-owned domain nameservers, got {status}")
        return False
    
    if data.get("error") != "forbidden":
        print_fail(f"Expected error='forbidden', got '{data.get('error')}'")
        return False
    
    print_pass("PUT nameservers (not owned) -> 403 forbidden")
    
    # C4: POST /reseller/dns/some-random-unowned.com/records (not owned - should be 403)
    print_test("C4", "POST /reseller/dns/some-random-unowned.com/records (not owned)")
    status, data, err = make_request(
        "POST",
        "/reseller/dns/some-random-unowned.com/records",
        json={"type": "A", "name": "@", "value": "1.2.3.4"},
        headers=headers_a
    )
    
    if status != 403:
        print_fail(f"Expected 403 for random unowned domain DNS, got {status}")
        return False
    
    if data.get("error") != "forbidden":
        print_fail(f"Expected error='forbidden', got '{data.get('error')}'")
        return False
    
    print_pass("POST DNS record (random unowned) -> 403 forbidden")
    
    print_pass("SECTION C: All DNS ownership-gating tests passed")
    return True

# ============================================================================
# MAIN
# ============================================================================

def main():
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}C4/4c/4d BACKEND TEST SUITE{Colors.END}")
    print(f"{Colors.BLUE}Testing: Order confirmation email + Hosting management + DNS ownership{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    
    # Login
    print_section("SETUP: Login")
    buyer_token = login("buyer@nameword.local", "Buyer@12345")
    owner_a_token = login("c1-owner-a@nameword.local", "Owner@12345")
    owner_b_token = login("c1-owner-b@nameword.local", "Owner@12345")
    
    # Run tests
    results = []
    
    # Section A: Order confirmation email
    results.append(("A: Order confirmation email", test_order_confirmation_email(buyer_token)))
    
    # Section B: Hosting management
    results.append(("B: Hosting management", test_hosting_management(owner_a_token, owner_b_token)))
    
    # Section C: DNS ownership gating
    results.append(("C: DNS ownership gating", test_dns_ownership_gating(owner_a_token, owner_b_token)))
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = f"{Colors.GREEN}✓ PASS{Colors.END}" if result else f"{Colors.RED}✗ FAIL{Colors.END}"
        print(f"{status}: {name}")
    
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    if passed == total:
        print(f"{Colors.GREEN}ALL TESTS PASSED: {passed}/{total}{Colors.END}")
        print(f"{Colors.BLUE}{'='*80}{Colors.END}")
        sys.exit(0)
    else:
        print(f"{Colors.RED}SOME TESTS FAILED: {passed}/{total} passed{Colors.END}")
        print(f"{Colors.BLUE}{'='*80}{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    main()
