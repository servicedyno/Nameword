const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");
const cookieSession = require("cookie-session");
const createError = require("http-errors");
const nunjucks = require("nunjucks");
const errorHandler = require("./app/middlewares/error-handler");
const requestIp = require('request-ip');

if (process.env.NODE_ENV !== "production") {
	dotenvExpand.expand(dotenv.config());
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
const env = require("./start/env");

const { initializeSentry, Sentry } = require("./start/sentry");
// initializeSentry();

nunjucks.configure(path.join(__dirname, "views"), { autoescape: true });                                                                                                                                                                        
                                                                                                    
const app = express ();

// Serve static files for email templates (logo, etc.)
// app.use(express.static('public'));  
app.use(express.static(path.join(__dirname, "public")))                                                                                               

app.disable("x-powered-by");
app.set("trust proxy", process.env.NODE_ENV === "production"? 1 : "loopback");

const allowedOrigins = process.env.CORS_ORIGIN
	? process.env.CORS_ORIGIN.split(",")
	: [];                                                                      
// Configure CORS - Allow all origins
app.use(
	cors({
		origin: true,
		credentials: true,
	})
);
app.use(express.json());
app.use(requestIp.mw());
app.use(express.urlencoded({ extended: true }));
app.use(
	cookieSession({
		name: "bozzname-server",
		signed: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
		httpOnly: true, // Prevent XSS attacks
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
)

// VPS Plan subscription Reminder Service
require("./app/jobs/subscriptionReminder");
// cPanel License Reminder Service
require("./app/jobs/cPanelLicenseReminder");
// Auto Renew VPS Plan subscription
require("./app/jobs/autoRenewVPSSubscription");
// Auto Rnew cPanel License
require("./app/jobs/autoRenewcPanelLicense");

// RDP Subscription autoRenew
require("./app/jobs/rdpLifecycleJob");
// RDP Subscription reminder
require("./app/jobs/rdpSubscriptionReminder");
require("./app/jobs/deleteExpiredAccounts");
// HostBay Order Status Sync
require("./app/jobs/syncHostbayOrderStatus");
// Domain Expiry Reminder
require("./app/jobs/domainExpiryReminder");
// Hosting Expiry Reminder
require("./app/jobs/hostingExpiryReminder");
require("./app/models/User");
require("./app/models/UserSession");
require("./app/models/Wallet");
require("./app/models/Transaction");
require("./app/models/Payment");
require("./app/models/APIKey");
require("./app/models/CartItem");
require("./app/models/RewardPointLog");
require("./app/models/MembershipTier");
require("./app/models/Badge");
require("./start/logging")();
require("./routes")(app); 

// if (process.env.NODE_ENV !== "development") {
// 	app.use(express.static(path.join(__dirname, "client/dist"))); 
//   	app.get("*", (req, res) => { 
// 		return res.sendFile(
// 			path.resolve(__dirname, "client", "dist", "index.html")
// 		); 
// 	});      
// }        

const frontendPath = path.join(__dirname, "../frontend/dist");

// Serve static files
app.use(express.static(frontendPath));

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

Sentry.setupExpressErrorHandler(app);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404, "Route not found"));
});                                                                                                             
                    

  app.use(errorHandler);

module.exports = app;
