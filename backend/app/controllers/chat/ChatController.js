const mongoose = require("mongoose");
const ChatMessage = require("../../models/Chat");
const { sendChatToZapier, sendSessionStartToZapier } = require("../../services/zapierService");
const winston = require("winston");
const User = require("../../models/User");

/**
 * Create a new chat message
 */
const createChatMessage = async (req, res) => {
	try {
		const userId = req.user.id; // From currentUser middleware
		const { message, sessionId } = req.body;

		if (!message || !message.trim()) {
			return res.status(400).json({
				success: false,
				message: "Message cannot be empty",
			});
		}

		// Generate session ID if not provided
		const chatSessionId =
			sessionId || `session_${userId}_${Date.now()}`;

		// Get user information for Zapier
		const user = await User.findById(userId).select(
			"name email mobile"
		);
		const userInfo = {
			name: user?.name || user?.email?.split("@")[0] || "Unknown",
			email: user?.email || "",
			phone: user?.mobile || "",
		};

		// Create chat message
		const chatMessage = new ChatMessage({
			userId,
			sessionId: chatSessionId,
			message: message.trim(),
			sender: "user",
			status: "sent",
		});

		await chatMessage.save();

		// Send to Zapier webhook (async, don't wait for response, but update webhookId if successful)
		sendChatToZapier({
			userId,
			sessionId: chatSessionId,
			message: message.trim(),
			sender: "user",
			userInfo,
			metadata: {
				messageId: chatMessage._id.toString(),
			},
		})
			.then((result) => {
				// Update webhookId if Zapier webhook was successful
				if (result?.success && result?.webhookId) {
					chatMessage.zapierWebhookId = result.webhookId;
					chatMessage.save().catch((err) => {
						winston.error({
							where: "ChatController",
							message: "Failed to update webhookId",
							error: err.message,
						});
					});
				}
			})
			.catch((error) => {
				winston.error({
					where: "ChatController",
					message: "Failed to send message to Zapier (non-blocking)",
					error: error.message,
				});
			});

		// If this is the first message in the session, send session start event
		const messageCount = await ChatMessage.countDocuments({
			userId,
			sessionId: chatSessionId,
		});

		if (messageCount === 1) {
			sendSessionStartToZapier({
				userId,
				sessionId: chatSessionId,
				userInfo,
			}).catch((error) => {
				winston.error({
					where: "ChatController",
					message: "Failed to send session start to Zapier (non-blocking)",
					error: error.message,
				});
			});
		}

		return res.status(201).json({
			success: true,
			message: "Message sent successfully",
			data: {
				_id: chatMessage._id,
				sessionId: chatSessionId,
				message: chatMessage.message,
				sender: chatMessage.sender,
				createdAt: chatMessage.createdAt,
			},
		});
	} catch (error) {
		winston.error({
			where: "ChatController",
			message: "Error creating chat message",
			error: error.message,
		});
		return res.status(500).json({
			success: false,
			message: "Failed to send message. Please try again.",
		});
	}
};

/**
 * Get chat messages for a user
 */
