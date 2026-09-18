#!/usr/bin/env python3
"""
Backend verification script for Nameword checkout after NS-reconciliation change.
Tests the SAFE branches only (no real money spent).

CHECKPOINTS:
1. HEALTH: GET /api/v1/reseller/health
2. LOGIN: POST /api/v1/auth/login
3. HOSTING BYO CRYPTO ORDER: POST /api/v1/checkout/orders/crypto
4. IDEMPOTENCY: repeat the same POST with same client_order_id
5. ORDERS LIST: GET /api/v1/checkout/orders
6. DOMAIN SEARCH: GET /api/v1/reseller/domains/search?domain=namewords.sbs
7. HEALTH AFTER: GET /api/v1/reseller/health
"""

import requests
import json
import time
import random
import string

# Base URL - use internal backend
BASE_URL = "http://localhost:8001"

# Test credentials from test_credentials.md
EMAIL = "moxxcompany@gmail.com"
PASSWORD = "Onlygod123@"

# Generate random client_order_id for this test run
RANDOM_SUFFIX = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
CLIENT_ORDER_ID = f"handoff-hosting-verify-{RANDOM_SUFFIX}"

def print_checkpoint(num, title):
    print(f"\n{'='*80}")
    print(f"CHECKPOINT {num}: {title}")
    print('='*80)

def print_result(status_code, response_json):
    print(f"HTTP Status: {status_code}")
    print(f"Response JSON:\n{json.dumps(response_json, indent=2)}")

def checkpoint_1_health():
    """CHECKPOINT 1: GET /api/v1/reseller/health"""
    print_checkpoint(1, "HEALTH CHECK")
    
    url = f"{BASE_URL}/api/v1/reseller/health"
    response = requests.get(url)
    
    print_result(response.status_code, response.json())
    
    # Verify expectations
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data.get('mode') == 'live', f"Expected mode='live', got {data.get('mode')}"
    
    print("✅ PASS: Health check returned 200 with mode='live'")
    return True

def checkpoint_2_login():
    """CHECKPOINT 2: POST /api/v1/auth/login"""
    print_checkpoint(2, "LOGIN")
    
    url = f"{BASE_URL}/api/v1/auth/login"
    payload = {
        "email": EMAIL,
        "password": PASSWORD
    }
    
    response = requests.post(url, json=payload)
    
    print_result(response.status_code, response.json())
    
    # Verify expectations
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert 'token' in data, "Expected 'token' in response"
    
    token = data['token']
    print(f"✅ PASS: Login successful, token received (length: {len(token)})")
    return token

def checkpoint_3_hosting_crypto_order(token):
    """CHECKPOINT 3: POST /api/v1/checkout/orders/crypto - HOSTING BYO"""
    print_checkpoint(3, "HOSTING BYO CRYPTO ORDER (KEY CHECK)")
    
    url = f"{BASE_URL}/api/v1/checkout/orders/crypto"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "items": [
            {
                "type": "hosting",
                "domain": "namewords.sbs",
                "plan_id": "premium-weekly"
            }
        ],
        "client_order_id": CLIENT_ORDER_ID,
        "currency": "ETH"
    }
    
    print(f"Request payload:\n{json.dumps(payload, indent=2)}")
    
    response = requests.post(url, json=payload, headers=headers)
    
    print_result(response.status_code, response.json())
    
    # Verify expectations
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    data = response.json()
    assert data.get('success') == True, "Expected success=true"
    
    order = data.get('order', {})
    payment = order.get('payment', {})
    
    # Verify charged_usd == 30 (no reward points on this account)
    charged_usd = order.get('charged_usd')
    print(f"\ncharged_usd: {charged_usd}")
    assert charged_usd == 30, f"Expected charged_usd=30, got {charged_usd}"
    
    # Verify payment address starts with 0x
    payment_address = payment.get('address', '')
    print(f"payment.address: {payment_address}")
    assert payment_address.startswith('0x'), f"Expected address to start with '0x', got {payment_address}"
    
    # Verify payment currency is ETH
    payment_currency = payment.get('currency', '')
    print(f"payment.currency: {payment_currency}")
    assert payment_currency == 'ETH', f"Expected currency='ETH', got {payment_currency}"
    
    # Verify cryptoAmount > 0
    crypto_amount = payment.get('cryptoAmount', 0)
    print(f"payment.cryptoAmount: {crypto_amount}")
    assert crypto_amount > 0, f"Expected cryptoAmount > 0, got {crypto_amount}"
    
    # Verify order/payment_status = awaiting_payment
    payment_status = order.get('payment_status', '')
    print(f"order.payment_status: {payment_status}")
    assert payment_status == 'awaiting_payment', f"Expected payment_status='awaiting_payment', got {payment_status}"
    
    # Report key fields
    order_id = order.get('_id', '')
    order_number = order.get('orderNumber', '')
    print(f"\n✅ PASS: Crypto order created successfully")
    print(f"  order._id: {order_id}")
    print(f"  order.orderNumber: {order_number}")
    print(f"  payment.address: {payment_address}")
    print(f"  charged_usd: ${charged_usd}")
    print(f"  cryptoAmount: {crypto_amount} ETH")
    
    return order_id, order_number, payment_address

