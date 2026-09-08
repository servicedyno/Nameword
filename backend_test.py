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
BASE_URL = "https://5c680fc7-6750-4696-bfbe-f6ff76889021.preview.emergentagent.com/api/v1/reseller"

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

def test_10_error_passthrough():
    """Test 10: GET /reseller/vps/nonexistent-id-123 - Error passthrough"""
    print_test(10, "GET /reseller/vps/nonexistent-id-123 - Error status passthrough")
    
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
        test_10_error_passthrough,
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
