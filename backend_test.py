#!/usr/bin/env python3
"""
Backend test suite for Nomadly Reseller API proxy endpoints.
Tests all public endpoints with generous timeout for external API calls.
"""

import requests
import json
import sys
from typing import Dict, Any, Tuple

# Base URL from frontend/.env
BASE_URL = "https://hosting-platform-15.preview.emergentagent.com/api/v1/reseller"

# Generous timeout for external API proxy (30 seconds)
TIMEOUT = 30

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(test_num: int, description: str):
    """Print test header"""
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}TEST {test_num}: {description}{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")

def print_pass(message: str):
    """Print pass message"""
    print(f"{Colors.GREEN}✓ PASS: {message}{Colors.END}")

def print_fail(message: str):
    """Print fail message"""
    print(f"{Colors.RED}✗ FAIL: {message}{Colors.END}")

def print_info(message: str):
    """Print info message"""
    print(f"{Colors.YELLOW}ℹ INFO: {message}{Colors.END}")

def make_request(method: str, endpoint: str, **kwargs) -> Tuple[int, Dict[Any, Any], str]:
    """
    Make HTTP request and return status, json data, and error message
    """
    url = f"{BASE_URL}{endpoint}"
    print_info(f"{method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=TIMEOUT, **kwargs)
        elif method == "POST":
            response = requests.post(url, timeout=TIMEOUT, **kwargs)
        elif method == "DELETE":
            response = requests.delete(url, timeout=TIMEOUT, **kwargs)
        else:
            return 0, {}, f"Unsupported method: {method}"
        
        print_info(f"Status: {response.status_code}")
        
        try:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)[:500]}...")
            return response.status_code, data, ""
        except:
            print_info(f"Response (non-JSON): {response.text[:500]}")
            return response.status_code, {}, "Response is not JSON"
            
    except requests.exceptions.Timeout:
        return 0, {}, f"Request timeout after {TIMEOUT}s"
    except requests.exceptions.RequestException as e:
        return 0, {}, f"Request failed: {str(e)}"

def test_1_health():
    """Test 1: GET /reseller/health"""
    print_test(1, "GET /reseller/health - Health check endpoint")
    
    status, data, error = make_request("GET", "/health")
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    # Check for required fields
    if "ok" not in data:
        print_fail("Response missing 'ok' field")
        return False
    
    if data.get("ok") != True:
        print_fail(f"Expected ok=true, got ok={data.get('ok')}")
        return False
    
    print_pass(f"ok field is true")
    
    if "mode" not in data:
        print_fail("Response missing 'mode' field")
        return False
    
    print_pass(f"mode field present: {data.get('mode')}")
    
    if data.get("mode") == "dry_run":
        print_pass("Provider is in dry_run mode (expected)")
    else:
        print_info(f"Provider mode: {data.get('mode')}")
    
    if "products" in data and isinstance(data["products"], list):
        print_pass(f"products array present with {len(data['products'])} items")
        if "vps" in data["products"] and "rdp" in data["products"]:
            print_pass("products includes 'vps' and 'rdp'")
        else:
            print_info(f"products: {data['products']}")
    
    return True

def test_2_account():
    """Test 2: GET /reseller/account"""
    print_test(2, "GET /reseller/account - Account info endpoint")
    
    status, data, error = make_request("GET", "/account")
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    if "wallet_balance_usd" not in data:
        print_fail("Response missing 'wallet_balance_usd' field")
        return False
    
    wallet_balance = data.get("wallet_balance_usd")
    if not isinstance(wallet_balance, (int, float)):
        print_fail(f"wallet_balance_usd should be a number, got {type(wallet_balance)}")
        return False
    
    print_pass(f"wallet_balance_usd is a number: {wallet_balance}")
    
    if "mode" in data:
        print_pass(f"mode field present: {data.get('mode')}")
    
    return True