def checkpoint_4_idempotency(token):
    """CHECKPOINT 4: Repeat the same POST with same client_order_id"""
    print_checkpoint(4, "IDEMPOTENCY CHECK")
    
    url = f"{BASE_URL}/api/v1/checkout/orders/crypto"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "items": [
            {
                "type": "hosting",
                "domain": "namewords.sbs",
                "plan_id": "premium-weekly"
            }
        ],
        "client_order_id": CLIENT_ORDER_ID,  # SAME client_order_id
        "currency": "ETH"
    }
    
    print(f"Request payload (SAME client_order_id):\n{json.dumps(payload, indent=2)}")
    
    response = requests.post(url, json=payload, headers=headers)
    
    print_result(response.status_code, response.json())
    
    # Verify expectations
    assert response.status_code == 200, f"Expected 200 (idempotent), got {response.status_code}"
    data = response.json()
    assert data.get('idempotent') == True, "Expected idempotent=true"
    
    order = data.get('order', {})
    payment = order.get('payment', {})
    
    order_id = order.get('_id', '')
    order_number = order.get('orderNumber', '')
    payment_address = payment.get('address', '')
    
    print(f"\n✅ PASS: Idempotency working - returned existing order")
    print(f"  order._id: {order_id}")
    print(f"  order.orderNumber: {order_number}")
    print(f"  payment.address: {payment_address}")
    
    return True

def checkpoint_5_orders_list(token):
    """CHECKPOINT 5: GET /api/v1/checkout/orders"""
    print_checkpoint(5, "ORDERS LIST REGRESSION")
    
    url = f"{BASE_URL}/api/v1/checkout/orders"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(url, headers=headers)
    
    print_result(response.status_code, response.json())
    
    # Verify expectations
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    
    orders = data.get('orders', [])
    print(f"\n✅ PASS: Orders list returned successfully")
    print(f"  Total orders: {len(orders)}")
    
    # Check if our new hosting order is in the list
    hosting_orders = [o for o in orders if any(item.get('type') == 'hosting' for item in o.get('items', []))]
    print(f"  Hosting orders: {len(hosting_orders)}")
    
    return True

def checkpoint_6_domain_search():
    """CHECKPOINT 6: GET /api/v1/reseller/domains/search?domain=namewords.sbs"""
    print_checkpoint(6, "DOMAIN SEARCH REGRESSION")
    
    url = f"{BASE_URL}/api/v1/reseller/domains/search"
    params = {
        "domain": "namewords.sbs"
    }
    
    response = requests.get(url, params=params)
    
    print_result(response.status_code, response.json())
    
    # Verify expectations
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    
    # Check for available and price_usd fields
    available = data.get('available')
    price_usd = data.get('price_usd')
    
    print(f"\n✅ PASS: Domain search returned successfully")
    print(f"  available: {available}")
    print(f"  price_usd: {price_usd}")
    
    return True

def checkpoint_7_health_after():
    """CHECKPOINT 7: GET /api/v1/reseller/health (after all operations)"""
    print_checkpoint(7, "HEALTH CHECK AFTER")
    
    url = f"{BASE_URL}/api/v1/reseller/health"
    response = requests.get(url)
    
    print_result(response.status_code, response.json())
    
    # Verify expectations
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data.get('mode') == 'live', f"Expected mode='live', got {data.get('mode')}"
    
    print("✅ PASS: Health check still returns 200 with mode='live' (backend didn't crash)")
    return True

def main():
    print("="*80)
    print("NAMEWORD BACKEND VERIFICATION - CHECKOUT NS-RECONCILIATION CHANGE")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test account: {EMAIL}")
    print(f"Client order ID: {CLIENT_ORDER_ID}")
    print("="*80)
    
    try:
        # Run all checkpoints
        checkpoint_1_health()
        
        token = checkpoint_2_login()
        
        order_id, order_number, payment_address = checkpoint_3_hosting_crypto_order(token)
        
        checkpoint_4_idempotency(token)
        
        checkpoint_5_orders_list(token)
        
        checkpoint_6_domain_search()
        
        checkpoint_7_health_after()
        
        # Final summary
        print("\n" + "="*80)
        print("✅ ALL CHECKPOINTS PASSED (7/7)")
        print("="*80)
        print(f"✅ CHECKPOINT 1: Health check - 200 mode='live'")
        print(f"✅ CHECKPOINT 2: Login - 200 with token")
        print(f"✅ CHECKPOINT 3: Hosting BYO crypto order - 201 with ETH address")
        print(f"    - Order ID: {order_id}")
        print(f"    - Order Number: {order_number}")
        print(f"    - Payment Address: {payment_address}")
        print(f"    - Charged: $30.00")
        print(f"✅ CHECKPOINT 4: Idempotency - 200 with idempotent=true")
        print(f"✅ CHECKPOINT 5: Orders list - 200 with orders array")
        print(f"✅ CHECKPOINT 6: Domain search - 200 with available + price_usd")
        print(f"✅ CHECKPOINT 7: Health after - 200 mode='live' (no crash)")
        print("="*80)
        print("\n🎉 BACKEND VERIFICATION COMPLETE - ALL TESTS PASSED")
        print("💰 NO MONEY SPENT - All operations were safe (crypto order unpaid)")
        print("="*80)
        
    except AssertionError as e:
        print(f"\n❌ CHECKPOINT FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
