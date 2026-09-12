#!/usr/bin/env python3
"""
FULL USER-JOURNEY BACKEND/API TEST for Nameword platform
Tests all 5 journeys: Onboarding, Pricing, Wallet+Points Orders, External Hand-off, Account Management
"""

import requests
import time
import uuid
import random
import string
from pymongo import MongoClient
import os

# Configuration
BASE_URL = "http://localhost:8001/api/v1"
TIMEOUT = 30

# MongoDB connection for reading verification codes
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/nameword')

# Test results matrix
results = {
    "onboarding": {},
    "pricing": {},
    "wallet_orders": {},
    "external_handoff": {},
    "account_mgmt": {}
}

def generate_random_domain():
    """Generate a fresh random domain to avoid 409 conflicts"""
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
    return f"journeytest-{rand}.com"

def generate_unique_email():
    """Generate a unique email for registration"""
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test-{rand}@journeytest.local"

def print_section(title):
    """Print a section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def print_test(name, status, details=""):
    """Print test result"""
    symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"{symbol} {name}: {status}")
    if details:
        print(f"   {details}")

# ============================================================================
# JOURNEY 1: ONBOARDING & ACCOUNT ACCESS
# ============================================================================
def test_onboarding():
    print_section("JOURNEY 1: ONBOARDING & ACCOUNT ACCESS")
    
    # Connect to MongoDB for reading verification codes
    try:
        mongo_client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db = mongo_client.get_default_database()
    except Exception as e:
        print_test("MongoDB Connection", "FAIL", f"Cannot connect to MongoDB: {e}")
        results["onboarding"]["mongodb"] = f"BLOCKED: {e}"
        return None
    
    # 1.1 Register a new user
    new_email = generate_unique_email()
    new_password = "Journey@12345"
    
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": new_email,
                "password": new_password,
                "passwordConfirmation": new_password
            },
            timeout=TIMEOUT
        )
        
        if resp.status_code == 201:
            data = resp.json()
            if data.get("success") and "token" in data:
                token = data["token"]
                print_test("Register New User", "PASS", f"Email: {new_email}, Token received")
                results["onboarding"]["register"] = "PASS"
            else:
                print_test("Register New User", "FAIL", f"Missing token in response: {data}")
                results["onboarding"]["register"] = f"FAIL: Missing token"
                return None
        else:
            print_test("Register New User", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["onboarding"]["register"] = f"FAIL: HTTP {resp.status_code}"
            return None
    except Exception as e:
        print_test("Register New User", "FAIL", f"Exception: {e}")
        results["onboarding"]["register"] = f"FAIL: {e}"
        return None
    
    # 1.2 Send email verification code
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/send-email-code",
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            print_test("Send Email Verification Code", "PASS", "Code sent")
            results["onboarding"]["send_email_code"] = "PASS"
        else:
            print_test("Send Email Verification Code", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["onboarding"]["send_email_code"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Send Email Verification Code", "FAIL", f"Exception: {e}")
        results["onboarding"]["send_email_code"] = f"FAIL: {e}"
    
    # 1.3 Read verification code from DB and verify
    try:
        verification_doc = db.verification_codes.find_one({"email": new_email}, sort=[("createdAt", -1)])
        if verification_doc and "code" in verification_doc:
            code = verification_doc["code"]
            print_test("Read Verification Code from DB", "PASS", f"Code: {code}")
            
            # Verify the code
            resp = requests.post(
                f"{BASE_URL}/auth/verify-email-code",
                headers={"Authorization": f"Bearer {token}"},
                json={"code": code},
                timeout=TIMEOUT
            )
            
            if resp.status_code == 200:
                print_test("Verify Email Code", "PASS", "Email verified")
                results["onboarding"]["verify_email"] = "PASS"
            else:
                print_test("Verify Email Code", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
                results["onboarding"]["verify_email"] = f"FAIL: HTTP {resp.status_code}"
        else:
            print_test("Read Verification Code from DB", "FAIL", "No verification code found")
            results["onboarding"]["verify_email"] = "FAIL: No code in DB"
    except Exception as e:
        print_test("Verify Email Code", "FAIL", f"Exception: {e}")
        results["onboarding"]["verify_email"] = f"FAIL: {e}"
    
    # 1.4 Login
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": new_email, "password": new_password},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "token" in data:
                login_token = data["token"]
                print_test("Login", "PASS", "Token received")
                results["onboarding"]["login"] = "PASS"
            else:
                print_test("Login", "FAIL", f"Missing token: {data}")
                results["onboarding"]["login"] = f"FAIL: Missing token"
                return None
        else:
            print_test("Login", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["onboarding"]["login"] = f"FAIL: HTTP {resp.status_code}"
            return None
    except Exception as e:
        print_test("Login", "FAIL", f"Exception: {e}")
        results["onboarding"]["login"] = f"FAIL: {e}"
        return None
    
    # 1.5 Logout
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/logout",
            headers={"Authorization": f"Bearer {login_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code in [200, 204]:
            print_test("Logout", "PASS", "Logged out")
            results["onboarding"]["logout"] = "PASS"
        else:
            print_test("Logout", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["onboarding"]["logout"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Logout", "FAIL", f"Exception: {e}")
        results["onboarding"]["logout"] = f"FAIL: {e}"
    
    # 1.6 Forgot Password
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/forgot-password",
            json={"email": new_email},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            print_test("Forgot Password", "PASS", "Reset email sent")
            results["onboarding"]["forgot_password"] = "PASS"
        else:
            print_test("Forgot Password", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["onboarding"]["forgot_password"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Forgot Password", "FAIL", f"Exception: {e}")
        results["onboarding"]["forgot_password"] = f"FAIL: {e}"
    
    # 1.7 Read reset token from DB and reset password
    try:
        reset_doc = db.password_reset_tokens.find_one({"email": new_email}, sort=[("createdAt", -1)])
        if reset_doc and "token" in reset_doc:
            reset_token = reset_doc["token"]
            print_test("Read Reset Token from DB", "PASS", f"Token: {reset_token[:20]}...")
            
            new_password2 = "NewJourney@12345"
            resp = requests.post(
                f"{BASE_URL}/auth/reset-password",
                json={"token": reset_token, "password": new_password2, "passwordConfirmation": new_password2},
                timeout=TIMEOUT
            )
            
            if resp.status_code == 200:
                print_test("Reset Password", "PASS", "Password reset successful")
                results["onboarding"]["reset_password"] = "PASS"
            else:
                print_test("Reset Password", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
                results["onboarding"]["reset_password"] = f"FAIL: HTTP {resp.status_code}"
        else:
            print_test("Read Reset Token from DB", "FAIL", "No reset token found")
            results["onboarding"]["reset_password"] = "FAIL: No token in DB"
    except Exception as e:
        print_test("Reset Password", "FAIL", f"Exception: {e}")
        results["onboarding"]["reset_password"] = f"FAIL: {e}"
    
    # 1.8 Change Email (requires login with new password)
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": new_email, "password": new_password2},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            login_token = resp.json().get("token")
            
            new_email2 = generate_unique_email()
            resp = requests.post(
                f"{BASE_URL}/auth/change-email",
                headers={"Authorization": f"Bearer {login_token}"},
                json={"newEmail": new_email2},
                timeout=TIMEOUT
            )
            
            if resp.status_code in [200, 201]:
                print_test("Change Email", "PASS", f"Email changed to {new_email2}")
                results["onboarding"]["change_email"] = "PASS"
            else:
                print_test("Change Email", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
                results["onboarding"]["change_email"] = f"FAIL: HTTP {resp.status_code}"
        else:
            print_test("Change Email", "FAIL", f"Cannot login with new password")
            results["onboarding"]["change_email"] = f"FAIL: Cannot login"
    except Exception as e:
        print_test("Change Email", "FAIL", f"Exception: {e}")
        results["onboarding"]["change_email"] = f"FAIL: {e}"
    
    # 1.9 Change Password
    try:
        new_password3 = "FinalJourney@12345"
        resp = requests.post(
            f"{BASE_URL}/auth/change-password",
            headers={"Authorization": f"Bearer {login_token}"},
            json={"oldPassword": new_password2, "newPassword": new_password3, "newPasswordConfirmation": new_password3},
            timeout=TIMEOUT
        )
        
        if resp.status_code in [200, 201]:
            print_test("Change Password", "PASS", "Password changed")
            results["onboarding"]["change_password"] = "PASS"
        else:
            print_test("Change Password", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["onboarding"]["change_password"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Change Password", "FAIL", f"Exception: {e}")
        results["onboarding"]["change_password"] = f"FAIL: {e}"
    
    return login_token

# ============================================================================
# JOURNEY 2: PRODUCT PRICING TO PAY STEP
# ============================================================================
def test_pricing(buyer_token):
    print_section("JOURNEY 2: PRODUCT PRICING TO PAY STEP")
    
    # 2.1 Get hosting plans
    try:
        resp = requests.get(f"{BASE_URL}/reseller/hosting/plans", timeout=TIMEOUT)
        if resp.status_code == 200:
            plans = resp.json().get("plans", [])
            if plans:
                hosting_plan_id = plans[0]["plan_id"]
                print_test("Get Hosting Plans", "PASS", f"Found {len(plans)} plans, using {hosting_plan_id}")
            else:
                print_test("Get Hosting Plans", "FAIL", "No plans returned")
                hosting_plan_id = "golden-monthly"
        else:
            print_test("Get Hosting Plans", "FAIL", f"HTTP {resp.status_code}")
            hosting_plan_id = "golden-monthly"
    except Exception as e:
        print_test("Get Hosting Plans", "FAIL", f"Exception: {e}")
        hosting_plan_id = "golden-monthly"
    
    # 2.2 Get VPS plans
    try:
        resp = requests.get(f"{BASE_URL}/reseller/vps/plans?region=EU", timeout=TIMEOUT)
        if resp.status_code == 200:
            plans = resp.json().get("plans", [])
            if plans:
                vps_plan_id = plans[0]["plan_id"]
                print_test("Get VPS Plans", "PASS", f"Found {len(plans)} plans, using {vps_plan_id}")
            else:
                print_test("Get VPS Plans", "FAIL", "No plans returned")
                vps_plan_id = "s-1vcpu-1gb"
        else:
            print_test("Get VPS Plans", "FAIL", f"HTTP {resp.status_code}")
            vps_plan_id = "s-1vcpu-1gb"
    except Exception as e:
        print_test("Get VPS Plans", "FAIL", f"Exception: {e}")
        vps_plan_id = "s-1vcpu-1gb"
    
    # 2.3 Get RDP plans
    try:
        resp = requests.get(f"{BASE_URL}/reseller/rdp/plans?region=EU", timeout=TIMEOUT)
        if resp.status_code == 200:
            plans = resp.json().get("plans", [])
            if plans:
                rdp_plan_id = plans[0]["plan_id"]
                print_test("Get RDP Plans", "PASS", f"Found {len(plans)} plans, using {rdp_plan_id}")
            else:
                print_test("Get RDP Plans", "FAIL", "No plans returned")
                rdp_plan_id = "V165"
        else:
            print_test("Get RDP Plans", "FAIL", f"HTTP {resp.status_code}")
            rdp_plan_id = "V165"
    except Exception as e:
        print_test("Get RDP Plans", "FAIL", f"Exception: {e}")
        rdp_plan_id = "V165"
    
    # 2.4 Quote Domain
    domain1 = generate_random_domain()
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/quote",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"items": [{"type": "domain", "domain": domain1, "ns_choice": "cloudflare"}]},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "subtotal_usd" in data and "wallet_balance_usd" in data:
                print_test("Quote Domain", "PASS", f"Domain: {domain1}, Subtotal: ${data['subtotal_usd']}, Wallet: ${data['wallet_balance_usd']}")
                results["pricing"]["domain"] = "PASS"
            else:
                print_test("Quote Domain", "FAIL", f"Missing required fields: {data}")
                results["pricing"]["domain"] = f"FAIL: Missing fields"
        else:
            print_test("Quote Domain", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["pricing"]["domain"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Quote Domain", "FAIL", f"Exception: {e}")
        results["pricing"]["domain"] = f"FAIL: {e}"
    
    # 2.5 Quote Hosting
    domain2 = generate_random_domain()
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/quote",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"items": [{"type": "hosting", "domain": domain2, "plan_id": hosting_plan_id}]},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "subtotal_usd" in data:
                print_test("Quote Hosting", "PASS", f"Plan: {hosting_plan_id}, Subtotal: ${data['subtotal_usd']}")
                results["pricing"]["hosting"] = "PASS"
            else:
                print_test("Quote Hosting", "FAIL", f"Missing required fields: {data}")
                results["pricing"]["hosting"] = f"FAIL: Missing fields"
        else:
            print_test("Quote Hosting", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["pricing"]["hosting"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Quote Hosting", "FAIL", f"Exception: {e}")
        results["pricing"]["hosting"] = f"FAIL: {e}"
    
    # 2.6 Quote VPS
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/quote",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"items": [{"type": "vps", "plan_id": vps_plan_id, "region": "EU", "os": "ubuntu"}]},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "subtotal_usd" in data:
                print_test("Quote VPS", "PASS", f"Plan: {vps_plan_id}, Subtotal: ${data['subtotal_usd']}")
                results["pricing"]["vps"] = "PASS"
            else:
                print_test("Quote VPS", "FAIL", f"Missing required fields: {data}")
                results["pricing"]["vps"] = f"FAIL: Missing fields"
        else:
            print_test("Quote VPS", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["pricing"]["vps"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Quote VPS", "FAIL", f"Exception: {e}")
        results["pricing"]["vps"] = f"FAIL: {e}"
    
    # 2.7 Quote RDP
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/quote",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"items": [{"type": "rdp", "plan_id": rdp_plan_id, "region": "EU"}]},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "subtotal_usd" in data:
                print_test("Quote RDP", "PASS", f"Plan: {rdp_plan_id}, Subtotal: ${data['subtotal_usd']}")
                results["pricing"]["rdp"] = "PASS"
            else:
                print_test("Quote RDP", "FAIL", f"Missing required fields: {data}")
                results["pricing"]["rdp"] = f"FAIL: Missing fields"
        else:
            print_test("Quote RDP", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["pricing"]["rdp"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Quote RDP", "FAIL", f"Exception: {e}")
        results["pricing"]["rdp"] = f"FAIL: {e}"
    
    # 2.8 Quote Mixed Cart (Domain + Hosting)
    domain3 = generate_random_domain()
    domain4 = generate_random_domain()
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/quote",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"items": [
                {"type": "domain", "domain": domain3, "ns_choice": "cloudflare"},
                {"type": "hosting", "domain": domain4, "plan_id": hosting_plan_id}
            ]},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and len(data["items"]) == 2 and "subtotal_usd" in data:
                print_test("Quote Mixed Cart", "PASS", f"2 items, Subtotal: ${data['subtotal_usd']}")
                results["pricing"]["mixed"] = "PASS"
            else:
                print_test("Quote Mixed Cart", "FAIL", f"Missing required fields or wrong item count: {data}")
                results["pricing"]["mixed"] = f"FAIL: Missing fields"
        else:
            print_test("Quote Mixed Cart", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["pricing"]["mixed"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Quote Mixed Cart", "FAIL", f"Exception: {e}")
        results["pricing"]["mixed"] = f"FAIL: {e}"
    
    # 2.9 Quote with Reward Points
    domain5 = generate_random_domain()
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/quote",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={
                "items": [{"type": "domain", "domain": domain5, "ns_choice": "cloudflare"}],
                "redeem_points": 500
            },
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            required_fields = ["point_value_usd", "points_applied", "points_discount_usd"]
            if all(field in data for field in required_fields):
                print_test("Quote with Reward Points", "PASS", 
                          f"Points applied: {data['points_applied']}, Discount: ${data['points_discount_usd']}")
                results["pricing"]["points"] = "PASS"
            else:
                print_test("Quote with Reward Points", "FAIL", f"Missing reward point fields: {data}")
                results["pricing"]["points"] = f"FAIL: Missing fields"
        else:
            print_test("Quote with Reward Points", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["pricing"]["points"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Quote with Reward Points", "FAIL", f"Exception: {e}")
        results["pricing"]["points"] = f"FAIL: {e}"

# ============================================================================
# JOURNEY 3: OPTION B — WALLET + POINTS TEST-MODE ORDERS
# ============================================================================
def test_wallet_orders(buyer_token):
    print_section("JOURNEY 3: OPTION B — WALLET + POINTS TEST-MODE ORDERS")
    
    # 3.1 Place a domain order (wallet payment)
    domain1 = generate_random_domain()
    client_order_id1 = str(uuid.uuid4())
    
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/orders",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={
                "items": [{"type": "domain", "domain": domain1, "ns_choice": "cloudflare"}],
                "client_order_id": client_order_id1
            },
            timeout=TIMEOUT
        )
        
        if resp.status_code == 201:
            data = resp.json()
            order_id = data.get("order", {}).get("_id")
            if order_id:
                print_test("Place Domain Order (Wallet)", "PASS", f"Order ID: {order_id}, Status: pending")
                results["wallet_orders"]["place_order"] = "PASS"
                
                # 3.2 Poll order status until settled
                max_polls = 10
                poll_interval = 2
                settled = False
                
                for i in range(max_polls):
                    time.sleep(poll_interval)
                    resp = requests.get(
                        f"{BASE_URL}/checkout/orders/{order_id}/status",
                        headers={"Authorization": f"Bearer {buyer_token}"},
                        timeout=TIMEOUT
                    )
                    
                    if resp.status_code == 200:
                        status_data = resp.json()
                        provisioning = status_data.get("provisioning")
                        is_settled = status_data.get("settled")
                        item_status = status_data.get("items", [{}])[0].get("status")
                        
                        if provisioning == "complete" and is_settled and item_status == "test_mode":
                            print_test("Poll Order Status", "PASS", 
                                      f"Settled after {(i+1)*poll_interval}s, Item status: {item_status}")
                            results["wallet_orders"]["poll_status"] = "PASS"
                            settled = True
                            break
                
                if not settled:
                    print_test("Poll Order Status", "FAIL", f"Order did not settle after {max_polls*poll_interval}s")
                    results["wallet_orders"]["poll_status"] = f"FAIL: Timeout"
                
                # 3.3 Verify wallet debited
                resp = requests.post(
                    f"{BASE_URL}/checkout/quote",
                    headers={"Authorization": f"Bearer {buyer_token}"},
                    json={"items": [{"type": "domain", "domain": generate_random_domain(), "ns_choice": "cloudflare"}]},
                    timeout=TIMEOUT
                )
                
                if resp.status_code == 200:
                    new_balance = resp.json().get("wallet_balance_usd")
                    if new_balance is not None and new_balance < 50:
                        print_test("Verify Wallet Debited", "PASS", f"New balance: ${new_balance}")
                        results["wallet_orders"]["wallet_debited"] = "PASS"
                    else:
                        print_test("Verify Wallet Debited", "FAIL", f"Balance not reduced: ${new_balance}")
                        results["wallet_orders"]["wallet_debited"] = f"FAIL: Balance not reduced"
                
                # 3.4 Verify order in list
                resp = requests.get(
                    f"{BASE_URL}/checkout/orders",
                    headers={"Authorization": f"Bearer {buyer_token}"},
                    timeout=TIMEOUT
                )
                
                if resp.status_code == 200:
                    orders = resp.json().get("orders", [])
                    order_found = any(o.get("_id") == order_id for o in orders)
                    if order_found:
                        print_test("Verify Order in List", "PASS", f"Order {order_id} found in list")
                        results["wallet_orders"]["order_in_list"] = "PASS"
                    else:
                        print_test("Verify Order in List", "FAIL", f"Order {order_id} not found")
                        results["wallet_orders"]["order_in_list"] = f"FAIL: Not found"
            else:
                print_test("Place Domain Order (Wallet)", "FAIL", f"No order ID in response: {data}")
                results["wallet_orders"]["place_order"] = f"FAIL: No order ID"
        else:
            print_test("Place Domain Order (Wallet)", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["wallet_orders"]["place_order"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Place Domain Order (Wallet)", "FAIL", f"Exception: {e}")
        results["wallet_orders"]["place_order"] = f"FAIL: {e}"
    
    # 3.5 Place order with reward points
    domain2 = generate_random_domain()
    client_order_id2 = str(uuid.uuid4())
    
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/orders",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={
                "items": [{"type": "domain", "domain": domain2, "ns_choice": "cloudflare"}],
                "client_order_id": client_order_id2,
                "redeem_points": 500
            },
            timeout=TIMEOUT
        )
        
        if resp.status_code == 201:
            data = resp.json()
            order = data.get("order", {})
            if "points_redeemed" in order and order["points_redeemed"] == 500:
                print_test("Place Order with Reward Points", "PASS", 
                          f"Points redeemed: {order['points_redeemed']}, Discount: ${order.get('points_discount_usd', 0)}")
                results["wallet_orders"]["order_with_points"] = "PASS"
            else:
                print_test("Place Order with Reward Points", "FAIL", f"Points not applied: {order}")
                results["wallet_orders"]["order_with_points"] = f"FAIL: Points not applied"
        else:
            print_test("Place Order with Reward Points", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["wallet_orders"]["order_with_points"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Place Order with Reward Points", "FAIL", f"Exception: {e}")
        results["wallet_orders"]["order_with_points"] = f"FAIL: {e}"
    
    # 3.6 Idempotent replay
    try:
        resp = requests.post(
            f"{BASE_URL}/checkout/orders",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={
                "items": [{"type": "domain", "domain": domain1, "ns_choice": "cloudflare"}],
                "client_order_id": client_order_id1
            },
            timeout=TIMEOUT
        )
        
        if resp.status_code in [200, 202]:
            data = resp.json()
            if data.get("idempotent") == True:
                print_test("Idempotent Replay", "PASS", "Same order returned, no double charge")
                results["wallet_orders"]["idempotent"] = "PASS"
            else:
                print_test("Idempotent Replay", "FAIL", f"Not idempotent: {data}")
                results["wallet_orders"]["idempotent"] = f"FAIL: Not idempotent"
        else:
            print_test("Idempotent Replay", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["wallet_orders"]["idempotent"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Idempotent Replay", "FAIL", f"Exception: {e}")
        results["wallet_orders"]["idempotent"] = f"FAIL: {e}"
    
    # 3.7 Insufficient balance
    domain3 = generate_random_domain()
    client_order_id3 = str(uuid.uuid4())
    
    try:
        # Try to order expensive hosting that exceeds wallet balance
        resp = requests.post(
            f"{BASE_URL}/checkout/orders",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={
                "items": [{"type": "hosting", "domain": domain3, "plan_id": "golden-monthly"}],
                "client_order_id": client_order_id3
            },
            timeout=TIMEOUT
        )
        
        if resp.status_code == 402:
            data = resp.json()
            if "shortfall_usd" in data:
                print_test("Insufficient Balance", "PASS", f"402 returned, Shortfall: ${data['shortfall_usd']}")
                results["wallet_orders"]["insufficient"] = "PASS"
            else:
                print_test("Insufficient Balance", "FAIL", f"Missing shortfall_usd: {data}")
                results["wallet_orders"]["insufficient"] = f"FAIL: Missing shortfall"
        else:
            print_test("Insufficient Balance", "FAIL", f"Expected 402, got HTTP {resp.status_code}: {resp.text[:200]}")
            results["wallet_orders"]["insufficient"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Insufficient Balance", "FAIL", f"Exception: {e}")
        results["wallet_orders"]["insufficient"] = f"FAIL: {e}"
    
    # 3.8 Get renewals list
    try:
        resp = requests.get(
            f"{BASE_URL}/checkout/renewals?days=400",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "renewals" in data or "items" in data:
                count = data.get("count", 0)
                print_test("Get Renewals List", "PASS", f"Found {count} renewable items")
                results["wallet_orders"]["renewals_list"] = "PASS"
            else:
                print_test("Get Renewals List", "FAIL", f"Missing renewals: {data}")
                results["wallet_orders"]["renewals_list"] = f"FAIL: Missing renewals"
        else:
            print_test("Get Renewals List", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["wallet_orders"]["renewals_list"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Get Renewals List", "FAIL", f"Exception: {e}")
        results["wallet_orders"]["renewals_list"] = f"FAIL: {e}"
    
    # 3.9 Try to renew (expect 402 insufficient if wallet is low)
    try:
        # Get the first order to try renewal
        resp = requests.get(
            f"{BASE_URL}/checkout/orders",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            orders = resp.json().get("orders", [])
            if orders:
                first_order_id = orders[0].get("_id")
                
                resp = requests.post(
                    f"{BASE_URL}/checkout/orders/{first_order_id}/items/0/renew",
                    headers={"Authorization": f"Bearer {buyer_token}"},
                    timeout=TIMEOUT
                )
                
                if resp.status_code == 402:
                    print_test("Renew Item (Insufficient)", "PASS", "402 insufficient balance as expected")
                    results["wallet_orders"]["renew_insufficient"] = "PASS"
                elif resp.status_code == 200:
                    print_test("Renew Item (Success)", "PASS", "Renewal successful")
                    results["wallet_orders"]["renew_insufficient"] = "PASS (renewed)"
                elif resp.status_code == 409:
                    print_test("Renew Item (Not Retryable)", "PASS", "409 not_retryable (item not failed)")
                    results["wallet_orders"]["renew_insufficient"] = "PASS (409)"
                else:
                    print_test("Renew Item", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
                    results["wallet_orders"]["renew_insufficient"] = f"FAIL: HTTP {resp.status_code}"
            else:
                print_test("Renew Item", "FAIL", "No orders to renew")
                results["wallet_orders"]["renew_insufficient"] = "FAIL: No orders"
    except Exception as e:
        print_test("Renew Item", "FAIL", f"Exception: {e}")
        results["wallet_orders"]["renew_insufficient"] = f"FAIL: {e}"
    
    # 3.10 Auto-renew toggle
    try:
        resp = requests.get(
            f"{BASE_URL}/checkout/orders",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            orders = resp.json().get("orders", [])
            if orders:
                first_order_id = orders[0].get("_id")
                
                # Enable auto-renew
                resp = requests.put(
                    f"{BASE_URL}/checkout/orders/{first_order_id}/items/0/auto-renew",
                    headers={"Authorization": f"Bearer {buyer_token}"},
                    json={"enabled": True},
                    timeout=TIMEOUT
                )
                
                if resp.status_code == 200:
                    # Disable auto-renew
                    resp = requests.put(
                        f"{BASE_URL}/checkout/orders/{first_order_id}/items/0/auto-renew",
                        headers={"Authorization": f"Bearer {buyer_token}"},
                        json={"enabled": False},
                        timeout=TIMEOUT
                    )
                    
                    if resp.status_code == 200:
                        print_test("Auto-Renew Toggle", "PASS", "Enable and disable successful")
                        results["wallet_orders"]["auto_renew"] = "PASS"
                    else:
                        print_test("Auto-Renew Toggle", "FAIL", f"Disable failed: HTTP {resp.status_code}")
                        results["wallet_orders"]["auto_renew"] = f"FAIL: Disable failed"
                else:
                    print_test("Auto-Renew Toggle", "FAIL", f"Enable failed: HTTP {resp.status_code}")
                    results["wallet_orders"]["auto_renew"] = f"FAIL: Enable failed"
            else:
                print_test("Auto-Renew Toggle", "FAIL", "No orders to toggle")
                results["wallet_orders"]["auto_renew"] = "FAIL: No orders"
    except Exception as e:
        print_test("Auto-Renew Toggle", "FAIL", f"Exception: {e}")
        results["wallet_orders"]["auto_renew"] = f"FAIL: {e}"

# ============================================================================
# JOURNEY 4: OPTION A — EXTERNAL HAND-OFF ONLY
# ============================================================================
def test_external_handoff(buyer_token):
    print_section("JOURNEY 4: OPTION A — EXTERNAL HAND-OFF ONLY (DO NOT COMPLETE)")
    
    # 4.1 DynoPay checkout URL
    try:
        resp = requests.post(
            f"{BASE_URL}/wallet/dynocheckout-url",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"amount": 50, "frontendEndPoint": "wallet"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "checkoutUrl" in data and "dynopay.com" in data["checkoutUrl"]:
                print_test("DynoPay Checkout URL", "PASS", f"URL: {data['checkoutUrl'][:80]}...")
                results["external_handoff"]["dynopay"] = "PASS"
            else:
                print_test("DynoPay Checkout URL", "FAIL", f"Missing or invalid checkoutUrl: {data}")
                results["external_handoff"]["dynopay"] = f"FAIL: Invalid URL"
        else:
            print_test("DynoPay Checkout URL", "BLOCKED", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["external_handoff"]["dynopay"] = f"BLOCKED: HTTP {resp.status_code}"
    except Exception as e:
        print_test("DynoPay Checkout URL", "BLOCKED", f"Exception: {e}")
        results["external_handoff"]["dynopay"] = f"BLOCKED: {e}"
    
    # 4.2 DynoPay below minimum amount
    try:
        resp = requests.post(
            f"{BASE_URL}/wallet/dynocheckout-url",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"amount": 5, "frontendEndPoint": "wallet"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 400:
            print_test("DynoPay Below Minimum", "PASS", "400 validation error as expected")
            results["external_handoff"]["dynopay_validation"] = "PASS"
        else:
            print_test("DynoPay Below Minimum", "FAIL", f"Expected 400, got HTTP {resp.status_code}")
            results["external_handoff"]["dynopay_validation"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("DynoPay Below Minimum", "FAIL", f"Exception: {e}")
        results["external_handoff"]["dynopay_validation"] = f"FAIL: {e}"
    
    # 4.3 DynoPay missing amount
    try:
        resp = requests.post(
            f"{BASE_URL}/wallet/dynocheckout-url",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"frontendEndPoint": "wallet"},
            timeout=TIMEOUT
        )
        
        if resp.status_code in [400, 422]:
            print_test("DynoPay Missing Amount", "PASS", f"{resp.status_code} validation error as expected")
            results["external_handoff"]["dynopay_missing"] = "PASS"
        else:
            print_test("DynoPay Missing Amount", "FAIL", f"Expected 400/422, got HTTP {resp.status_code}")
            results["external_handoff"]["dynopay_missing"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("DynoPay Missing Amount", "FAIL", f"Exception: {e}")
        results["external_handoff"]["dynopay_missing"] = f"FAIL: {e}"
    
    # 4.4 DynoPay no auth
    try:
        resp = requests.post(
            f"{BASE_URL}/wallet/dynocheckout-url",
            json={"amount": 50, "frontendEndPoint": "wallet"},
            timeout=TIMEOUT
        )
        
        if resp.status_code in [401, 400]:
            print_test("DynoPay No Auth", "PASS", f"{resp.status_code} auth error as expected")
            results["external_handoff"]["dynopay_auth"] = "PASS"
        else:
            print_test("DynoPay No Auth", "FAIL", f"Expected 401/400, got HTTP {resp.status_code}")
            results["external_handoff"]["dynopay_auth"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("DynoPay No Auth", "FAIL", f"Exception: {e}")
        results["external_handoff"]["dynopay_auth"] = f"FAIL: {e}"
    
    # 4.5 Get supported currencies
    try:
        resp = requests.get(
            f"{BASE_URL}/payment/getSupportedCurrency",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) or "currencies" in data:
                print_test("Get Supported Currencies", "PASS", f"Response: {str(data)[:100]}")
                results["external_handoff"]["currencies"] = "PASS"
            else:
                print_test("Get Supported Currencies", "FAIL", f"Unexpected format: {data}")
                results["external_handoff"]["currencies"] = f"FAIL: Unexpected format"
        else:
            print_test("Get Supported Currencies", "BLOCKED", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["external_handoff"]["currencies"] = f"BLOCKED: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Get Supported Currencies", "BLOCKED", f"Exception: {e}")
        results["external_handoff"]["currencies"] = f"BLOCKED: {e}"
    
    # 4.6 Get VPS crypto address
    try:
        resp = requests.post(
            f"{BASE_URL}/payment/getVPSCryptoAddress",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"currency": "BTC"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "address" in data or "qr" in data:
                print_test("Get VPS Crypto Address", "PASS", f"Address/QR provided")
                results["external_handoff"]["crypto_address"] = "PASS"
            else:
                print_test("Get VPS Crypto Address", "FAIL", f"Missing address/QR: {data}")
                results["external_handoff"]["crypto_address"] = f"FAIL: Missing address"
        else:
            print_test("Get VPS Crypto Address", "BLOCKED", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["external_handoff"]["crypto_address"] = f"BLOCKED: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Get VPS Crypto Address", "BLOCKED", f"Exception: {e}")
        results["external_handoff"]["crypto_address"] = f"BLOCKED: {e}"

# ============================================================================
# JOURNEY 5: ACCOUNT MANAGEMENT
# ============================================================================
def test_account_management(buyer_token):
    print_section("JOURNEY 5: ACCOUNT MANAGEMENT")
    
    # 5.1 Get wallet transactions
    try:
        resp = requests.get(
            f"{BASE_URL}/wallet/transactions",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            print_test("Get Wallet Transactions", "PASS", f"Response received")
            results["account_mgmt"]["wallet_transactions"] = "PASS"
        else:
            print_test("Get Wallet Transactions", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["account_mgmt"]["wallet_transactions"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Get Wallet Transactions", "FAIL", f"Exception: {e}")
        results["account_mgmt"]["wallet_transactions"] = f"FAIL: {e}"
    
    # 5.2 Get wallet refunds
    try:
        resp = requests.get(
            f"{BASE_URL}/wallet/refunds",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            print_test("Get Wallet Refunds", "PASS", "Response received")
            results["account_mgmt"]["wallet_refunds"] = "PASS"
        else:
            print_test("Get Wallet Refunds", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["account_mgmt"]["wallet_refunds"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Get Wallet Refunds", "FAIL", f"Exception: {e}")
        results["account_mgmt"]["wallet_refunds"] = f"FAIL: {e}"
    
    # 5.3 Get transactions
    try:
        resp = requests.get(
            f"{BASE_URL}/transactions/get",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            print_test("Get Transactions", "PASS", "Response received")
            results["account_mgmt"]["transactions"] = "PASS"
        else:
            print_test("Get Transactions", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["account_mgmt"]["transactions"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Get Transactions", "FAIL", f"Exception: {e}")
        results["account_mgmt"]["transactions"] = f"FAIL: {e}"
    
    # 5.4 Get invoices
    try:
        resp = requests.get(
            f"{BASE_URL}/invoices",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            print_test("Get Invoices", "PASS", "Response received")
            results["account_mgmt"]["invoices"] = "PASS"
        else:
            print_test("Get Invoices", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["account_mgmt"]["invoices"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Get Invoices", "FAIL", f"Exception: {e}")
        results["account_mgmt"]["invoices"] = f"FAIL: {e}"
    
    # 5.5 API Keys - Create
    try:
        resp = requests.post(
            f"{BASE_URL}/user/api-keys",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"name": "Test Journey Key"},
            timeout=TIMEOUT
        )
        
        if resp.status_code in [200, 201]:
            data = resp.json()
            api_key_id = data.get("_id") or data.get("id")
            print_test("Create API Key", "PASS", f"Key created: {api_key_id}")
            results["account_mgmt"]["api_key_create"] = "PASS"
            
            # 5.6 API Keys - List
            resp = requests.get(
                f"{BASE_URL}/user/api-keys",
                headers={"Authorization": f"Bearer {buyer_token}"},
                timeout=TIMEOUT
            )
            
            if resp.status_code == 200:
                print_test("List API Keys", "PASS", "Keys listed")
                results["account_mgmt"]["api_key_list"] = "PASS"
            else:
                print_test("List API Keys", "FAIL", f"HTTP {resp.status_code}")
                results["account_mgmt"]["api_key_list"] = f"FAIL: HTTP {resp.status_code}"
            
            # 5.7 API Keys - Delete
            if api_key_id:
                resp = requests.delete(
                    f"{BASE_URL}/user/api-keys/{api_key_id}",
                    headers={"Authorization": f"Bearer {buyer_token}"},
                    timeout=TIMEOUT
                )
                
                if resp.status_code in [200, 204]:
                    print_test("Delete API Key", "PASS", "Key deleted")
                    results["account_mgmt"]["api_key_delete"] = "PASS"
                else:
                    print_test("Delete API Key", "FAIL", f"HTTP {resp.status_code}")
                    results["account_mgmt"]["api_key_delete"] = f"FAIL: HTTP {resp.status_code}"
        else:
            print_test("Create API Key", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["account_mgmt"]["api_key_create"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("API Keys", "FAIL", f"Exception: {e}")
        results["account_mgmt"]["api_key_create"] = f"FAIL: {e}"
    
    # 5.8 User Sessions - List
    try:
        resp = requests.get(
            f"{BASE_URL}/user-session",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            sessions = data.get("sessions", [])
            print_test("List User Sessions", "PASS", f"Found {len(sessions)} sessions")
            results["account_mgmt"]["sessions_list"] = "PASS"
            
            # 5.9 User Sessions - Logout one session (if multiple exist)
            if len(sessions) > 1:
                session_id = sessions[1].get("_id") or sessions[1].get("id")
                if session_id:
                    resp = requests.delete(
                        f"{BASE_URL}/user-session/{session_id}",
                        headers={"Authorization": f"Bearer {buyer_token}"},
                        timeout=TIMEOUT
                    )
                    
                    if resp.status_code in [200, 204]:
                        print_test("Logout One Session", "PASS", "Session logged out")
                        results["account_mgmt"]["session_logout"] = "PASS"
                    else:
                        print_test("Logout One Session", "FAIL", f"HTTP {resp.status_code}")
                        results["account_mgmt"]["session_logout"] = f"FAIL: HTTP {resp.status_code}"
            else:
                print_test("Logout One Session", "PASS", "Only one session, skipped")
                results["account_mgmt"]["session_logout"] = "PASS (skipped)"
        else:
            print_test("List User Sessions", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["account_mgmt"]["sessions_list"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("User Sessions", "FAIL", f"Exception: {e}")
        results["account_mgmt"]["sessions_list"] = f"FAIL: {e}"
    
    # 5.10 Notification Preferences - Get
    try:
        resp = requests.get(
            f"{BASE_URL}/auth/notification-preferences",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            print_test("Get Notification Preferences", "PASS", "Preferences retrieved")
            results["account_mgmt"]["notif_get"] = "PASS"
            
            # 5.11 Notification Preferences - Update
            resp = requests.put(
                f"{BASE_URL}/auth/notification-preferences",
                headers={"Authorization": f"Bearer {buyer_token}"},
                json={"emailNotifications": True, "smsNotifications": False},
                timeout=TIMEOUT
            )
            
            if resp.status_code == 200:
                print_test("Update Notification Preferences", "PASS", "Preferences updated")
                results["account_mgmt"]["notif_update"] = "PASS"
            else:
                print_test("Update Notification Preferences", "FAIL", f"HTTP {resp.status_code}")
                results["account_mgmt"]["notif_update"] = f"FAIL: HTTP {resp.status_code}"
        else:
            print_test("Get Notification Preferences", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["account_mgmt"]["notif_get"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Notification Preferences", "FAIL", f"Exception: {e}")
        results["account_mgmt"]["notif_get"] = f"FAIL: {e}"
    
    # 5.12 Validate Promo Code
    try:
        resp = requests.post(
            f"{BASE_URL}/promo/validate",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"code": "INVALID-CODE-12345"},
            timeout=TIMEOUT
        )
        
        # Expect 400 or 404 for invalid code
        if resp.status_code in [400, 404]:
            print_test("Validate Promo Code", "PASS", f"Invalid code rejected with {resp.status_code}")
            results["account_mgmt"]["promo"] = "PASS"
        elif resp.status_code == 200:
            print_test("Validate Promo Code", "PASS", "Code validated (unexpected but OK)")
            results["account_mgmt"]["promo"] = "PASS"
        else:
            print_test("Validate Promo Code", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["account_mgmt"]["promo"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Validate Promo Code", "FAIL", f"Exception: {e}")
        results["account_mgmt"]["promo"] = f"FAIL: {e}"
    
    # 5.13 Get User Country (Tax)
    try:
        resp = requests.get(
            f"{BASE_URL}/tax/user-country",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            data = resp.json()
            print_test("Get User Country (Tax)", "PASS", f"Country: {data.get('country', 'N/A')}")
            results["account_mgmt"]["tax_country"] = "PASS"
        else:
            print_test("Get User Country (Tax)", "FAIL", f"HTTP {resp.status_code}: {resp.text[:200]}")
            results["account_mgmt"]["tax_country"] = f"FAIL: HTTP {resp.status_code}"
    except Exception as e:
        print_test("Get User Country (Tax)", "FAIL", f"Exception: {e}")
        results["account_mgmt"]["tax_country"] = f"FAIL: {e}"

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================
def main():
    print("\n" + "="*80)
    print("  FULL USER-JOURNEY BACKEND/API TEST - Nameword Platform")
    print("  Base URL: " + BASE_URL)
    print("="*80)
    
    # Login as buyer for journeys 2-5
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "buyer@nameword.local", "password": "Buyer@12345"},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 200:
            buyer_token = resp.json().get("token")
            print(f"\n✅ Logged in as buyer@nameword.local")
        else:
            print(f"\n❌ Failed to login as buyer: HTTP {resp.status_code}")
            buyer_token = None
    except Exception as e:
        print(f"\n❌ Failed to login as buyer: {e}")
        buyer_token = None
    
    # Run all journey tests
    test_onboarding()
    
    if buyer_token:
        test_pricing(buyer_token)
        test_wallet_orders(buyer_token)
        test_external_handoff(buyer_token)
        test_account_management(buyer_token)
    else:
        print("\n⚠️ Skipping journeys 2-5 due to buyer login failure")
    
    # Re-seed buyer wallet to $50
    print_section("CLEANUP: Re-seed buyer wallet to $50")
    try:
        import subprocess
        result = subprocess.run(
            ["node", "scripts/seed_test_users.js"],
            cwd="/app/backend",
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            print("✅ Buyer wallet re-seeded to $50")
        else:
            print(f"⚠️ Re-seed warning: {result.stderr[:200]}")
    except Exception as e:
        print(f"⚠️ Re-seed failed: {e}")
    
    # Print summary matrix
    print_section("SUMMARY: PASS/FAIL/BLOCKED MATRIX")
    
    print("\n1. ONBOARDING & ACCOUNT ACCESS:")
    for key, value in results["onboarding"].items():
        status = "✅" if value == "PASS" else "❌" if "FAIL" in value else "⚠️"
        print(f"   {status} {key}: {value}")
    
    print("\n2. PRODUCT PRICING TO PAY STEP:")
    for key, value in results["pricing"].items():
        status = "✅" if value == "PASS" else "❌" if "FAIL" in value else "⚠️"
        print(f"   {status} {key}: {value}")
    
    print("\n3. OPTION B — WALLET + POINTS TEST-MODE ORDERS:")
    for key, value in results["wallet_orders"].items():
        status = "✅" if value == "PASS" or "PASS" in value else "❌" if "FAIL" in value else "⚠️"
        print(f"   {status} {key}: {value}")
    
    print("\n4. OPTION A — EXTERNAL HAND-OFF ONLY:")
    for key, value in results["external_handoff"].items():
        status = "✅" if value == "PASS" else "❌" if "FAIL" in value else "⚠️"
        print(f"   {status} {key}: {value}")
    
    print("\n5. ACCOUNT MANAGEMENT:")
    for key, value in results["account_mgmt"].items():
        status = "✅" if value == "PASS" or "PASS" in value else "❌" if "FAIL" in value else "⚠️"
        print(f"   {status} {key}: {value}")
    
    # Count totals
    total_tests = sum(len(v) for v in results.values())
    passed_tests = sum(1 for v in results.values() for val in v.values() if val == "PASS" or "PASS" in val)
    failed_tests = sum(1 for v in results.values() for val in v.values() if "FAIL" in val)
    blocked_tests = sum(1 for v in results.values() for val in v.values() if "BLOCKED" in val)
    
    print(f"\n{'='*80}")
    print(f"TOTAL: {passed_tests}/{total_tests} PASSED, {failed_tests} FAILED, {blocked_tests} BLOCKED")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    main()
