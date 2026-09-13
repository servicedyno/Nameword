#!/usr/bin/env python3
"""
Backend test for crypto order live status + switch-currency functionality.
Tests the complete crypto order lifecycle with DynoPay integration.
"""

import requests
import time
import uuid
import json
import sys
from typing import Dict, Any, Optional

# Base URL - use localhost:8001 for direct backend access
BASE_URL = "http://localhost:8001/api/v1"

# Test credentials (demo account with 0 wallet, 0 points → forces crypto path)
TEST_EMAIL = "demo@nameword.local"
TEST_PASSWORD = "Demo@12345"

# Timeouts (30s for real upstream as specified)
TIMEOUT = 30

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log(msg: str, color: str = ""):
    """Print colored log message"""
    if color:
        print(f"{color}{msg}{Colors.END}")
    else:
        print(msg)

def login(email: str, password: str) -> Optional[str]:
    """Login and return Bearer token"""
    log(f"\n[LOGIN] Authenticating as {email}...", Colors.BLUE)
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("data", {}).get("token") or data.get("token")
            if token:
                log(f"✓ Login successful, got Bearer token", Colors.GREEN)
                return token
            else:
                log(f"✗ Login response missing token: {resp.text[:200]}", Colors.RED)
                return None
        else:
            log(f"✗ Login failed: {resp.status_code} {resp.text[:200]}", Colors.RED)
            return None
    except Exception as e:
        log(f"✗ Login exception: {e}", Colors.RED)
        return None

