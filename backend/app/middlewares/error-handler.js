const winston = require("winston");
const CustomError = require("../errors/CustomError");

const errorHandler = function (err, req, res, next) {
	// Log error with winston
	winston.error(err);

	// Capture error in Sentry if in production
	if (
		process.env.SENTRY_ENVIRONMENT === "production" &&
		process.env.SENTRY_DSN
	) {
		const Sentry = require("../../start/sentry").Sentry;
		Sentry.captureException(err);
	}

	if (err instanceof CustomError) {
		return res
			.status(err.statusCode)
			.json({ errors: err.serializeErrors() });
	}

	res.status(err.statusCode || 500).json({
		errors: [
			{
				message: err.message,
			},
		],
	});
};

module.exports = errorHandler;
