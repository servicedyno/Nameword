# Onboarding + Email Redesign — Handoff (read this first)

Status date: 2026-09 session. Task: reimagine onboarding + make ALL email templates modern/on-brand.

## Locked product decisions (from user)
1. **Soft gate** — sign-up logs the user in immediately (frictionless) AND drops them on a polished "Confirm your email" screen, with a persistent "Verify email" reminder until done. Skippable.
2. **Redesign ALL ~32 templates** on one shared branded layout.
3. **Add a Welcome email** after verification.
4. **Logo** = current indigo Keyhole-N brand, served from APP_URL.

## ✅ DONE this session — BACKEND email system (Phase 1)
- **Root causes found:** every auth email hardcoded a DEAD host `https://namewordfrontend-production.up.railway.app/...` (HTTP 404) → missing logo/icons/bg; the passed `logoUrl` var was ignored; off-brand purple palette; and the confirm-OTP step was never routed to (signup auto-logs-in).
- **Brand assets installed** to `/app/backend/public/`: `email-logo.png` (indigo lockup), `email-mark.png`, refreshed `logo.png`. All served at `${APP_URL}/...` (verified 200). Old railway URLs eliminated.
- **Nunjucks globals** added in `/app/backend/app.js` (after `nunjucks.configure`): `appUrl, frontendUrl, logoUrl, markUrl, brandName, brandTagline, supportEmail, year, social{x,facebook,instagram,linkedin}` — so no render call site needs editing.
- **Shared layout** `/app/backend/views/mails/layout.html` (light card, indigo accent #4f46e5, slate text, preheader, mobile responsive, real footer + social) and **components** `/app/backend/views/mails/_components.html` (macros: `button(href,label,variant)`, `otp(code,label)`, `details(rows,variant)`, `note(text,variant)`).
- **ALL 32 templates rewritten** to `{% extends "mails/layout.html" %}` + `{% import "mails/_components.html" as ui %}`, preserving each template's exact variables (see inventory below). **NEW** `welcome.html` added. Verified: **all 33 render with 0 errors** via a render-test script (sample-data render of every template).
- **Welcome email wired** in `/app/backend/app/controllers/auth/VerificationController.js` → sends `mails/welcome.html` on FIRST email verification only (guarded by `wasVerified`; best-effort). Context: `{name, points, rewardValue, ctaLink=FRONTEND_URL/dashboard}`.

## ⛔ PENDING — FRONTEND onboarding flow (Phase 2, NOT started)
Files to touch (all in /app/frontend/src):
- `pages/auth/CreateAccount.jsx` `handleSubmit`: currently `if (data?.token) navigate('/dashboard')`. Change to route to `/otp-code` (keep the token/session — user stays logged in). `email` is already in localStorage; `otpExpireAt` is set by register response.
- `pages/auth/OtpCode.jsx`: add a **"Skip for now"** action → navigate to `/dashboard` (soft gate). Page already handles verify + resend + timer; light polish optional.
- **NEW persistent reminder**: a `VerifyEmailBanner` shown app-wide when `user && !user.isProfileVerified` (auth user object has `isProfileVerified`). Put it in the authed layout (`layouts/FrontLayout.jsx` or the admin layout). Include "Enter code" (→ /otp-code) + "Resend". Persist-dismiss is optional but keep showing until verified.
- `pages/checkout/AccountGate.jsx` is a SECOND signup entry (checkout). Decide whether to also nudge verify there (recommend: same banner covers it since it's app-wide).
- Note: the auth `verifyEmailCode` response returns the fresh user; call `updateUser(data.data)` (already done in OtpCode) so `isProfileVerified` flips and the banner disappears.

## ⚠️ DELIVERY BLOCKER (must resolve for emails to actually arrive)
- Brevo **sender is a placeholder**: `MAIL_FROM_ADDRESS` / `BREVO_EMAIL = hello@nameword.local` (not a real, Brevo-verified domain). The BREVO_API_KEY is real, but Brevo will reject sends from an unverified sender. **A real send was NOT tested this session.** Next agent (or user) must set a verified Brevo sender/domain in `/app/backend/.env` (`MAIL_FROM_ADDRESS`, `BREVO_EMAIL`, `MAIL_FROM_NAME`) and confirm a live send returns 2xx. Templates themselves are done.
- Soft-gate side effect: users who SKIP verification won't receive the welcome email (it fires on verification). If undesired, also send `welcome.html` at signup in `RegisterController.register`.

## Template variable inventory (preserve these exactly if editing)
- name/otp (lowercase): verification_code, email_verification_resend, login_verification_code, welcome(name,points,rewardValue,ctaLink)
- NAME/OTP_CODE: email_change_verification
- NAME + link: password_reset(resetLink), account_locked(unlockAccountLink), account_reactivation(reactivateLink), reactivate_account(url), account_deletion_confirmation(none)
- new_device_login_alert: NAME, DEVICE, LOCATION, DATE, TIME, secureAccountLink
- domain_purchase: NAME, DOMAIN_NAME, DATE, EXPIRY_DATE, AUTO_RENEW_STATUS, manageDomainLink, setupDnsLink
- domain_setup: NAME, DOMAIN_NAME, setupGuideLink, setupLink
- domain_expiring_soon: NAME, DOMAIN_NAME, DAYS, EXPIRY_DATE, renewDomainLink
- domain_expired: NAME, DOMAIN_NAME, EXPIRY_DATE, GRACE_DAYS, renewDomainLink
- domain_unlock_confirmation: NAME, DOMAIN_NAME, AUTH_CODE
- whois_privacy_enabled: NAME, DOMAIN_NAME, managePrivacyLink
- whois_privacy_disabled: NAME, DOMAIN_NAME, reEnablePrivacyLink
- dns_record_created: NAME, DOMAIN_NAME, RECORD_TYPE, RECORD_NAME, RECORD_VALUE, TTL, dnsSettingsLink
- dns_record_updated: NAME, DOMAIN_NAME, RECORD_TYPE, RECORD_NAME, OLD_VALUE, NEW_VALUE, dnsSettingsLink
- dns_record_deleted: NAME, DOMAIN_NAME, RECORD_TYPE, RECORD_NAME, RECORD_VALUE, dnsSettingsLink
- dns_changes_summary: NAME, DOMAIN_NAME, CHANGES[{ACTION,RECORD_TYPE,RECORD_NAME}], dnsConfigLink, dnsCheckerLink
- hosting_purchase: NAME, PLAN_NAME, IP_ADDRESS, SERVER_LOCATION, STORAGE, BANDWIDTH, controlPanelLink, setupGuideLink
- hosting_expiring_soon: NAME, PLAN_NAME, DAYS, EXPIRY_DATE, GRACE_DAYS, renewHostingLink
- hosting_grace_period_warning: NAME, PLAN_NAME, EXPIRY_DATE, GRACE_DAYS, renewHostingLink
- hosting_pending_deletion_warning: NAME, PLAN_NAME, DAYS, DELETION_DATE, renewHostingLink
- hosting_suspended: NAME, PLAN_NAME, DELETION_DAYS, renewHostingLink
- hosting_deleted: NAME, PLAN_NAME, viewHostingPlansLink
- credit_added_to_account: NAME, AMOUNT, CURRENCY, NEW_BALANCE, viewAccountLink
- invoice_generated: NAME, INVOICE_NUMBER, AMOUNT, CURRENCY, DUE_DATE, payNowLink, viewInvoiceLink
- payment_successful: NAME, AMOUNT, CURRENCY, DATE, INVOICE_NUMBER, viewReceiptLink
- renewal_success: NAME, PRODUCT_NAME, AMOUNT, CURRENCY, NEW_EXPIRY_DATE, invoiceLink
- subscription_renewal_reminder: NAME, PRODUCT_NAME, AMOUNT, CURRENCY, RENEWAL_DATE, PAYMENT_METHOD, manageSubscriptionLink, updatePaymentLink

## How to re-verify templates render (no send needed)
Run the render-test node snippet (renders every mails/*.html with sample data). Kept in chat history; recreate if needed. `sudo supervisorctl restart backend` after editing app.js.

## Also still pending from EARLIER task (reward program)
- Reward-program FRONTEND (ReferralCard on Wallet page, ?ref capture, reward-history reason labels) was BUILT but NOT auto-tested (user hadn't chosen). Backend reward program: fully tested 100%.
