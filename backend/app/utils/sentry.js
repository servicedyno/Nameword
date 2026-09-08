const { Sentry } = require("../../start/sentry");

/**
 * Capture an exception in Sentry (only in production)
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context for the error
 */
function captureException(error, context = {}) {
	if (
		process.env.SENTRY_ENVIRONMENT === "production" &&
		process.env.SENTRY_DSN
	) {
		Sentry.captureException(error, {
			extra: context,
		});
	}
}

/**
 * Set user context in Sentry (only in production)
 * @param {Object} user - User object with id, email, username, etc.
 */
function setUser(user) {
	if (
		process.env.SENTRY_ENVIRONMENT === "production" &&
		process.env.SENTRY_DSN
	) {
		Sentry.setUser(user);
	}
}

/**
 * Set tag in Sentry (only in production)
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 */
function setTag(key, value) {
	if (
		process.env.SENTRY_ENVIRONMENT === "production" &&
		process.env.SENTRY_DSN
	) {
		Sentry.setTag(key, value);
	}
}

/**
 * Set extra context in Sentry (only in production)
 * @param {string} key - Context key
 * @param {any} value - Context value
 */
function setExtra(key, value) {
	if (
		process.env.SENTRY_ENVIRONMENT === "production" &&
		process.env.SENTRY_DSN
	) {
		Sentry.setExtra(key, value);
	}
}

/**
 * Start a new transaction for performance monitoring (only in production)
 * @param {string} name - Transaction name
 * @param {string} operation - Operation type
 * @returns {Object} Transaction object or null if not in production
 */
function startTransaction(name, operation = "default") {
	if (
		process.env.SENTRY_ENVIRONMENT === "production" &&
		process.env.SENTRY_DSN
	) {
		return Sentry.startTransaction({
			name,
			op: operation,
		});
	}
	return null;
}

module.exports = {
	captureException,
	setUser,
	setTag,
	setExtra,
	startTransaction,
};
