#!/usr/bin/env python3
"""
Backend test for NEW RDP reseller proxy endpoints (password-reset, reinstall, renew).
Tests ONLY routing, auth, ownership, and validation paths — does NOT run real operations
that would debit the reseller wallet.
"""
import requests
import sys
import json

BASE = "http://localhost:8001/api/v1"
TIMEOUT = 30

def log(msg):
    print(f"  {msg}")

def test_step(name, fn):
    """Run a test step and return True if passed."""
    print(f"\n{'='*80}")
    print(f"STEP: {name}")
    print('='*80)
    try:
        fn()
        print(f"✅ PASS: {name}")
        return True
    except AssertionError as e:
        print(f"❌ FAIL: {name}")
        print(f"   Error: {e}")
        return False
    except Exception as e:
        print(f"❌ ERROR: {name}")
        print(f"   Exception: {e}")
        return False

def login(email, password):
    """Login and return Bearer token."""
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=TIMEOUT)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data, f"No token in login response: {data}"
    return data["token"]

def main():
    print("\n" + "="*80)
    print("BACKEND TEST: NEW RDP RESELLER PROXY ENDPOINTS")
    print("="*80)
    print("Testing: POST /api/v1/reseller/rdp/:id/password-reset")
    print("         POST /api/v1/reseller/rdp/:id/reinstall")
    print("         POST /api/v1/reseller/rdp/:id/renew")
    print("="*80)

    results = []
    
    # ========== STEP 1: ROUTES EXIST + AUTH-GUARDED (NOT 404) ==========
    def step1():
        """Verify routes are registered and auth-guarded (return 400/401, NOT 404)."""
        log("Testing password-reset WITHOUT auth...")
        r1 = requests.post(f"{BASE}/reseller/rdp/test-id-123/password-reset", timeout=TIMEOUT)
        log(f"  Status: {r1.status_code}, Body: {r1.text[:200]}")
        assert r1.status_code in [400, 401], f"Expected 400/401 (auth error), got {r1.status_code}. Route may be missing (404) or misconfigured."
        assert r1.status_code != 404, f"Route returned 404 — route is NOT registered!"
        
        log("Testing reinstall WITHOUT auth...")
        r2 = requests.post(f"{BASE}/reseller/rdp/test-id-123/reinstall", timeout=TIMEOUT)
        log(f"  Status: {r2.status_code}, Body: {r2.text[:200]}")
        assert r2.status_code in [400, 401], f"Expected 400/401 (auth error), got {r2.status_code}"
        assert r2.status_code != 404, f"Route returned 404 — route is NOT registered!"
        
        log("Testing renew WITHOUT auth...")
        r3 = requests.post(f"{BASE}/reseller/rdp/test-id-123/renew", timeout=TIMEOUT)
        log(f"  Status: {r3.status_code}, Body: {r3.text[:200]}")
        assert r3.status_code in [400, 401], f"Expected 400/401 (auth error), got {r3.status_code}"
        assert r3.status_code != 404, f"Route returned 404 — route is NOT registered!"
        
        log("✓ All 3 routes are registered and auth-guarded (NOT 404)")
        
        # Verify a truly bogus path returns 404 for comparison
        log("Testing truly bogus path (should be 404)...")
        r4 = requests.post(f"{BASE}/reseller/rdp/foo/does-not-exist-at-all", timeout=TIMEOUT)
        log(f"  Status: {r4.status_code}")
        assert r4.status_code == 404, f"Bogus path should return 404, got {r4.status_code}"
        log("✓ Bogus path correctly returns 404 (confirms our routes are NOT 404)")
    
    results.append(test_step("STEP 1: Routes exist + auth-guarded (NOT 404)", step1))
    
    # ========== STEP 2: OWNERSHIP GUARD (403 for non-owned) ==========
    def step2():
        """With valid auth, non-owned/absent RDP id returns 403 forbidden."""
        # Use demo@nameword.local which is available in the DB
        token = login("demo@nameword.local", "Demo@12345")
        log(f"✓ Logged in as demo@nameword.local")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Use a clearly non-existent RDP id
        fake_id = "nonexistent-rdp-id-123"
        
        log(f"Testing password-reset with non-owned id '{fake_id}'...")
        r1 = requests.post(f"{BASE}/reseller/rdp/{fake_id}/password-reset", headers=headers, timeout=TIMEOUT)
        log(f"  Status: {r1.status_code}, Body: {r1.text[:300]}")
        assert r1.status_code == 403, f"Expected 403 (forbidden), got {r1.status_code}"
        data1 = r1.json()
        assert data1.get("error") == "forbidden" or "access" in data1.get("message", "").lower(), \
            f"Expected forbidden error, got: {data1}"
        
        log(f"Testing reinstall with non-owned id '{fake_id}'...")
        r2 = requests.post(f"{BASE}/reseller/rdp/{fake_id}/reinstall", headers=headers, json={"os": "ws2022"}, timeout=TIMEOUT)
        log(f"  Status: {r2.status_code}, Body: {r2.text[:300]}")
        assert r2.status_code == 403, f"Expected 403 (forbidden), got {r2.status_code}"
        
        log(f"Testing renew with non-owned id '{fake_id}'...")
        r3 = requests.post(f"{BASE}/reseller/rdp/{fake_id}/renew", headers=headers, json={"months": 1}, timeout=TIMEOUT)
        log(f"  Status: {r3.status_code}, Body: {r3.text[:300]}")
        assert r3.status_code == 403, f"Expected 403 (forbidden), got {r3.status_code}"
        
        log("✓ All 3 endpoints correctly return 403 forbidden for non-owned RDP id")
    
    results.append(test_step("STEP 2: Ownership guard (403 for non-owned)", step2))
    
    # ========== STEP 3: RELAY / SHAPE (clean JSON errors) ==========
    def step3():
        """Verify error responses are clean JSON with sensible status codes."""
        # We already tested this in step 1 and 2, but let's verify the shape
        log("Verifying error response shape from step 1 (no auth)...")
        r = requests.post(f"{BASE}/reseller/rdp/test-id/password-reset", timeout=TIMEOUT)
        assert r.status_code in [400, 401], f"Expected 400/401, got {r.status_code}"
        try:
            data = r.json()
            log(f"  Response is valid JSON: {data}")
            assert "message" in data or "error" in data, f"Expected error/message in response: {data}"
        except json.JSONDecodeError:
            raise AssertionError(f"Response is not valid JSON: {r.text}")
        
        log("Verifying error response shape from step 2 (forbidden)...")
        token = login("demo@nameword.local", "Demo@12345")
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.post(f"{BASE}/reseller/rdp/nonexistent-id/password-reset", headers=headers, timeout=TIMEOUT)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"
        try:
            data = r.json()
            log(f"  Response is valid JSON: {data}")
            assert data.get("error") == "forbidden", f"Expected error='forbidden', got: {data}"
            assert "message" in data, f"Expected message in response: {data}"
        except json.JSONDecodeError:
            raise AssertionError(f"Response is not valid JSON: {r.text}")
        
        log("✓ Error responses are clean JSON with sensible status codes (no 500 stack traces)")
    
    results.append(test_step("STEP 3: Relay / shape (clean JSON errors)", step3))
    
    # ========== STEP 4: NO REGRESSION on existing reseller proxy ==========
    def step4():
        """Verify existing reseller proxy endpoints still work."""
        log("Testing GET /api/v1/reseller/health...")
        r1 = requests.get(f"{BASE}/reseller/health", timeout=TIMEOUT)
        log(f"  Status: {r1.status_code}, Body: {r1.text[:500]}")
        assert r1.status_code == 200, f"Health check failed: {r1.status_code}"
        data1 = r1.json()
        assert "mode" in data1, f"Expected 'mode' in health response: {data1}"
        log(f"  ✓ Health check OK, mode={data1.get('mode')}")
        
        log("Testing GET /api/v1/reseller/rdp/plans?region=EU...")
        r2 = requests.get(f"{BASE}/reseller/rdp/plans?region=EU", timeout=TIMEOUT)
        log(f"  Status: {r2.status_code}")
        assert r2.status_code == 200, f"RDP plans failed: {r2.status_code}"
        data2 = r2.json()
        assert "plans" in data2, f"Expected 'plans' in response: {data2}"
        plans = data2["plans"]
        assert len(plans) > 0, f"Expected at least one plan, got: {plans}"
        
        # Verify new fields: cpu, storage_type, os_options, default_os
        plan = plans[0]
        log(f"  First plan: {json.dumps(plan, indent=2)}")
        
        # Check for cpu field
        assert "cpu" in plan, f"Expected 'cpu' field in plan: {plan}"
        log(f"  ✓ Plan includes 'cpu' field: {plan['cpu']}")
        
        # Check for storage_type field
        assert "storage_type" in plan, f"Expected 'storage_type' field in plan: {plan}"
        log(f"  ✓ Plan includes 'storage_type' field: {plan['storage_type']}")
        
        # Check for vcpus field (added by withVcpus)
        assert "vcpus" in plan, f"Expected 'vcpus' field in plan: {plan}"
        log(f"  ✓ Plan includes 'vcpus' field: {plan['vcpus']}")
        
        # Check for ram_gb field
        assert "ram_gb" in plan, f"Expected 'ram_gb' field in plan: {plan}"
        log(f"  ✓ Plan includes 'ram_gb' field: {plan['ram_gb']}")
        
        # Check for disk_gb field
        assert "disk_gb" in plan, f"Expected 'disk_gb' field in plan: {plan}"
        log(f"  ✓ Plan includes 'disk_gb' field: {plan['disk_gb']}")
        
        # Check for price_usd field
        assert "price_usd" in plan, f"Expected 'price_usd' field in plan: {plan}"
        log(f"  ✓ Plan includes 'price_usd' field: {plan['price_usd']}")
        
        # Check for duration_months field
        assert "duration_months" in plan, f"Expected 'duration_months' field in plan: {plan}"
        log(f"  ✓ Plan includes 'duration_months' field: {plan['duration_months']}")
        
        # Check for os_options at top level
        assert "os_options" in data2, f"Expected 'os_options' at top level: {data2.keys()}"
        log(f"  ✓ Response includes 'os_options': {data2['os_options']}")
        
        # Check for default_os at top level
        assert "default_os" in data2, f"Expected 'default_os' at top level: {data2.keys()}"
        log(f"  ✓ Response includes 'default_os': {data2['default_os']}")
        
        log("Testing GET /api/v1/reseller/vps/plans?region=EU...")
        r3 = requests.get(f"{BASE}/reseller/vps/plans?region=EU", timeout=TIMEOUT)
        log(f"  Status: {r3.status_code}")
        assert r3.status_code == 200, f"VPS plans failed: {r3.status_code}"
        data3 = r3.json()
        assert "plans" in data3, f"Expected 'plans' in response: {data3}"
        vps_plans = data3["plans"]
        assert len(vps_plans) > 0, f"Expected at least one VPS plan"
        
        vps_plan = vps_plans[0]
        log(f"  First VPS plan: {json.dumps(vps_plan, indent=2)}")
        
        # Check for cpu field in VPS plans
        assert "cpu" in vps_plan, f"Expected 'cpu' field in VPS plan: {vps_plan}"
        log(f"  ✓ VPS plan includes 'cpu' field: {vps_plan['cpu']}")
        
        # Check for storage_type field in VPS plans
        assert "storage_type" in vps_plan, f"Expected 'storage_type' field in VPS plan: {vps_plan}"
        log(f"  ✓ VPS plan includes 'storage_type' field: {vps_plan['storage_type']}")
        
        log("✓ No regression: health, RDP plans (with new fields), and VPS plans all working")
    
    results.append(test_step("STEP 4: No regression on existing reseller proxy", step4))
    
    # ========== SUMMARY ==========
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(results)
    total = len(results)
    print(f"PASSED: {passed}/{total} ({100*passed//total}%)")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED")
        print("\nCRITICAL VERIFICATION:")
        print("  1. ✓ All 3 new RDP endpoints are registered and reachable (NOT 404)")
        print("  2. ✓ All 3 endpoints are auth-guarded (return 400/401 without auth)")
        print("  3. ✓ All 3 endpoints enforce ownership (return 403 for non-owned RDP)")
        print("  4. ✓ Error responses are clean JSON with sensible status codes")
        print("  5. ✓ No regression: health, RDP plans, VPS plans all working")
        print("  6. ✓ RDP plans now include: cpu, storage_type, vcpus, ram_gb, disk_gb, price_usd, duration_months")
        print("  7. ✓ RDP plans response includes: os_options, default_os at top level")
        print("  8. ✓ VPS plans include: cpu, storage_type")
        print("\nNOTE: Did NOT test real successful operations (would debit reseller wallet).")
        print("Only tested routing, auth, ownership, and validation paths as required.")
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
