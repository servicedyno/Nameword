const router = require("express").Router();
const {
	createChatMessage,
	getChatMessages,
	getChatSessions,
	markMessagesAsRead,
	sendSupportResponse,
	receiveWebhookResponse,
} = require("../../app/controllers/chat/ChatController");
const currentUser = require("../../app/middlewares/current-user");
const requireAuth = require("../../app/middlewares/require-auth");
const currentAdmin = require("../../app/middlewares/current-admin");
const requireAdminAuth = require("../../app/middlewares/require-admin-auth");

// Create a new chat message
router.post(
	"/message",
	currentUser,
	requireAuth,
	createChatMessage
);

// Get chat messages
router.get("/messages", currentUser, requireAuth, getChatMessages);

// Get chat sessions
router.get("/sessions", currentUser, requireAuth, getChatSessions);

// Mark messages as read
router.post(
	"/messages/read",
	currentUser,
	requireAuth,
	markMessagesAsRead
);

// Send support response (for admin/support agents)
router.post(
	"/support/response",
	currentAdmin,
	requireAdminAuth,
	sendSupportResponse
);

// Receive support response from webhook (for Zapier/external systems)
// This endpoint doesn't require authentication - you can add webhook secret verification
router.post("/webhook/response", receiveWebhookResponse);

module.exports = router;

