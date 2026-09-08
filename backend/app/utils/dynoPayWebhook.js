const crypto = require("crypto");

const MAX_PROCESSED_IDS = 10000;
const processedWebhookIds = new Set();
const idQueue = [];                                                                                                                                


function verifyDynoPaySignature(payload, signature, secret) {
	if (!payload || !signature || !secret) return false;
	try {
		const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
		const sig = signature.startsWith("sha256=") ? signature.slice(7).trim() : signature.trim();
		const a = Buffer.from(expected, "hex");
		const b = Buffer.from(sig, "hex");
		return a.length === b.length && crypto.timingSafeEqual(a, b);
	} catch {
		return false;
	}
}

function hasProcessed(webhookId) {
	if (!webhookId) return false;
	return processedWebhookIds.has(webhookId);
}


function markProcessed(webhookId) {
	if (!webhookId) return;
	if (processedWebhookIds.size >= MAX_PROCESSED_IDS && !processedWebhookIds.has(webhookId)) {
		const oldest = idQueue.shift();
		if (oldest) processedWebhookIds.delete(oldest);
	}
	if (!processedWebhookIds.has(webhookId)) {
		processedWebhookIds.add(webhookId);
		idQueue.push(webhookId);
	}
}

module.exports = {
	verifyDynoPaySignature,
	hasProcessed,
	markProcessed,
};