def test_3_vps_plans_eu():
    """Test 3: GET /reseller/vps/plans?region=EU"""
    print_test(3, "GET /reseller/vps/plans?region=EU - VPS plans for EU region")
    
    status, data, error = make_request("GET", "/vps/plans", params={"region": "EU"})
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    if "plans" not in data:
        print_fail("Response missing 'plans' field")
        return False
    
    plans = data.get("plans")
    if not isinstance(plans, list):
        print_fail(f"plans should be an array, got {type(plans)}")
        return False
    
    if len(plans) == 0:
        print_fail("plans array is empty (expected non-empty for EU region)")
        return False
    
    print_pass(f"plans array is non-empty with {len(plans)} plans")
    
    # Check first plan structure
    first_plan = plans[0]
    required_fields = ["plan_id", "ram_gb", "disk_gb", "price_usd"]
    
    for field in required_fields:
        if field not in first_plan:
            print_fail(f"First plan missing '{field}' field")
            return False
    
    print_pass(f"First plan has all required fields: {required_fields}")
    
    if not isinstance(first_plan.get("price_usd"), (int, float)):
        print_fail(f"price_usd should be a number, got {type(first_plan.get('price_usd'))}")
        return False
    
    print_pass(f"price_usd is a number: {first_plan.get('price_usd')}")
    print_info(f"Sample plan: {json.dumps(first_plan, indent=2)}")
    
    return True

def test_4_vps_plans_sg():
    """Test 4: GET /reseller/vps/plans?region=SG"""
    print_test(4, "GET /reseller/vps/plans?region=SG - VPS plans for SG region")
    
    status, data, error = make_request("GET", "/vps/plans", params={"region": "SG"})
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    if "plans" not in data:
        print_fail("Response missing 'plans' field")
        return False
    
    plans = data.get("plans")
    if not isinstance(plans, list):
        print_fail(f"plans should be an array, got {type(plans)}")
        return False
    
    if len(plans) == 0:
        print_fail("plans array is empty (expected non-empty for SG region)")
        return False
    
    print_pass(f"plans array is non-empty with {len(plans)} plans")
    
    return True

def test_5_vps_plans_unknown():
    """Test 5: GET /reseller/vps/plans?region=ZZ (unknown region)"""
    print_test(5, "GET /reseller/vps/plans?region=ZZ - Unknown region handling")
    
    status, data, error = make_request("GET", "/vps/plans", params={"region": "ZZ"})
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status} (should not error on unknown region)")
    
    if "plans" not in data:
        print_fail("Response missing 'plans' field")
        return False
    
    plans = data.get("plans")
    if not isinstance(plans, list):
        print_fail(f"plans should be an array, got {type(plans)}")
        return False
    
    print_pass(f"plans is an array (likely empty): {len(plans)} plans")
    
    return True

def test_6_vps_create_dry_run():
    """Test 6: POST /reseller/vps - Create VPS in dry_run mode"""
    print_test(6, "POST /reseller/vps - Create VPS (dry_run mode)")
    
    # Get initial wallet balance
    _, account_data, _ = make_request("GET", "/account")
    initial_balance = account_data.get("wallet_balance_usd", 0)
    print_info(f"Initial wallet balance: ${initial_balance}")
    
    payload = {
        "plan_id": "s-1vcpu-1gb",
        "region": "EU",
        "hostname": "test-01"
    }
    
    status, data, error = make_request("POST", "/vps", json=payload)
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    if "mode" not in data:
        print_fail("Response missing 'mode' field")
        return False
    
    if data.get("mode") != "dry_run":
        print_fail(f"Expected mode='dry_run', got mode='{data.get('mode')}'")
        return False
    
    print_pass(f"mode is 'dry_run' (no real resource created)")
    
    if "price_usd" not in data:
        print_fail("Response missing 'price_usd' field")
        return False
    
    print_pass(f"price_usd present: ${data.get('price_usd')}")
    
    if "would_provision" not in data:
        print_fail("Response missing 'would_provision' field")
        return False
    
    print_pass(f"would_provision field present (dry_run preview)")
    
    # Verify wallet balance unchanged
    _, account_data_after, _ = make_request("GET", "/account")
    final_balance = account_data_after.get("wallet_balance_usd", 0)
    
    if initial_balance == final_balance:
        print_pass(f"Wallet balance unchanged: ${final_balance} (no charge in dry_run)")
    else:
        print_fail(f"Wallet balance changed from ${initial_balance} to ${final_balance} (should not charge in dry_run)")
        return False
    
    return True

