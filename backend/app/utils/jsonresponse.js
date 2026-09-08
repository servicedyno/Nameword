
module.exports = function jsonResponse(res, statusCode = 200, message = "", data = null) {
	const success = statusCode >= 200 && statusCode < 400;
	return res.status(statusCode).json({
		success,
		message,
		data,
	});
};

