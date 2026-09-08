const Sentry = require("@sentry/node");

/**
 * Initialize Sentry for error tracking only
 * Only enabled in production environment
 */
function initializeSentry() {
	// Only initialize Sentry in production
	if (process.env.SENTRY_ENVIRONMENT !== "production") {
		console.log("Sentry disabled - not in production environment");
		return;
	}

	// Check if Sentry DSN is provided
	if (!process.env.SENTRY_DSN) {
		console.log("Sentry disabled - no SENTRY_DSN provided");
		return;
	}

	try {
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			environment: process.env.SENTRY_ENVIRONMENT || "production",

			// Set traces sample rate for performance monitoring
			tracesSampleRate:
				parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,

			// Enable debug mode in development
			debug: process.env.NODE_ENV === "development",

			// Before sending event to Sentry
			beforeSend(event, hint) {
				// Only capture errors, not messages or other events
				if (event.level !== "error" && event.level !== "fatal") {
					return null;
				}

				// Filter out certain errors if needed
				if (event.exception) {
					const exception = event.exception.values[0];
					// Example: Filter out 404 errors
					if (exception.type === "NotFoundError") {
						return null;
					}
				}
				return event;
			},

			// Configure which errors to ignore
			ignoreErrors: [
				// Ignore specific error types
				"NetworkError",
				"TimeoutError",
				// Ignore errors from certain sources
				/^.*\/favicon\.ico$/,
			],
		});

		console.log("Sentry initialized successfully (errors only)");
	} catch (error) {
		console.error("Failed to initialize Sentry:", error);
	}
}

module.exports = { initializeSentry, Sentry };
