const mongoose = require("mongoose");
const { Schema } = mongoose;

const chatMessageSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "user",
			required: true,
		},
		sessionId: {
			type: String,
			required: true,
			index: true,
		},
		message: {
			type: String,
			required: true,
		},
		sender: {
			type: String,
			enum: ["user", "support"],
			required: true,
			default: "user",
		},
		status: {
			type: String,
			enum: ["sent", "delivered", "read"],
			default: "sent",
		},
		zapierWebhookId: {
			type: String,
			default: null,
		},
		metadata: {
			type: Schema.Types.Mixed,
			default: {},
		},
	},
	{ timestamps: true }
);

// Index for faster queries
chatMessageSchema.index({ userId: 1, sessionId: 1, createdAt: -1 });
chatMessageSchema.index({ sessionId: 1, createdAt: -1 });

const ChatMessage = mongoose.model("chat_message", chatMessageSchema);

module.exports = ChatMessage;