def test_7_vps_list():
    """Test 7: GET /reseller/vps - List VPS instances"""
    print_test(7, "GET /reseller/vps - List VPS instances")
    
    status, data, error = make_request("GET", "/vps")
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    if "vps" not in data:
        print_fail("Response missing 'vps' field")
        return False
    
    vps_list = data.get("vps")
    if not isinstance(vps_list, list):
        print_fail(f"vps should be an array, got {type(vps_list)}")
        return False
    
    print_pass(f"vps is an array with {len(vps_list)} instances")
    
    if len(vps_list) == 0:
        print_pass("vps array is empty (expected in dry_run mode)")
    else:
        print_info(f"Found {len(vps_list)} VPS instances")
    
    return True

def test_8_rdp_plans_eu():
    """Test 8: GET /reseller/rdp/plans?region=EU"""
    print_test(8, "GET /reseller/rdp/plans?region=EU - RDP plans for EU region")
    
    status, data, error = make_request("GET", "/rdp/plans", params={"region": "EU"})
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    if "plans" not in data:
        print_fail("Response missing 'plans' field")
        return False
    
    plans = data.get("plans")
    if not isinstance(plans, list):
        print_fail(f"plans should be an array, got {type(plans)}")
        return False
    
    if len(plans) == 0:
        print_fail("plans array is empty (expected non-empty for EU region)")
        return False
    
    print_pass(f"plans array is non-empty with {len(plans)} plans")
    
    if len(plans) == 6:
        print_pass("Found 6 RDP plans (expected Contabo plans)")
    else:
        print_info(f"Found {len(plans)} RDP plans")
    
    return True

def test_9_rdp_create_dry_run():
    """Test 9: POST /reseller/rdp - Create RDP in dry_run mode"""
    print_test(9, "POST /reseller/rdp - Create RDP (dry_run mode)")
    
    payload = {
        "plan_id": "V91",
        "region": "EU"
    }
    
    status, data, error = make_request("POST", "/rdp", json=payload)
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    if "mode" not in data:
        print_fail("Response missing 'mode' field")
        return False
    
    if data.get("mode") != "dry_run":
        print_fail(f"Expected mode='dry_run', got mode='{data.get('mode')}'")
        return False
    
    print_pass(f"mode is 'dry_run' (no real resource created)")
    
    if "price_usd" not in data:
        print_fail("Response missing 'price_usd' field")
        return False
    
    print_pass(f"price_usd present: ${data.get('price_usd')}")
    
    return True

def test_10_domain_search():
    """Test 10: GET /reseller/domains/search?domain=coolstartup2026.com"""
    print_test(10, "GET /reseller/domains/search?domain=coolstartup2026.com - Domain search")
    
    status, data, error = make_request("GET", "/domains/search", params={"domain": "coolstartup2026.com"})
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    if "available" not in data:
        print_fail("Response missing 'available' field")
        return False
    
    print_pass(f"'available' field present: {data.get('available')}")
    
    # Check for price information
    if "price_usd" in data or "price" in data or "registration_price" in data:
        price_field = "price_usd" if "price_usd" in data else ("price" if "price" in data else "registration_price")
        print_pass(f"Price information present: {price_field}={data.get(price_field)}")
    else:
        print_info(f"Response: {json.dumps(data, indent=2)}")
    
    return True

def test_11_error_passthrough():
    """Test 11: GET /reseller/vps/nonexistent-id-123 - Error passthrough"""
    print_test(11, "GET /reseller/vps/nonexistent-id-123 - Error status passthrough")
    
    status, data, error = make_request("GET", "/vps/nonexistent-id-123")
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status == 200:
        print_fail(f"Expected error status (e.g., 404), got 200")
        return False
    
    print_pass(f"Received error status: {status} (not 200)")
    
    if status == 404:
        print_pass("Status is 404 (expected for nonexistent resource)")
    else:
        print_info(f"Status is {status} (expected some error status)")
    
    # Check that response has error information
    if isinstance(data, dict):
        if "error" in data or "message" in data:
            print_pass(f"Response contains error information: {json.dumps(data, indent=2)}")
        else:
            print_info(f"Response body: {json.dumps(data, indent=2)}")
    else:
        print_info(f"Response is not JSON dict: {data}")
    
    return True

