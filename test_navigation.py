#!/usr/bin/env python3
"""
Test script for Nameword signed-in navigation and empty states
"""

import asyncio
from playwright.async_api import async_playwright

async def test_navigation():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1920, "height": 1080})
        
        print("=" * 80)
        print("NAMEWORD SIGNED-IN NAVIGATION AND EMPTY STATES TEST")
        print("=" * 80)
        
        # PART A - Login as buyer
        print("\nPART A - SIDEBAR / NAV BEHAVIOR (buyer account)")
        print("=" * 80)
        
        try:
            print("\n[A.0] Navigating to sign-in page...")
            await page.goto("http://localhost:3000/sign-in", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            print("SUCCESS: Sign-in page loaded")
            
            print("\n[A.1] Logging in as buyer@nameword.local...")
            await page.fill('input[type="email"]', "buyer@nameword.local")
            await page.fill('input[type="password"]', "Buyer@12345")
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(3000)
            print(f"SUCCESS: Logged in, URL: {page.url}")
            
            await page.screenshot(path=".screenshots/a1_dashboard.png", quality=40, full_page=False)
            
        except Exception as e:
            print(f"FAIL: Login error: {e}")
        
        # Test icon rail
        rail_items = [
            ("overview", "/dashboard", "Dashboard"),
            ("domains", "/domains", "Find your domain"),
            ("dns", "/dns-manager", "Point your domain"),
            ("hosting", "/hosting", "Anti-Red hosting"),
            ("vps", "/vps", "Offshore VPS"),
            ("rdp", "/rdp", "Private RDP"),
            ("wallet", "/wallet", "Wallet"),
            ("rewards", "/wallet", "Wallet"),
            ("settings", "/account-setting", "Account"),
        ]
        
        print("\nTESTING ICON RAIL NAVIGATION")
        print("=" * 80)
        
        for idx, (key, url, heading) in enumerate(rail_items):
            try:
                print(f"\n[A.{idx + 2}] Testing {key} icon...")
                testid = f"rail-{key}"
                await page.click(f'[data-testid="{testid}"]')
                await page.wait_for_timeout(2000)
                
                current_url = page.url
                print(f"  URL: {current_url}")
                
                if url in current_url or (key == "rewards" and "#rewards" in current_url):
                    print("  SUCCESS: URL correct")
                else:
                    print(f"  WARNING: URL mismatch")
                
                # Check rail visibility
                rail_visible = await page.query_selector('[data-testid="rail-overview"]')
                print(f"  Icon rail visible: {'SUCCESS' if rail_visible else 'FAIL'}")
                
                # Check heading
                h1 = await page.query_selector('h1')
                if h1:
                    h1_text = await h1.inner_text()
                    print(f"  Heading: {h1_text}")
                
                await page.screenshot(path=f".screenshots/a{idx + 2}_{key}.png", quality=40, full_page=False)
                
            except Exception as e:
                print(f"FAIL: Error testing {key}: {e}")
        
        # Test secondary panel
        print("\nTESTING SECONDARY PANEL")
        print("=" * 80)
        
        try:
            await page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            # Check for Domains section
            print("\n[A.11] Testing Domains section...")
            domains_see_all = await page.query_selector('a[href="/domains"]')
            print(f"  Domains See all link: {'SUCCESS' if domains_see_all else 'WARNING'}")
            
            # Check for Websites section
            print("\n[A.12] Testing Websites section...")
            hosting_see_all = await page.query_selector('a[href="/hosting"]')
            print(f"  Websites See all link: {'SUCCESS' if hosting_see_all else 'WARNING'}")
            
            # Check for Servers & DNS
            print("\n[A.13] Testing Servers & DNS area...")
            vps_link = await page.query_selector('a[href="/vps"]')
            rdp_link = await page.query_selector('a[href="/rdp"]')
            dns_link = await page.query_selector('a[href="/dns-manager"]')
            print(f"  VPS link: {'SUCCESS' if vps_link else 'WARNING'}")
            print(f"  RDP link: {'SUCCESS' if rdp_link else 'WARNING'}")
            print(f"  DNS link: {'SUCCESS' if dns_link else 'WARNING'}")
            
            # Check Billing group
            print("\n[A.14] Testing Billing group...")
            billing_toggle = await page.query_selector('button:has-text("Billing")')
            if billing_toggle:
                await billing_toggle.click()
                await page.wait_for_timeout(1000)
                
                wallet_link = await page.query_selector('a[href="/wallet"]')
                orders_link = await page.query_selector('a[href="/orders"]')
                services_link = await page.query_selector('a[href="/services"]')
                subscriptions_link = await page.query_selector('a[href="/subscriptions"]')
                payment_history_link = await page.query_selector('a[href="/payment-history"]')
                rewards_link = await page.query_selector('a[href="/wallet#rewards"]')
                
                print(f"  Wallet: {'SUCCESS' if wallet_link else 'FAIL'}")
                print(f"  Orders: {'SUCCESS' if orders_link else 'FAIL'}")
                print(f"  My services: {'SUCCESS' if services_link else 'FAIL'}")
                print(f"  Subscriptions: {'SUCCESS' if subscriptions_link else 'FAIL'}")
                print(f"  Payment history: {'SUCCESS' if payment_history_link else 'FAIL'}")
                print(f"  Rewards: {'SUCCESS' if rewards_link else 'FAIL'}")
            
            # Test Rewards scroll
            print("\n[A.15] Testing Rewards scroll...")
            rewards_link = await page.query_selector('a[href="/wallet#rewards"]')
            if rewards_link:
                await rewards_link.click()
                await page.wait_for_timeout(2000)
                print(f"  URL: {page.url}")
                print(f"  Contains #rewards: {'SUCCESS' if '#rewards' in page.url else 'WARNING'}")
                
                await page.screenshot(path=".screenshots/a15_rewards.png", quality=40, full_page=False)
            
        except Exception as e:
            print(f"FAIL: Error testing secondary panel: {e}")
        
        # PART B - Empty states with demo user
        print("\n\nPART B - EMPTY STATES (demo account)")
        print("=" * 80)
        
        try:
            # Logout
            print("\n[B.0] Logging out...")
            await page.goto("http://localhost:3000/sign-in", wait_until="networkidle", timeout=30000)
            
            # Login as demo
            print("\n[B.1] Logging in as demo@nameword.local...")
            await page.fill('input[type="email"]', "demo@nameword.local")
            await page.fill('input[type="password"]', "Demo@12345")
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(3000)
            print(f"SUCCESS: Logged in as demo, URL: {page.url}")
            
        except Exception as e:
            print(f"FAIL: Demo login error: {e}")
        
        # Test empty states
        empty_pages = [
            ("/subscriptions", "Subscriptions", "No active subscriptions"),
            ("/vps", "VPS", "Your servers"),
            ("/rdp", "RDP", "Your servers"),
            ("/hosting", "Hosting", "Your hosting"),
            ("/orders", "Orders", "Orders"),
            ("/services", "Services", "services"),
        ]
        
        for idx, (url, name, expected_text) in enumerate(empty_pages):
            try:
                print(f"\n[B.{idx + 2}] Testing {name} empty state...")
                await page.goto(f"http://localhost:3000{url}", wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000)
                
                print(f"  URL: {page.url}")
                
                # Check for empty state
                content = await page.content()
                if expected_text.lower() in content.lower():
                    print(f"  SUCCESS: Empty state message found")
                else:
                    print(f"  WARNING: Empty state message not found")
                
                # Check for CTA buttons
                cta_buttons = await page.query_selector_all('button:has-text("Register"), button:has-text("Browse"), button:has-text("Choose"), a:has-text("Register"), a:has-text("Browse"), a:has-text("Choose")')
                print(f"  CTA buttons: {len(cta_buttons)} found")
                
                await page.screenshot(path=f".screenshots/b{idx + 2}_{name.lower()}.png", quality=40, full_page=False)
                
            except Exception as e:
                print(f"FAIL: Error testing {name}: {e}")
        
        print("\n" + "=" * 80)
        print("TEST COMPLETE")
        print("=" * 80)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_navigation())