const getChatMessages = async (req, res) => {
	try {
		const userId = req.user.id;
		const { sessionId, page = 1, limit = 50 } = req.query;

		const query = { userId };
		if (sessionId) {
			query.sessionId = sessionId;
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const messages = await ChatMessage.find(query)
			.sort({ createdAt: 1 })
			.skip(skip)
			.limit(parseInt(limit))
			.select("message sender status createdAt sessionId");

		const total = await ChatMessage.countDocuments(query);

		// Get unique session IDs for the user
		const sessions = await ChatMessage.distinct("sessionId", {
			userId,
		});

		return res.status(200).json({
			success: true,
			data: {
				messages,
				total,
				currentPage: parseInt(page),
				totalPages: Math.ceil(total / parseInt(limit)),
				sessions: sessions.length,
			},
		});
	} catch (error) {
		winston.error({
			where: "ChatController",
			message: "Error fetching chat messages",
			error: error.message,
		});
		return res.status(500).json({
			success: false,
			message: "Failed to fetch messages. Please try again.",
		});
	}
};

/**
 * Get chat sessions for a user
 */
const getChatSessions = async (req, res) => {
	try {
		const userId = req.user.id;
		const { page = 1, limit = 20 } = req.query;

		// Get distinct sessions with their latest message
		const sessions = await ChatMessage.aggregate([
			{ $match: { userId: new mongoose.Types.ObjectId(userId) } },
			{ $sort: { createdAt: -1 } },
			{
				$group: {
					_id: "$sessionId",
					lastMessage: { $first: "$message" },
					lastMessageTime: { $first: "$createdAt" },
					messageCount: { $sum: 1 },
					unreadCount: {
						$sum: {
							$cond: [
								{
									$and: [
										{ $eq: ["$sender", "support"] },
										{ $ne: ["$status", "read"] },
									],
								},
								1,
								0,
							],
						},
					},
				},
			},
			{ $sort: { lastMessageTime: -1 } },
			{ $skip: (parseInt(page) - 1) * parseInt(limit) },
			{ $limit: parseInt(limit) },
		]);

		const total = await ChatMessage.distinct("sessionId", {
			userId,
		}).then((sessions) => sessions.length);

		return res.status(200).json({
			success: true,
			data: {
				sessions: sessions.map((s) => ({
					sessionId: s._id,
					lastMessage: s.lastMessage,
					lastMessageTime: s.lastMessageTime,
					messageCount: s.messageCount,
					unreadCount: s.unreadCount,
				})),
				total,
				currentPage: parseInt(page),
				totalPages: Math.ceil(total / parseInt(limit)),
			},
		});
	} catch (error) {
		winston.error({
			where: "ChatController",
			message: "Error fetching chat sessions",
			error: error.message,
		});
		return res.status(500).json({
			success: false,
			message: "Failed to fetch chat sessions. Please try again.",
		});
	}
};

/**
 * Send support response (for support agents/admin)
 */
const sendSupportResponse = async (req, res) => {
	try {
		const { message, sessionId, userId } = req.body;

		if (!message || !message.trim()) {
			return res.status(400).json({
				success: false,
				message: "Message cannot be empty",
			});
		}

		if (!sessionId) {
			return res.status(400).json({
				success: false,
				message: "Session ID is required",
			});
		}

		if (!userId) {
			return res.status(400).json({
				success: false,
				message: "User ID is required",
			});
		}

		// Verify the session exists and belongs to the user
		const existingMessage = await ChatMessage.findOne({
			userId,
			sessionId,
		});

		if (!existingMessage) {
			return res.status(404).json({
				success: false,
				message: "Chat session not found",
			});
		}

		// Get user information for Zapier
		const user = await User.findById(userId).select("name email mobile");
		const userInfo = {
			name: user?.name || user?.email?.split("@")[0] || "Unknown",
			email: user?.email || "",
			phone: user?.mobile || "",
		};

		// Create support message
		const chatMessage = new ChatMessage({
			userId,
			sessionId,
			message: message.trim(),
			sender: "support",
			status: "sent",
		});

		await chatMessage.save();

		// Send to Zapier webhook (optional - for support responses)
		sendChatToZapier({
			userId,
			sessionId,
			message: message.trim(),
			sender: "support",
			userInfo,
			metadata: {
				messageId: chatMessage._id.toString(),
				supportAgent: req.user?.id || req.user?.email || "Support",
			},
		}).catch((error) => {
			winston.error({
				where: "ChatController",
				message: "Failed to send support response to Zapier (non-blocking)",
				error: error.message,
			});
		});

		return res.status(201).json({
			success: true,
			message: "Support response sent successfully",
			data: {
				_id: chatMessage._id,
				sessionId,
				message: chatMessage.message,
				sender: chatMessage.sender,
				createdAt: chatMessage.createdAt,
			},
		});
	} catch (error) {
		winston.error({
			where: "ChatController",
			message: "Error sending support response",
			error: error.message,
		});
		return res.status(500).json({
			success: false,
			message: "Failed to send support response. Please try again.",
		});
	}
};

/**
 * Receive support response from webhook (for Zapier/external systems)
 * This endpoint accepts responses from Zapier or other webhook sources
 */
const receiveWebhookResponse = async (req, res) => {
	try {
		const { message, sessionId, userId, webhookSecret } = req.body;

		// Optional: Verify webhook secret for security
		// You can add a WEBHOOK_SECRET in your .env and verify it here
		// if (webhookSecret !== process.env.CHAT_WEBHOOK_SECRET) {
		//   return res.status(401).json({ success: false, message: "Unauthorized" });
		// }

		if (!message || !message.trim()) {
			return res.status(400).json({
				success: false,
				message: "Message cannot be empty",
			});
		}

		if (!sessionId) {
			return res.status(400).json({
				success: false,
				message: "Session ID is required",
			});
		}

		if (!userId) {
			return res.status(400).json({
				success: false,
				message: "User ID is required",
			});
		}

		// Verify the session exists and belongs to the user
		const existingMessage = await ChatMessage.findOne({
			userId,
			sessionId,
		});

		if (!existingMessage) {
			return res.status(404).json({
				success: false,
				message: "Chat session not found",
			});
		}

		// Get user information
		const user = await User.findById(userId).select("name email mobile");
		const userInfo = {
			name: user?.name || user?.email?.split("@")[0] || "Unknown",
			email: user?.email || "",
			phone: user?.mobile || "",
		};

		// Create support message
		const chatMessage = new ChatMessage({
			userId,
			sessionId,
			message: message.trim(),
			sender: "support",
			status: "sent",
		});

		await chatMessage.save();

		return res.status(201).json({
			success: true,
			message: "Support response received successfully",
			data: {
				_id: chatMessage._id,
				sessionId,
				message: chatMessage.message,
				sender: chatMessage.sender,
				createdAt: chatMessage.createdAt,
			},
		});
	} catch (error) {
		winston.error({
			where: "ChatController",
			message: "Error receiving webhook response",
			error: error.message,
		});
		return res.status(500).json({
			success: false,
			message: "Failed to process webhook response. Please try again.",
		});
	}
};

/**
 * Mark messages as read
 */
const markMessagesAsRead = async (req, res) => {
	try {
		const userId = req.user.id;
		const { sessionId } = req.body;

		const query = {
			userId,
			sender: "support",
			status: { $ne: "read" },
		};

		if (sessionId) {
			query.sessionId = sessionId;
		}

		const result = await ChatMessage.updateMany(query, {
			$set: { status: "read" },
		});

		return res.status(200).json({
			success: true,
			message: "Messages marked as read",
			data: {
				updatedCount: result.modifiedCount,
			},
		});
	} catch (error) {
		winston.error({
			where: "ChatController",
			message: "Error marking messages as read",
			error: error.message,
		});
		return res.status(500).json({
			success: false,
			message: "Failed to mark messages as read.",
		});
	}
};

module.exports = {
	createChatMessage,
	getChatMessages,
	getChatSessions,
	markMessagesAsRead,
	sendSupportResponse,
	receiveWebhookResponse,
};