def test_12_hosting_plans():
    """Test 12: GET /reseller/hosting/plans - cPanel hosting plans"""
    print_test(12, "GET /reseller/hosting/plans - cPanel hosting plans")
    
    status, data, error = make_request("GET", "/hosting/plans")
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    # Check for platform field
    if "platform" not in data:
        print_fail("Response missing 'platform' field")
        return False
    
    print_pass(f"'platform' field present")
    
    # Check for plans array
    if "plans" not in data:
        print_fail("Response missing 'plans' field")
        return False
    
    plans = data.get("plans")
    if not isinstance(plans, list):
        print_fail(f"plans should be an array, got {type(plans)}")
        return False
    
    print_pass(f"plans is an array with {len(plans)} plans")
    
    if len(plans) == 0:
        print_fail("plans array is empty (expected 3 plans)")
        return False
    
    if len(plans) == 3:
        print_pass("Found 3 hosting plans (expected)")
    else:
        print_info(f"Found {len(plans)} hosting plans (expected 3)")
    
    # Check first plan structure
    first_plan = plans[0]
    required_fields = ["plan_id", "name", "tier", "price_usd", "duration_days", "addon_domains", "visitor_captcha_available", "features"]
    
    for field in required_fields:
        if field not in first_plan:
            print_fail(f"First plan missing '{field}' field")
            return False
    
    print_pass(f"First plan has all required fields: {required_fields}")
    
    # Validate field types
    if not isinstance(first_plan.get("price_usd"), (int, float)):
        print_fail(f"price_usd should be a number, got {type(first_plan.get('price_usd'))}")
        return False
    
    print_pass(f"price_usd is a number")
    
    if not isinstance(first_plan.get("duration_days"), (int, float)):
        print_fail(f"duration_days should be a number, got {type(first_plan.get('duration_days'))}")
        return False
    
    print_pass(f"duration_days is a number")
    
    # addon_domains can be number or "unlimited"
    addon_domains = first_plan.get("addon_domains")
    if not isinstance(addon_domains, (int, float)) and addon_domains != "unlimited":
        print_fail(f"addon_domains should be a number or 'unlimited', got {addon_domains}")
        return False
    
    print_pass(f"addon_domains is valid: {addon_domains}")
    
    if not isinstance(first_plan.get("visitor_captcha_available"), bool):
        print_fail(f"visitor_captcha_available should be a boolean, got {type(first_plan.get('visitor_captcha_available'))}")
        return False
    
    print_pass(f"visitor_captcha_available is a boolean")
    
    if not isinstance(first_plan.get("features"), list):
        print_fail(f"features should be an array, got {type(first_plan.get('features'))}")
        return False
    
    print_pass(f"features is an array")
    
    # Check for golden-monthly plan with tier "gold" and visitor_captcha_available true
    golden_plan = next((p for p in plans if p.get("plan_id") == "golden-monthly"), None)
    if golden_plan:
        if golden_plan.get("tier") == "gold":
            print_pass("golden-monthly plan has tier 'gold'")
        else:
            print_fail(f"golden-monthly plan tier should be 'gold', got '{golden_plan.get('tier')}'")
            return False
        
        if golden_plan.get("visitor_captcha_available") == True:
            print_pass("golden-monthly plan has visitor_captcha_available true")
        else:
            print_fail(f"golden-monthly plan visitor_captcha_available should be true, got {golden_plan.get('visitor_captcha_available')}")
            return False
    else:
        print_info("golden-monthly plan not found in plans array")
    
    print_info(f"Sample plan: {json.dumps(first_plan, indent=2)[:500]}")
    
    return True

def test_13_hosting_list():
    """Test 13: GET /reseller/hosting - List hosting accounts"""
    print_test(13, "GET /reseller/hosting - List hosting accounts")
    
    status, data, error = make_request("GET", "/hosting")
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    # Check for required fields
    required_fields = ["panel_url", "server_ip", "accounts"]
    for field in required_fields:
        if field not in data:
            print_fail(f"Response missing '{field}' field")
            return False
    
    print_pass(f"Response has all required fields: {required_fields}")
    
    accounts = data.get("accounts")
    if not isinstance(accounts, list):
        print_fail(f"accounts should be an array, got {type(accounts)}")
        return False
    
    print_pass(f"accounts is an array with {len(accounts)} accounts")
    
    # Check if real accounts exist (e.g., username "nbaykkd4zh")
    if len(accounts) > 0:
        print_pass(f"Real accounts exist (found {len(accounts)} accounts)")
        
        # Check if nbaykkd4zh exists
        nbaykkd4zh_account = next((a for a in accounts if a.get("username") == "nbaykkd4zh"), None)
        if nbaykkd4zh_account:
            print_pass("Found account with username 'nbaykkd4zh'")
        else:
            print_info("Account 'nbaykkd4zh' not found, but other accounts exist")
    else:
        print_info("No accounts found (empty array)")
    
    print_info(f"panel_url: {data.get('panel_url')}")
    print_info(f"server_ip: {data.get('server_ip')}")
    
    return True