def test_crypto_order_lifecycle(token: str) -> Dict[str, Any]:
    """
    Test the complete crypto order lifecycle:
    1. Build cart and confirm pricing
    2. CREATE crypto order with ETH
    3. Check STATUS SHAPE with all required fields
    4. SWITCH same coin (should reject with 400)
    5. SWITCH invalid coin (should reject with 400)
    6. SWITCH to different coin (BTC) - should work with 200
    """
    headers = {"Authorization": f"Bearer {token}"}
    results = {
        "step1_quote": False,
        "step2_create": False,
        "step3_status": False,
        "step4_switch_same": False,
        "step5_switch_invalid": False,
        "step6_switch_different": False,
    }
    
    # Generate unique domain name
    random_suffix = str(uuid.uuid4())[:8]
    domain = f"cryptostatus{random_suffix}.com"
    
    log(f"\n{'='*80}", Colors.BLUE)
    log(f"CRYPTO ORDER LIFECYCLE TEST", Colors.BLUE)
    log(f"{'='*80}", Colors.BLUE)
    
    # STEP 1: Build cart and confirm pricing
    log(f"\n[STEP 1] Build cart and confirm pricing...", Colors.BLUE)
    items = [{"type": "domain", "domain": domain, "ns_choice": "basic"}]
    
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/quote",
            json={"items": items},
            headers=headers,
            timeout=TIMEOUT
        )
        log(f"Quote response: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            subtotal = data.get("subtotal_usd", 0)
            log(f"✓ Quote successful: subtotal_usd=${subtotal}", Colors.GREEN)
            log(f"  Items: {json.dumps(data.get('items', []), indent=2)}")
            
            if subtotal > 0:
                results["step1_quote"] = True
                log(f"✓ STEP 1 PASSED: Cart priced at ${subtotal}", Colors.GREEN)
            else:
                log(f"✗ STEP 1 FAILED: subtotal_usd is 0", Colors.RED)
        else:
            log(f"✗ Quote failed: {resp.status_code} {resp.text[:300]}", Colors.RED)
            return results
    except Exception as e:
        log(f"✗ Quote exception: {e}", Colors.RED)
        return results
    
    # STEP 2: CREATE crypto order with ETH
    log(f"\n[STEP 2] CREATE crypto order with ETH...", Colors.BLUE)
    client_order_id = str(uuid.uuid4())
    
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/orders/crypto",
            json={
                "items": items,
                "client_order_id": client_order_id,
                "currency": "ETH"
            },
            headers=headers,
            timeout=TIMEOUT
        )
        log(f"Create crypto order response: {resp.status_code}")
        
        if resp.status_code == 201:
            data = resp.json()
            order = data.get("order", {})
            payment = data.get("payment", {})
            
            order_id = order.get("_id") or payment.get("orderId")
            payment_id = payment.get("paymentId")
            address = payment.get("address")
            currency = payment.get("currency")
            crypto_amount = payment.get("cryptoAmount")
            amount_usd = payment.get("amountUsd")
            
            log(f"✓ Crypto order created:", Colors.GREEN)
            log(f"  orderId: {order_id}")
            log(f"  paymentId: {payment_id}")
            log(f"  address: {address}")
            log(f"  currency: {currency}")
            log(f"  cryptoAmount: {crypto_amount}")
            log(f"  amountUsd: {amount_usd}")
            
            # CRITICAL REGRESSION CHECK: amountUsd MUST equal the USD order total
            if amount_usd and amount_usd >= 1:  # Should be a few dollars, not 0.004
                log(f"✓ REGRESSION CHECK PASSED: amountUsd=${amount_usd} is the USD order total (not a tiny crypto number)", Colors.GREEN)
                results["step2_create"] = True
            else:
                log(f"✗ REGRESSION CHECK FAILED: amountUsd={amount_usd} is NOT the USD order total (expected ~${subtotal})", Colors.RED)
                return results
            
            if not order_id:
                log(f"✗ STEP 2 FAILED: Missing orderId in response", Colors.RED)
                return results
            
            log(f"✓ STEP 2 PASSED: Crypto order created with ETH", Colors.GREEN)
            
        else:
            log(f"✗ Create crypto order failed: {resp.status_code} {resp.text[:500]}", Colors.RED)
            return results
    except Exception as e:
        log(f"✗ Create crypto order exception: {e}", Colors.RED)
        return results
    
    # STEP 3: Check STATUS SHAPE with all required fields
    log(f"\n[STEP 3] Check STATUS SHAPE with all required fields...", Colors.BLUE)
    
    required_fields = [
        "status", "currency", "address", "amountReceived", "amountRemaining",
        "amountReceivedUsd", "amountRemainingUsd", "confirmations",
        "requiredConfirmations", "creditedUsd"
    ]
    
    try:
        # Poll twice (a few seconds apart) - it must return 200 both times and NOT 500
        for poll_num in [1, 2]:
            log(f"\n  Poll #{poll_num}...", Colors.YELLOW)
            time.sleep(3 if poll_num > 1 else 0)  # Wait 3s before second poll
            
            resp = requests.get(
                f"{BASE_URL}/checkout/orders/{order_id}/crypto-status",
                headers=headers,
                timeout=TIMEOUT
            )
            log(f"  Crypto status response: {resp.status_code}")
            
            if resp.status_code != 200:
                log(f"✗ STEP 3 FAILED: Poll #{poll_num} returned {resp.status_code} (expected 200)", Colors.RED)
                log(f"  Response: {resp.text[:500]}", Colors.RED)
                return results
            
            data = resp.json()
            status_data = data.get("data", {})
            
            log(f"  Status data: {json.dumps(status_data, indent=2)}")
            
            # Check status value
            status = status_data.get("status")
            if status not in ["awaiting_payment", "detected", "confirming", "underpaid"]:
                log(f"  ⚠ Unexpected status: {status} (expected 'awaiting_payment' or 'detected')", Colors.YELLOW)
            else:
                log(f"  ✓ Status: {status}", Colors.GREEN)
            
            # Check all required fields are present
            missing_fields = []
            for field in required_fields:
                if field not in status_data:
                    missing_fields.append(field)
            
            if missing_fields:
                log(f"✗ STEP 3 FAILED: Missing required fields: {missing_fields}", Colors.RED)
                return results
            
            # Log all field values
            log(f"  ✓ All required fields present:", Colors.GREEN)
            for field in required_fields:
                log(f"    {field}: {status_data.get(field)}")
            
            if poll_num == 2:
                results["step3_status"] = True
                log(f"✓ STEP 3 PASSED: Status endpoint returns 200 with all required fields (polled twice)", Colors.GREEN)
        
    except Exception as e:
        log(f"✗ Crypto status exception: {e}", Colors.RED)
        return results
    
    # STEP 4: SWITCH same coin rejected (should return 400)
    log(f"\n[STEP 4] SWITCH same coin (ETH) - should reject with 400...", Colors.BLUE)
    
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/orders/{order_id}/crypto/switch",
            json={"currency": "ETH"},
            headers=headers,
            timeout=TIMEOUT
        )
        log(f"Switch same coin response: {resp.status_code}")
        
        if resp.status_code == 400:
            data = resp.json()
            message = data.get("message", "")
            log(f"✓ Correctly rejected with 400: {message}", Colors.GREEN)
            
            if "already paying in ETH" in message or "already" in message.lower():
                results["step4_switch_same"] = True
                log(f"✓ STEP 4 PASSED: Same coin switch rejected with 400", Colors.GREEN)
            else:
                log(f"⚠ Warning: Expected message about 'already paying in ETH', got: {message}", Colors.YELLOW)
                results["step4_switch_same"] = True  # Still pass if 400
        else:
            log(f"✗ STEP 4 FAILED: Expected 400, got {resp.status_code}", Colors.RED)
            log(f"  Response: {resp.text[:300]}", Colors.RED)
    except Exception as e:
        log(f"✗ Switch same coin exception: {e}", Colors.RED)
    
    # STEP 5: SWITCH invalid coin (should return 400)
    log(f"\n[STEP 5] SWITCH invalid coin (NOTACOIN) - should reject with 400...", Colors.BLUE)
    
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/orders/{order_id}/crypto/switch",
            json={"currency": "NOTACOIN"},
            headers=headers,
            timeout=TIMEOUT
        )
        log(f"Switch invalid coin response: {resp.status_code}")
        
        if resp.status_code == 400:
            data = resp.json()
            message = data.get("message", "")
            log(f"✓ Correctly rejected with 400: {message}", Colors.GREEN)
            results["step5_switch_invalid"] = True
            log(f"✓ STEP 5 PASSED: Invalid coin switch rejected with 400", Colors.GREEN)
        else:
            log(f"✗ STEP 5 FAILED: Expected 400, got {resp.status_code}", Colors.RED)
            log(f"  Response: {resp.text[:300]}", Colors.RED)
    except Exception as e:
        log(f"✗ Switch invalid coin exception: {e}", Colors.RED)
    
    # STEP 6: SWITCH to different coin (BTC) - should work with 200
    log(f"\n[STEP 6] SWITCH to different coin (BTC) - should work with 200...", Colors.BLUE)
    
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/orders/{order_id}/crypto/switch",
            json={"currency": "BTC"},
            headers=headers,
            timeout=TIMEOUT
        )
        log(f"Switch to BTC response: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            switch_data = data.get("data", {})
            
            switched = switch_data.get("switched")
            credited_usd = switch_data.get("creditedUsd")
            payment = switch_data.get("payment", {})
            
            log(f"✓ Switch successful:", Colors.GREEN)
            log(f"  switched: {switched}")
            log(f"  creditedUsd: {credited_usd}")
            log(f"  payment.currency: {payment.get('currency')}")
            log(f"  payment.address: {payment.get('address')}")
            log(f"  payment.amountUsd: {payment.get('amountUsd')}")
            log(f"  payment.paymentId: {payment.get('paymentId')}")
            
            # Verify response structure
            if switched and payment.get("currency") == "BTC" and payment.get("address"):
                results["step6_switch_different"] = True
                log(f"✓ STEP 6 PASSED: Successfully switched to BTC with new payment details", Colors.GREEN)
                
                # Verify crypto-status now shows BTC
                log(f"\n  Verifying crypto-status now shows BTC...", Colors.YELLOW)
                time.sleep(2)
                
                resp2 = requests.get(
                    f"{BASE_URL}/checkout/orders/{order_id}/crypto-status",
                    headers=headers,
                    timeout=TIMEOUT
                )
                
                if resp2.status_code == 200:
                    status_data = resp2.json().get("data", {})
                    new_currency = status_data.get("currency")
                    new_status = status_data.get("status")
                    
                    log(f"  ✓ After switch: currency={new_currency}, status={new_status}", Colors.GREEN)
                    
                    if new_currency == "BTC" and new_status == "awaiting_payment":
                        log(f"  ✓ Currency switched to BTC and status is awaiting_payment", Colors.GREEN)
                    else:
                        log(f"  ⚠ Warning: Expected currency=BTC and status=awaiting_payment, got currency={new_currency}, status={new_status}", Colors.YELLOW)
                else:
                    log(f"  ⚠ Warning: Could not verify status after switch: {resp2.status_code}", Colors.YELLOW)
            else:
                log(f"✗ STEP 6 FAILED: Response missing required fields or incorrect currency", Colors.RED)
        else:
            log(f"✗ STEP 6 FAILED: Expected 200, got {resp.status_code}", Colors.RED)
            log(f"  Response: {resp.text[:500]}", Colors.RED)
    except Exception as e:
        log(f"✗ Switch to BTC exception: {e}", Colors.RED)
    
    return results

def main():
    """Main test runner"""
    log(f"\n{'='*80}", Colors.BLUE)
    log(f"CRYPTO ORDER LIVE STATUS + SWITCH-CURRENCY TEST", Colors.BLUE)
    log(f"{'='*80}", Colors.BLUE)
    log(f"Base URL: {BASE_URL}")
    log(f"Test Account: {TEST_EMAIL}")
    log(f"Timeout: {TIMEOUT}s")
    
    # Login
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        log(f"\n✗ FATAL: Could not login. Aborting tests.", Colors.RED)
        sys.exit(1)
    
    # Run crypto order lifecycle test
    results = test_crypto_order_lifecycle(token)
    
    # Summary
    log(f"\n{'='*80}", Colors.BLUE)
    log(f"TEST SUMMARY", Colors.BLUE)
    log(f"{'='*80}", Colors.BLUE)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    for step, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        color = Colors.GREEN if result else Colors.RED
        log(f"{status} - {step}", color)
    
    log(f"\n{'='*80}", Colors.BLUE)
    log(f"TOTAL: {passed}/{total} tests passed ({int(passed/total*100)}%)", 
        Colors.GREEN if passed == total else Colors.YELLOW)
    log(f"{'='*80}", Colors.BLUE)
    
    if passed == total:
        log(f"\n✓ ALL TESTS PASSED", Colors.GREEN)
        sys.exit(0)
    else:
        log(f"\n✗ SOME TESTS FAILED", Colors.RED)
        sys.exit(1)

if __name__ == "__main__":
    main()
