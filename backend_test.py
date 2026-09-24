#!/usr/bin/env python3
"""
Backend Test Suite for Nameword Platform
Tests two backend fixes:
1. Duplicate hosting accounts fix (ownership.js)
2. cPanel File Manager operations (body-limit bump + proxy routes)
"""

import requests
import json
import base64
import time
from typing import Dict, Any, Optional

# Base URL from frontend .env
BASE_URL = "https://nameword-dev-7.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api/v1"

# Test credentials from test_credentials.md
PRIMARY_ACCOUNT = {
    "email": "moxxcompany@gmail.com",
    "password": "Onlygod123@"
}

REGRESSION_ACCOUNT = {
    "email": "buyer@nameword.local",
    "password": "Buyer@12345"
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def log_test(message: str, status: str = "info"):
    """Log test messages with color coding"""
    if status == "pass":
        print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")
    elif status == "fail":
        print(f"{Colors.RED}❌ {message}{Colors.RESET}")
    elif status == "warn":
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")
    else:
        print(f"{Colors.BLUE}ℹ️  {message}{Colors.RESET}")

def login(email: str, password: str) -> Optional[str]:
    """Login and return JWT token"""
    log_test(f"Logging in as {email}...")
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            if token:
                log_test(f"Login successful for {email}", "pass")
                return token
            else:
                log_test(f"Login response missing token: {data}", "fail")
                return None
        else:
            log_test(f"Login failed: {response.status_code} - {response.text}", "fail")
            return None
    except Exception as e:
        log_test(f"Login exception: {str(e)}", "fail")
        return None

def test_problem_1_duplicate_hosting_fix():
    """
    PROBLEM 1: Duplicate hosting accounts fix
    Test that moxxcompany@gmail.com sees EXACTLY ONE hosting account
    """
    print("\n" + "="*80)
    print("PROBLEM 1: DUPLICATE HOSTING ACCOUNTS FIX")
    print("="*80)
    
    # Step 1: Login as moxxcompany@gmail.com
    token = login(PRIMARY_ACCOUNT["email"], PRIMARY_ACCOUNT["password"])
    if not token:
        log_test("Cannot proceed with Problem 1 - login failed", "fail")
        return False
    
    # Step 2: GET /api/v1/reseller/hosting
    log_test("Fetching hosting accounts list...")
    try:
        response = requests.get(
            f"{API_BASE}/reseller/hosting",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        
        log_test(f"Response status: {response.status_code}")
        
        if response.status_code != 200:
            log_test(f"Expected 200, got {response.status_code}: {response.text}", "fail")
            return False
        
        data = response.json()
        log_test(f"Response body: {json.dumps(data, indent=2)}")
        
        # Step 3: Verify EXACTLY ONE account
        accounts = data.get("accounts", [])
        count = data.get("count", 0)
        
        log_test(f"Found {len(accounts)} account(s) in 'accounts' array")
        log_test(f"Count field: {count}")
        
        if len(accounts) != 1:
            log_test(f"FAIL: Expected EXACTLY 1 account, found {len(accounts)}", "fail")
            log_test(f"Accounts: {json.dumps(accounts, indent=2)}", "fail")
            return False
        
        if count != 1:
            log_test(f"FAIL: Expected count=1, got count={count}", "fail")
            return False
        
        # Step 4: Verify the account details
        account = accounts[0]
        username = account.get("username")
        domain = account.get("domain")
        status = account.get("status")
        
        log_test(f"Account details: username={username}, domain={domain}, status={status}")
        
        if username != "namea3a5":
            log_test(f"FAIL: Expected username='namea3a5', got '{username}'", "fail")
            return False
        
        if domain != "namewords.sbs":
            log_test(f"FAIL: Expected domain='namewords.sbs', got '{domain}'", "fail")
            return False
        
        if status not in ["active", "not-suspended"]:
            log_test(f"WARN: Status is '{status}', expected 'active' or 'not-suspended'", "warn")
        
        log_test("PROBLEM 1 PASSED: Exactly ONE hosting account found with correct details", "pass")
        return True
        
    except Exception as e:
        log_test(f"Exception during hosting list fetch: {str(e)}", "fail")
        return False

def test_problem_1_regression():
    """
    PROBLEM 1 REGRESSION: Test buyer account endpoints don't error
    """
    print("\n" + "="*80)
    print("PROBLEM 1 REGRESSION: BUYER ACCOUNT ENDPOINTS")
    print("="*80)
    
    # Login as buyer
    token = login(REGRESSION_ACCOUNT["email"], REGRESSION_ACCOUNT["password"])
    if not token:
        log_test("Cannot proceed with regression - login failed", "fail")
        return False
    
    endpoints = [
        "/reseller/hosting",
        "/reseller/domains",
        "/reseller/vps",
        "/reseller/rdp"
    ]
    
    all_passed = True
    for endpoint in endpoints:
        log_test(f"Testing GET {endpoint}...")
        try:
            response = requests.get(
                f"{API_BASE}{endpoint}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                log_test(f"GET {endpoint}: 200 OK - {json.dumps(data)[:100]}...", "pass")
            else:
                log_test(f"GET {endpoint}: {response.status_code} - {response.text[:200]}", "fail")
                all_passed = False
        except Exception as e:
            log_test(f"GET {endpoint}: Exception - {str(e)}", "fail")
            all_passed = False
    
    if all_passed:
        log_test("REGRESSION PASSED: All buyer endpoints returned 200", "pass")
    else:
        log_test("REGRESSION FAILED: Some endpoints returned errors", "fail")
    
    return all_passed

def test_problem_2_file_manager():
    """
    PROBLEM 2: cPanel File Manager full lifecycle test
    Test all 12 file operations on username namea3a5
    """
    print("\n" + "="*80)
    print("PROBLEM 2: CPANEL FILE MANAGER OPERATIONS")
    print("="*80)
    
    # Login as moxxcompany@gmail.com (owns namea3a5)
    token = login(PRIMARY_ACCOUNT["email"], PRIMARY_ACCOUNT["password"])
    if not token:
        log_test("Cannot proceed with Problem 2 - login failed", "fail")
        return False
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    username = "namea3a5"
    working_dir = "/public_html"
    
    results = {}
    
    # Step 1: List files in /public_html
    log_test("STEP 1: GET files list...")
    try:
        response = requests.get(
            f"{API_BASE}/reseller/hosting/{username}/files",
            params={"dir": working_dir},
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1 and isinstance(data.get("data"), list):
                log_test(f"STEP 1 PASSED: Got file list with {len(data['data'])} items", "pass")
                results["step1_list"] = True
            else:
                log_test(f"STEP 1 FAILED: Unexpected response format: {data}", "fail")
                results["step1_list"] = False
        else:
            log_test(f"STEP 1 FAILED: {response.status_code}", "fail")
            results["step1_list"] = False
    except Exception as e:
        log_test(f"STEP 1 EXCEPTION: {str(e)}", "fail")
        results["step1_list"] = False
    
    # Step 2: Save a text file
    log_test("STEP 2: POST files/save (create nw_test_readme.txt)...")
    try:
        response = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/save",
            json={
                "dir": working_dir,
                "file": "nw_test_readme.txt",
                "content": "hello from backend test"
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                log_test("STEP 2 PASSED: File saved successfully", "pass")
                results["step2_save"] = True
            else:
                log_test(f"STEP 2 FAILED: {data}", "fail")
                results["step2_save"] = False
        else:
            log_test(f"STEP 2 FAILED: {response.status_code}", "fail")
            results["step2_save"] = False
    except Exception as e:
        log_test(f"STEP 2 EXCEPTION: {str(e)}", "fail")
        results["step2_save"] = False
    
    # Step 3: Get file content
    log_test("STEP 3: GET files/content (read nw_test_readme.txt)...")
    try:
        response = requests.get(
            f"{API_BASE}/reseller/hosting/{username}/files/content",
            params={"dir": working_dir, "file": "nw_test_readme.txt"},
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            content = data.get("content", "")
            if "hello from backend test" in content:
                log_test("STEP 3 PASSED: File content matches", "pass")
                results["step3_content"] = True
            else:
                log_test(f"STEP 3 FAILED: Content mismatch: {content}", "fail")
                results["step3_content"] = False
        else:
            log_test(f"STEP 3 FAILED: {response.status_code}", "fail")
            results["step3_content"] = False
    except Exception as e:
        log_test(f"STEP 3 EXCEPTION: {str(e)}", "fail")
        results["step3_content"] = False
    
    # Step 4: Upload a file (base64)
    log_test("STEP 4: POST files/upload (upload nw_test_upload.txt)...")
    try:
        upload_content = "uploaded bytes"
        content_base64 = base64.b64encode(upload_content.encode()).decode()
        
        response = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/upload",
            json={
                "dir": working_dir,
                "fileName": "nw_test_upload.txt",
                "content_base64": content_base64
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                log_test("STEP 4 PASSED: File uploaded successfully", "pass")
                results["step4_upload"] = True
            else:
                log_test(f"STEP 4 FAILED: {data}", "fail")
                results["step4_upload"] = False
        else:
            log_test(f"STEP 4 FAILED: {response.status_code}", "fail")
            results["step4_upload"] = False
    except Exception as e:
        log_test(f"STEP 4 EXCEPTION: {str(e)}", "fail")
        results["step4_upload"] = False
    
    # Step 5: Create directory
    log_test("STEP 5: POST files/mkdir (create nw_test_dir)...")
    try:
        response = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/mkdir",
            json={
                "dir": working_dir,
                "name": "nw_test_dir"
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                log_test("STEP 5 PASSED: Directory created successfully", "pass")
                results["step5_mkdir"] = True
            else:
                log_test(f"STEP 5 FAILED: {data}", "fail")
                results["step5_mkdir"] = False
        else:
            log_test(f"STEP 5 FAILED: {response.status_code}", "fail")
            results["step5_mkdir"] = False
    except Exception as e:
        log_test(f"STEP 5 EXCEPTION: {str(e)}", "fail")
        results["step5_mkdir"] = False
    
    # Step 6: Rename file
    log_test("STEP 6: POST files/rename (rename nw_test_readme.txt -> nw_test_renamed.txt)...")
    try:
        response = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/rename",
            json={
                "dir": working_dir,
                "oldName": "nw_test_readme.txt",
                "newName": "nw_test_renamed.txt"
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                log_test("STEP 6 PASSED: File renamed successfully", "pass")
                results["step6_rename"] = True
            else:
                log_test(f"STEP 6 FAILED: {data}", "fail")
                results["step6_rename"] = False
        else:
            log_test(f"STEP 6 FAILED: {response.status_code}", "fail")
            results["step6_rename"] = False
    except Exception as e:
        log_test(f"STEP 6 EXCEPTION: {str(e)}", "fail")
        results["step6_rename"] = False
    
    # Step 7: Copy file
    log_test("STEP 7: POST files/copy (copy nw_test_renamed.txt to nw_test_dir)...")
    try:
        response = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/copy",
            json={
                "sourceDir": working_dir,
                "fileName": "nw_test_renamed.txt",
                "destDir": f"{working_dir}/nw_test_dir"
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                log_test("STEP 7 PASSED: File copied successfully", "pass")
                results["step7_copy"] = True
            else:
                log_test(f"STEP 7 FAILED: {data}", "fail")
                results["step7_copy"] = False
        else:
            log_test(f"STEP 7 FAILED: {response.status_code}", "fail")
            results["step7_copy"] = False
    except Exception as e:
        log_test(f"STEP 7 EXCEPTION: {str(e)}", "fail")
        results["step7_copy"] = False
    
    # Step 8: Move file
    log_test("STEP 8: POST files/move (move nw_test_upload.txt to nw_test_dir)...")
    try:
        response = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/move",
            json={
                "sourceDir": working_dir,
                "fileName": "nw_test_upload.txt",
                "destDir": f"{working_dir}/nw_test_dir"
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                log_test("STEP 8 PASSED: File moved successfully", "pass")
                results["step8_move"] = True
            else:
                log_test(f"STEP 8 FAILED: {data}", "fail")
                results["step8_move"] = False
        else:
            log_test(f"STEP 8 FAILED: {response.status_code}", "fail")
            results["step8_move"] = False
    except Exception as e:
        log_test(f"STEP 8 EXCEPTION: {str(e)}", "fail")
        results["step8_move"] = False
    
    # Step 9: Compress file
    log_test("STEP 9: POST files/compress (create nw_test_archive.zip)...")
    try:
        response = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/compress",
            json={
                "dir": working_dir,
                "files": ["nw_test_renamed.txt"],
                "destFile": "nw_test_archive.zip"
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                log_test("STEP 9 PASSED: Archive created successfully", "pass")
                results["step9_compress"] = True
            else:
                log_test(f"STEP 9 FAILED: {data}", "fail")
                results["step9_compress"] = False
        else:
            log_test(f"STEP 9 FAILED: {response.status_code}", "fail")
            results["step9_compress"] = False
    except Exception as e:
        log_test(f"STEP 9 EXCEPTION: {str(e)}", "fail")
        results["step9_compress"] = False
    
    # Step 10: Extract archive
    log_test("STEP 10: POST files/extract (extract nw_test_archive.zip)...")
    try:
        response = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/extract",
            json={
                "dir": working_dir,
                "file": "nw_test_archive.zip"
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Response: {response.status_code} - {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                log_test("STEP 10 PASSED: Archive extracted successfully", "pass")
                results["step10_extract"] = True
            else:
                log_test(f"STEP 10 FAILED: {data}", "fail")
                results["step10_extract"] = False
        else:
            log_test(f"STEP 10 FAILED: {response.status_code}", "fail")
            results["step10_extract"] = False
    except Exception as e:
        log_test(f"STEP 10 EXCEPTION: {str(e)}", "fail")
        results["step10_extract"] = False
    
    # Step 11: Chunked upload
    log_test("STEP 11: POST files/upload-chunk (2 chunks)...")
    try:
        upload_id = "nwtestchunk1"
        chunk1_content = base64.b64encode(b"chunk part 1 ").decode()
        chunk2_content = base64.b64encode(b"chunk part 2").decode()
        
        # Chunk 0
        response1 = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/upload-chunk",
            json={
                "uploadId": upload_id,
                "chunkIndex": 0,
                "totalChunks": 2,
                "fileName": "nw_chunk.txt",
                "dir": working_dir,
                "content_base64": chunk1_content
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Chunk 0 response: {response1.status_code} - {response1.text[:500]}")
        
        # Chunk 1
        response2 = requests.post(
            f"{API_BASE}/reseller/hosting/{username}/files/upload-chunk",
            json={
                "uploadId": upload_id,
                "chunkIndex": 1,
                "totalChunks": 2,
                "fileName": "nw_chunk.txt",
                "dir": working_dir,
                "content_base64": chunk2_content
            },
            headers=headers,
            timeout=30
        )
        log_test(f"Chunk 1 response: {response2.status_code} - {response2.text[:500]}")
        
        if response1.status_code == 200 and response2.status_code == 200:
            data1 = response1.json()
            data2 = response2.json()
            # Chunk 0 should return status:"chunk-received"
            # Chunk 1 (final) should return status:"complete" with cpanelStatus:1
            if data1.get("status") == "chunk-received" and (data2.get("status") == "complete" or data2.get("cpanelStatus") == 1):
                log_test("STEP 11 PASSED: Chunked upload completed successfully", "pass")
                results["step11_chunked"] = True
            else:
                log_test(f"STEP 11 FAILED: Unexpected response: {data1}, {data2}", "fail")
                results["step11_chunked"] = False
        else:
            log_test(f"STEP 11 FAILED: HTTP errors", "fail")
            results["step11_chunked"] = False
    except Exception as e:
        log_test(f"STEP 11 EXCEPTION: {str(e)}", "fail")
        results["step11_chunked"] = False
    
    # Step 12: Cleanup
    log_test("STEP 12: DELETE files (cleanup)...")
    cleanup_items = [
        {"file": "nw_test_renamed.txt", "isDirectory": False},
        {"file": "nw_test_archive.zip", "isDirectory": False},
        {"file": "nw_chunk.txt", "isDirectory": False},
        {"file": "nw_test_dir", "isDirectory": True}
    ]
    
    cleanup_results = []
    for item in cleanup_items:
        try:
            response = requests.delete(
                f"{API_BASE}/reseller/hosting/{username}/files",
                json={
                    "dir": working_dir,
                    "file": item["file"],
                    "isDirectory": item.get("isDirectory", False)
                },
                headers=headers,
                timeout=30
            )
            if response.status_code == 200:
                log_test(f"Deleted {item['file']}: OK", "pass")
                cleanup_results.append(True)
            else:
                log_test(f"Delete {item['file']}: {response.status_code} - {response.text[:200]}", "warn")
                cleanup_results.append(False)
        except Exception as e:
            log_test(f"Delete {item['file']}: Exception - {str(e)}", "warn")
            cleanup_results.append(False)
    
    results["step12_cleanup"] = all(cleanup_results)
    if results["step12_cleanup"]:
        log_test("STEP 12 PASSED: All cleanup operations succeeded", "pass")
    else:
        log_test("STEP 12 PARTIAL: Some cleanup operations failed (best-effort)", "warn")
    
    # Summary
    print("\n" + "="*80)
    print("PROBLEM 2 SUMMARY")
    print("="*80)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    log_test(f"File Manager Operations: {passed}/{total} passed")
    
    for step, result in results.items():
        status = "pass" if result else "fail"
        log_test(f"{step}: {'PASSED' if result else 'FAILED'}", status)
    
    return passed == total

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("NAMEWORD BACKEND TEST SUITE")
    print("Testing two backend fixes:")
    print("1. Duplicate hosting accounts fix (ownership.js)")
    print("2. cPanel File Manager operations (body-limit + proxy routes)")
    print("="*80)
    
    results = {}
    
    # Test Problem 1
    results["problem1_duplicate_fix"] = test_problem_1_duplicate_hosting_fix()
    results["problem1_regression"] = test_problem_1_regression()
    
    # Test Problem 2
    results["problem2_file_manager"] = test_problem_2_file_manager()
    
    # Final Summary
    print("\n" + "="*80)
    print("FINAL TEST SUMMARY")
    print("="*80)
    
    for test_name, result in results.items():
        status = "pass" if result else "fail"
        log_test(f"{test_name}: {'PASSED' if result else 'FAILED'}", status)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print("\n" + "="*80)
    if passed == total:
        log_test(f"ALL TESTS PASSED ({passed}/{total})", "pass")
        print("="*80)
        return 0
    else:
        log_test(f"SOME TESTS FAILED ({passed}/{total} passed)", "fail")
        print("="*80)
        return 1

if __name__ == "__main__":
    exit(main())