def test_14_hosting_login():
    """Test 14: GET /reseller/hosting/nbaykkd4zh/login - Hosting login (dry_run)"""
    print_test(14, "GET /reseller/hosting/nbaykkd4zh/login - Hosting login (dry_run)")
    
    status, data, error = make_request("GET", "/hosting/nbaykkd4zh/login")
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status}")
    
    # In dry_run mode, expect mode field and a note (no login_url)
    if "mode" not in data:
        print_fail("Response missing 'mode' field")
        return False
    
    if data.get("mode") == "dry_run":
        print_pass("mode is 'dry_run' (expected)")
    else:
        print_info(f"mode: {data.get('mode')}")
    
    # Check for note field
    if "note" in data or "message" in data:
        print_pass("Response contains note/message (expected in dry_run)")
    else:
        print_info("No note/message field found")
    
    # In dry_run, login_url should not be present
    if "login_url" not in data:
        print_pass("login_url not present (expected in dry_run)")
    else:
        print_info(f"login_url present: {data.get('login_url')}")
    
    print_info(f"Response: {json.dumps(data, indent=2)}")
    
    return True

def test_15_hosting_credentials():
    """Test 15: GET /reseller/hosting/nbaykkd4zh/credentials - Hosting credentials (NEW route)"""
    print_test(15, "GET /reseller/hosting/nbaykkd4zh/credentials - Hosting credentials (NEW route)")
    
    status, data, error = make_request("GET", "/hosting/nbaykkd4zh/credentials")
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    if status == 404:
        print_fail("Route returns 404 - NEW route not implemented or account doesn't exist")
        return False
    
    if status != 200:
        print_fail(f"Expected status 200, got {status}")
        return False
    
    print_pass(f"Status code: {status} (NEW route is working!)")
    
    # Check for required fields
    required_fields = ["username", "panel_url", "server_ip", "nameservers", "mode"]
    for field in required_fields:
        if field not in data:
            print_fail(f"Response missing '{field}' field")
            return False
    
    print_pass(f"Response has all required fields: {required_fields}")
    
    # In dry_run mode, panel_pin should be null
    if data.get("mode") == "dry_run":
        print_pass("mode is 'dry_run' (expected)")
        
        if data.get("panel_pin") is None or data.get("panel_pin") == "":
            print_pass("panel_pin is null/empty (expected in dry_run)")
        else:
            print_info(f"panel_pin: {data.get('panel_pin')}")
    
    # Check for note field
    if "note" in data or "message" in data:
        print_pass("Response contains note/message (expected in dry_run)")
    
    print_info(f"username: {data.get('username')}")
    print_info(f"panel_url: {data.get('panel_url')}")
    print_info(f"server_ip: {data.get('server_ip')}")
    print_info(f"nameservers: {data.get('nameservers')}")
    
    return True

