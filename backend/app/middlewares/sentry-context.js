const { setUser, setTag } = require("../utils/sentry");

/**
 * Middleware to set Sentry context for authenticated users
 * Only runs in production environment
 */
function setSentryContext(req, res, next) {
	// Only set context in production
	if (
		process.env.SENTRY_ENVIRONMENT !== "production" ||
		!process.env.SENTRY_DSN
	) {
		return next();
	}

	// Set user context if user is authenticated
	if (req.user) {
		setUser({
			id: req.user._id?.toString() || req.user.id,
			email: req.user.email,
			username: req.user.username || req.user.email,
			ip_address: req.ip,
		});
	}

	// Set request tags
	setTag("route", req.route?.path || req.path);
	setTag("method", req.method);
	setTag("user_agent", req.get("User-Agent"));

	next();
}

module.exports = setSentryContext;
