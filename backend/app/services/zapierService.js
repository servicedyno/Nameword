const axios = require("axios");
const winston = require("winston");

/**
 * Send chat message to Zapier webhook
 * @param {Object} chatData - Chat message data
 * @param {string} chatData.userId - User ID
 * @param {string} chatData.sessionId - Chat session ID
 * @param {string} chatData.message - Message content
 * @param {string} chatData.sender - 'user' or 'support'
 * @param {Object} chatData.userInfo - User information (name, email, etc.)
 * @returns {Promise<Object>} Zapier webhook response
 */
const sendChatToZapier = async (chatData) => {
	const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

	if (!ZAPIER_WEBHOOK_URL) {
		winston.warn({
			where: "zapierService",
			message: "ZAPIER_WEBHOOK_URL not configured. Skipping Zapier webhook.",
		});
		return null;
	}

	try {
		const payload = {
			event: "chat.message",
			timestamp: new Date().toISOString(),
			data: {
				userId: chatData.userId?.toString(),
				sessionId: chatData.sessionId,
				message: chatData.message,
				sender: chatData.sender,
				userInfo: chatData.userInfo || {},
				metadata: chatData.metadata || {},
			},
		};

		const response = await axios.post(ZAPIER_WEBHOOK_URL, payload, {
			headers: { "Content-Type": "application/json" },
			timeout: 10000, // 10 second timeout
		});

		winston.info({
			where: "zapierService",
			message: "Chat message sent to Zapier successfully",
			sessionId: chatData.sessionId,
		});

		return {
			success: true,
			webhookId: response?.data?.id || null,
			response: response?.data,
		};
	} catch (error) {
		winston.error({
			where: "zapierService",
			message: "Failed to send chat to Zapier",
			error: error?.response?.data || error?.message,
			sessionId: chatData.sessionId,
		});

		// Don't throw error - allow chat to continue even if Zapier fails
		return {
			success: false,
			error: error?.response?.data || error?.message,
		};
	}
};

/**
 * Send chat session start event to Zapier
 * @param {Object} sessionData - Session data
 * @param {string} sessionData.userId - User ID
 * @param {string} sessionData.sessionId - Chat session ID
 * @param {Object} sessionData.userInfo - User information
 * @returns {Promise<Object>} Zapier webhook response
 */
const sendSessionStartToZapier = async (sessionData) => {
	const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

	if (!ZAPIER_WEBHOOK_URL) {
		return null;
	}

	try {
		const payload = {
			event: "chat.session.start",
			timestamp: new Date().toISOString(),
			data: {
				userId: sessionData.userId?.toString(),
				sessionId: sessionData.sessionId,
				userInfo: sessionData.userInfo || {},
			},
		};

		const response = await axios.post(ZAPIER_WEBHOOK_URL, payload, {
			headers: { "Content-Type": "application/json" },
			timeout: 10000, // 10 second timeout
		});

		winston.info({
			where: "zapierService",
			message: "Chat session start sent to Zapier",
			sessionId: sessionData.sessionId,
		});

		return {
			success: true,
			response: response?.data,
		};
	} catch (error) {
		winston.error({
			where: "zapierService",
			message: "Failed to send session start to Zapier",
			error: error?.response?.data || error?.message,
		});

		return {
			success: false,
			error: error?.response?.data || error?.message,
		};
	}
};

module.exports = {
	sendChatToZapier,
	sendSessionStartToZapier,
};