def test_16_hosting_create_dry_run():
    """Test 16: POST /reseller/hosting - Create hosting (dry_run or 402)"""
    print_test(16, "POST /reseller/hosting - Create hosting (dry_run or 402 insufficient_wallet_balance)")
    
    # Get initial wallet balance
    _, account_data, _ = make_request("GET", "/account")
    initial_balance = account_data.get("wallet_balance_usd", 0)
    print_info(f"Initial wallet balance: ${initial_balance}")
    
    payload = {
        "plan_id": "golden-monthly",
        "domain": "probe-nameword.com",
        "domain_mode": "byo",
        "visitor_captcha": True
    }
    
    status, data, error = make_request("POST", "/hosting", json=payload)
    
    if error:
        print_fail(f"Request failed: {error}")
        return False
    
    # ACCEPTABLE outcomes: EITHER 200 with dry_run preview OR 402 with insufficient_wallet_balance
    if status == 200:
        print_pass(f"Status code: 200 (dry_run priced preview)")
        
        # Check for dry_run preview fields
        if "mode" not in data:
            print_fail("Response missing 'mode' field")
            return False
        
        if data.get("mode") != "dry_run":
            print_fail(f"Expected mode='dry_run', got mode='{data.get('mode')}'")
            return False
        
        print_pass(f"mode is 'dry_run' (no real provisioning)")
        
        if "would_provision" in data:
            print_pass("would_provision field present (dry_run preview)")
        
        if "price_usd" in data:
            print_pass(f"price_usd present: ${data.get('price_usd')}")
        
    elif status == 402:
        print_pass(f"Status code: 402 (insufficient_wallet_balance - EXPECTED)")
        
        # Check for error field
        if "error" not in data:
            print_fail("Response missing 'error' field")
            return False
        
        if data.get("error") != "insufficient_wallet_balance":
            print_fail(f"Expected error='insufficient_wallet_balance', got error='{data.get('error')}'")
            return False
        
        print_pass(f"error is 'insufficient_wallet_balance' (expected)")
        
        # Check for required fields in 402 response
        required_fields = ["price_usd", "shortfall_usd", "wallet_balance_usd", "mode"]
        for field in required_fields:
            if field not in data:
                print_fail(f"Response missing '{field}' field")
                return False
        
        print_pass(f"Response has all required fields for 402: {required_fields}")
        
        if data.get("mode") == "dry_run":
            print_pass("mode is 'dry_run' (no charge/provisioning)")
        
        print_info(f"price_usd: ${data.get('price_usd')}")
        print_info(f"shortfall_usd: ${data.get('shortfall_usd')}")
        print_info(f"wallet_balance_usd: ${data.get('wallet_balance_usd')}")
        
    else:
        print_fail(f"Expected status 200 or 402, got {status}")
        return False
    
    # Verify wallet balance unchanged (no charge)
    _, account_data_after, _ = make_request("GET", "/account")
    final_balance = account_data_after.get("wallet_balance_usd", 0)
    
    if initial_balance == final_balance:
        print_pass(f"Wallet balance unchanged: ${final_balance} (no charge in dry_run)")
    else:
        print_fail(f"Wallet balance changed from ${initial_balance} to ${final_balance} (should not charge in dry_run)")
        return False
    
    # Verify nothing was provisioned (check hosting list)
    _, hosting_data, _ = make_request("GET", "/hosting")
    accounts_after = hosting_data.get("accounts", [])
    
    # Check if probe-nameword.com was NOT added
    probe_account = next((a for a in accounts_after if "probe-nameword.com" in str(a.get("domain", ""))), None)
    if probe_account is None:
        print_pass("No new account provisioned (expected in dry_run)")
    else:
        print_fail("New account was provisioned (should not happen in dry_run)")
        return False
    
    return True

def main():
    """Run all tests"""
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}NOMADLY RESELLER API PROXY - BACKEND TEST SUITE{Colors.END}")
    print(f"{Colors.BLUE}Base URL: {BASE_URL}{Colors.END}")
    print(f"{Colors.BLUE}Timeout: {TIMEOUT}s (generous for external API){Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    
    tests = [
        test_1_health,
        test_2_account,
        test_3_vps_plans_eu,
        test_4_vps_plans_sg,
        test_5_vps_plans_unknown,
        test_6_vps_create_dry_run,
        test_7_vps_list,
        test_8_rdp_plans_eu,
        test_9_rdp_create_dry_run,
        test_10_domain_search,
        test_11_error_passthrough,
        test_12_hosting_plans,
        test_13_hosting_list,
        test_14_hosting_login,
        test_15_hosting_credentials,
        test_16_hosting_create_dry_run,
    ]
    
    results = []
    for test_func in tests:
        try:
            result = test_func()
            results.append((test_func.__name__, result))
        except Exception as e:
            print_fail(f"Test crashed: {str(e)}")
            results.append((test_func.__name__, False))
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status_icon = "✓" if result else "✗"
        status_color = Colors.GREEN if result else Colors.RED
        print(f"{status_color}{status_icon} {test_name}{Colors.END}")
    
    print(f"\n{Colors.BLUE}Total: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print(f"{Colors.GREEN}ALL TESTS PASSED!{Colors.END}\n")
        return 0
    else:
        print(f"{Colors.RED}SOME TESTS FAILED!{Colors.END}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
