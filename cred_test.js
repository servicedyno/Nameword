/* Live credential tester for NameWord .env. Run: cd /app/backend && node /app/cred_test.js */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: "/app/backend/.env" });
const axios = require("axios");
const https = require("https");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const E = process.env;
const insecure = new https.Agent({ rejectUnauthorized: false });
const results = [];
const rec = (svc, status, detail) => { results.push({ svc, status, detail }); console.log(`[${status}] ${svc} :: ${detail}`); };
const ax = (cfg) => axios({ timeout: 15000, httpsAgent: insecure, validateStatus: () => true, ...cfg });
const short = (d) => { try { return (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 220); } catch { return String(d).slice(0,220); } };

function decodeJwtExp(tok) {
  try { const p = JSON.parse(Buffer.from(tok.split(".")[1], "base64").toString()); 
    if (!p.exp) return "no exp claim"; const d = new Date(p.exp*1000); return `exp ${d.toISOString()} (${d < new Date() ? "EXPIRED" : "valid"})`; }
  catch { return "unparseable"; }
}

(async () => {
  // 1. Brevo
  try { const r = await ax({ url: "https://api.brevo.com/v3/account", headers: { "api-key": E.BREVO_API_KEY, accept: "application/json" } });
    rec("Brevo (email/SMTP key)", r.status===200?"ALIVE":"DEAD", r.status===200?`account ${r.data?.email}, plan ${short(r.data?.plan)}`:`HTTP ${r.status} ${short(r.data)}`);
  } catch(e){ rec("Brevo","ERROR",e.message); }

  // 2. Cloudflare (global key)
  try { const r = await ax({ url: "https://api.cloudflare.com/client/v4/user", headers: { "X-Auth-Email": E.CLOUDFLARE_EMAIL, "X-Auth-Key": E.CLOUDFLARE_API_KEY } });
    rec("Cloudflare (email+global key)", r.data?.success?"ALIVE":"DEAD", r.data?.success?`user ${r.data?.result?.email}`:`HTTP ${r.status} ${short(r.data?.errors||r.data)}`);
  } catch(e){ rec("Cloudflare","ERROR",e.message); }

  // 3. Twilio account
  try { const r = await ax({ url: `https://api.twilio.com/2010-04-01/Accounts/${E.TWILIO_ACCOUNT_SID}.json`, auth: { username: E.TWILIO_ACCOUNT_SID, password: E.TWILIO_AUTH_TOKEN } });
    rec("Twilio (SID+auth token)", r.status===200?"ALIVE":"DEAD", r.status===200?`status ${r.data?.status}, name ${r.data?.friendly_name}`:`HTTP ${r.status} ${short(r.data)}`);
  } catch(e){ rec("Twilio","ERROR",e.message); }
  // 3b. Twilio Verify SID
  try { const r = await ax({ url: `https://verify.twilio.com/v2/Services/${E.TWILIO_VERIFY_SID}`, auth: { username: E.TWILIO_ACCOUNT_SID, password: E.TWILIO_AUTH_TOKEN } });
    rec("Twilio Verify Service SID", r.status===200?"ALIVE":"DEAD", r.status===200?`name ${r.data?.friendly_name}`:`HTTP ${r.status} ${short(r.data)}`);
  } catch(e){ rec("Twilio Verify","ERROR",e.message); }

  // 4. Telnyx
  try { const r = await ax({ url: "https://api.telnyx.com/v2/phone_numbers?page[size]=1", headers: { Authorization: `Bearer ${E.TELNYX_ACCESS_TOKEN}` } });
    rec("Telnyx (access token)", r.status===200?"ALIVE":"DEAD", r.status===200?`phone_numbers listed ok (${r.data?.data?.length} shown)`:`HTTP ${r.status} ${short(r.data?.errors||r.data)}`);
  } catch(e){ rec("Telnyx","ERROR",e.message); }

  // 5. Telegram
  try { const r = await ax({ url: `https://api.telegram.org/bot${E.TELEGRAM_BOT_TOKEN}/getMe` });
    rec("Telegram bot token", r.data?.ok?"ALIVE":"DEAD", r.data?.ok?`@${r.data?.result?.username} (${r.data?.result?.first_name})`:`HTTP ${r.status} ${short(r.data)}`);
  } catch(e){ rec("Telegram","ERROR",e.message); }

  // 6. OpenProvider login
  try { const r = await ax({ method:"post", url: "https://api.openprovider.eu/v1beta/auth/login", headers:{'Content-Type':'application/json'}, data: { username: E.OPENPROVIDER_USERNAME, password: E.OPENPROVIDER_PASSWORD } });
    const ok = r.status===200 && r.data?.data?.token;
    rec("OpenProvider (user/pass)", ok?"ALIVE":"DEAD", ok?`login ok, token len ${r.data.data.token.length}`:`HTTP ${r.status} ${short(r.data?.desc||r.data)}`);
  } catch(e){ rec("OpenProvider","ERROR",e.message); }

  // 7. HostBay
  for (const path of ["domains?limit=1","account","user","me","account/balance"]) {
    try { const r = await ax({ url: `https://api.hostbay.io/api/v1/${path}`, headers: { Authorization: `Bearer ${E.HOSTBAY_API_KEY}` } });
      rec(`HostBay GET /${path}`, r.status===200?"ALIVE":(r.status===401||r.status===403?"DEAD":"INFO"), `HTTP ${r.status} ${short(r.data)}`);
      if (r.status===200) break;
    } catch(e){ rec(`HostBay /${path}`,"ERROR",e.message); }
  }

  // 8. ConnectReseller ViewDomain
  try { const r = await ax({ url: "https://api.connectreseller.com/ConnectReseller/ESHOP/ViewDomain", params: { APIKey: E.CONNECTSELLER_API_KEY, websiteName: "google.com" } });
    const txt = short(r.data); const bad = /invalid|not authorized|api key|unauthor/i.test(txt);
    rec("ConnectReseller (APIKey)", (r.status===200 && !bad)?"ALIVE":(bad?"DEAD":"INFO"), `HTTP ${r.status} ${txt}`);
  } catch(e){ rec("ConnectReseller","ERROR",e.message); }

  // 9. FastForex
  try { const r = await ax({ url: "https://api.fastforex.io/fetch-one", params: { from:"USD", to:"EUR", api_key: E.FAST_FOREX_KEY } });
    rec("FastForex (FAST_FOREX_KEY)", r.status===200 && r.data?.result?"ALIVE":"DEAD", r.status===200?`USD->EUR ${short(r.data?.result)}`:`HTTP ${r.status} ${short(r.data)}`);
  } catch(e){ rec("FastForex","ERROR",e.message); }

  // 10. APILayer tax
  try { const r = await ax({ url: "https://api.apilayer.com/tax_data/tax_rates", params: { country: "DE" }, headers: { apikey: E.APILAYER_TAX_API_KEY } });
    rec("APILayer Tax (APILAYER_TAX_API_KEY)", r.status===200?"ALIVE":"DEAD", `HTTP ${r.status} ${short(r.data)}`);
  } catch(e){ rec("APILayer Tax","ERROR",e.message); }

  // 11. DynoPay - decode tokens + create payment link (validates JWT + api key; no charge)
  rec("DynoPay JWT token", "INFO", decodeJwtExp(E.DYNO_PAY_JWT_TOKEN));
  rec("DynoPay wallet token", "INFO", decodeJwtExp(E.DYNO_PAY_WALLET_TOKEN));
  try { const url = `${E.DYNO_PAY_BASE_URL.replace(/\/$/,"")}/api/pay/createPaymentLink`;
    const r = await ax({ method:"post", url, headers: { "Content-Type":"application/json", Accept:"application/json", Authorization:`Bearer ${E.DYNO_PAY_JWT_TOKEN}`, "x-api-key": E.DYNO_PAY_API_KEY },
      data: { amount: 1, company_id: Number(E.DYNO_PAY_COMPANY_ID), customer_name:"Test", customer_email:"test@example.com", description:"cred-test", currency:"USD", modes:["CRYPTO"], apply_tax:false } });
    const ok = r.status>=200 && r.status<300; const authErr = r.status===401||r.status===403||/expired|invalid|unauthor/i.test(short(r.data));
    rec("DynoPay createPaymentLink (JWT+api key)", ok?"ALIVE":(authErr?"DEAD":"INFO"), `HTTP ${r.status} ${short(r.data)}`);
  } catch(e){ rec("DynoPay createPaymentLink","ERROR",e.message); }

  // 12. WHM
  try { const r = await ax({ url: `${E.WHM_SERVER_URL.replace(/\/$/,"")}/json-api/version?api.version=1`, headers: { Authorization: `whm ${E.WHM_USERNAME}:${E.WHM_API_KEY}` } });
    const ok = r.status===200 && !/access denied|permission|invalid/i.test(short(r.data));
    rec("WHM (root:API token)", ok?"ALIVE":(r.status===401||r.status===403?"DEAD":"INFO"), `HTTP ${r.status} ${short(r.data)}`);
  } catch(e){ rec("WHM","ERROR/UNREACHABLE",e.message); }

  // 13. Plesk XML-RPC agent
  try { const body = `<?xml version="1.0"?><packet><server><get><stat/></get></server></packet>`;
    const r = await ax({ method:"post", url: E.PLESK_SERVER_URL, headers: { "Content-Type":"text/xml", "HTTP_AUTH_LOGIN": E.PLESK_LOGIN, "HTTP_AUTH_PASSWD": E.PLESK_PASSWORD }, data: body });
    const txt = short(r.data); const authErr = /authentication|permission|invalid|denied|1001|1002/i.test(txt);
    rec("Plesk (root/password)", (r.status===200 && !authErr)?"ALIVE":(authErr?"DEAD":"INFO"), `HTTP ${r.status} ${txt}`);
  } catch(e){ rec("Plesk","ERROR/UNREACHABLE",e.message); }

  // 14. Google OAuth client (validate client_id + secret via token endpoint with dummy code)
  try { const r = await ax({ method:"post", url:"https://oauth2.googleapis.com/token", headers:{'Content-Type':'application/x-www-form-urlencoded'},
      data: new URLSearchParams({ code:"invalid_test_code", client_id:E.GOOGLE_CLIENT_ID, client_secret:E.GOOGLE_CLIENT_SECRET, redirect_uri:E.GOOGLE_REDIRECT_URL, grant_type:"authorization_code" }).toString() });
    const err = r.data?.error;
    // invalid_grant => client is VALID (code was bad). invalid_client/unauthorized_client => bad creds.
    const alive = err==="invalid_grant"; const dead = /invalid_client|unauthorized_client/.test(err||"");
    rec("Google OAuth (client id+secret)", alive?"ALIVE":(dead?"DEAD":"INFO"), `error=${err} ${short(r.data?.error_description)}`);
  } catch(e){ rec("Google OAuth","ERROR",e.message); }

  // 15. Google service-account.json (RS256 JWT -> token exchange)
  try { const sa = require("/app/backend/config/service-account.json");
    const now = Math.floor(Date.now()/1000);
    const assertion = jwt.sign({ iss: sa.client_email, scope:"https://www.googleapis.com/auth/cloud-platform", aud:"https://oauth2.googleapis.com/token", iat:now, exp:now+3600 }, sa.private_key, { algorithm:"RS256" });
    const r = await ax({ method:"post", url:"https://oauth2.googleapis.com/token", headers:{'Content-Type':'application/x-www-form-urlencoded'},
      data: new URLSearchParams({ grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString() });
    const alive = !!r.data?.access_token;
    rec("Google Service Account (service-account.json)", alive?"ALIVE":"DEAD", alive?`got access_token (project ${sa.project_id})`:`HTTP ${r.status} error=${r.data?.error} ${short(r.data?.error_description)}`);
  } catch(e){ rec("Google Service Account","ERROR",e.message); }

  // 16. Sentry DSN (send one test event)
  try { const m = E.SENTRY_DSN.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/); 
    if (!m) { rec("Sentry DSN","DEAD","DSN unparseable"); }
    else { const [_,pub,host,pid]=m; const url=`https://${host}/api/${pid}/store/`;
      const r = await ax({ method:"post", url, headers:{ "Content-Type":"application/json", "X-Sentry-Auth":`Sentry sentry_version=7, sentry_key=${pub}, sentry_client=cred-test/1.0` }, data:{ message:"nameword cred-test ping", level:"info" } });
      rec("Sentry DSN", r.status===200||r.status===201?"ALIVE":"DEAD", `HTTP ${r.status} ${short(r.data)}`);
    }
  } catch(e){ rec("Sentry DSN","ERROR",e.message); }

  // 17. Zapier webhook (triggers the zap)
  try { const r = await ax({ method:"post", url: E.ZAPIER_WEBHOOK_URL, headers:{'Content-Type':'application/json'}, data:{ source:"nameword-cred-test", ts:new Date().toISOString() } });
    rec("Zapier webhook", (r.status>=200&&r.status<300 && /success/i.test(short(r.data)))?"ALIVE":"INFO", `HTTP ${r.status} ${short(r.data)}`);
  } catch(e){ rec("Zapier webhook","ERROR",e.message); }

  console.log("\n\n================ SUMMARY ================");
  for (const r of results) console.log(`${r.status.padEnd(16)} | ${r.svc}`);
})();
