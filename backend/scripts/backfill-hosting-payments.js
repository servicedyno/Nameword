

const mongoose = require("mongoose");
const path = require("path");

// Load env before requiring app modules (envalid expects process.env)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const env = require("../start/env");

const HostingOrder = require("../app/models/HostingOrder");
const Payment = require("../app/models/Payment");
const { createInvoiceFromPayment } = require("../app/utils/invoiceHelper");

const SERVICE = "Premium Web Hosting";
const CREATED_AT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

function generatePaymentId() {
	const ts = Date.now();
	const r = Math.random().toString(36).substring(2, 8).toUpperCase();
	return `N_${ts}${r}`;
}

async function generateInvoiceId() {
	const last = await Payment.findOne({ invoiceId: /^HCY-\d+$/ })
		.sort({ invoiceId: -1 })
		.lean();
	let n = 13714580;
	if (last?.invoiceId) {
		const m = last.invoiceId.match(/(\d+)$/);
		if (m) n = parseInt(m[1], 10) + 1;
	}
	return `HCY-${String(n).padStart(8, "0")}`;
}

function mapPaymentTypeToMethod(pt) {
	if (!pt || typeof pt !== "string") return "other";
	const u = pt.toUpperCase();
	if (u === "WALLET") return "wallet_balance";
	if (u === "CRYPTO") return "crypto";
	if (u === "CREDIT_CARD") return "credit_card";
	if (u === "BANK_TRANSFER") return "bank_transfer";
	return "other";
}

/**
 * Check if a Payment already exists for this hosting order (avoid duplicates).
 */
async function findExistingPayment(order) {
	const userId = order.user;
	const amount = Number(order.amount);
	const title = order.domainName || order.planName || "Hosting Plan";
	const orderCreated = new Date(order.createdAt).getTime();

	// 1. Idempotency: we already backfilled this order
	const byHostingOrderId = await Payment.findOne({
		userId,
		service: SERVICE,
		"metadata.hostingOrderId": order._id.toString(),
	}).lean();
	if (byHostingOrderId) return byHostingOrderId;

	// 2. Prefer hostbayOrderId match if we have it (original Payment from purchase flow)
	if (order.hostbayOrderId) {
		const byHostbay = await Payment.findOne({
			userId,
			service: SERVICE,
			"metadata.hostbayOrderId": String(order.hostbayOrderId),
		}).lean();
		if (byHostbay) return byHostbay;
	}

	// 3. Fallback: same user, amount, title/domain/plan, and date within 24h
	const orClauses = [];
	if (title) {
		orClauses.push({ title: { $regex: new RegExp(`^${String(title).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
	}
	if (order.domainName) orClauses.push({ "metadata.domainName": order.domainName });
	if (order.planName) orClauses.push({ "metadata.planName": order.planName });
	if (orClauses.length === 0) return null;

	const lo = new Date(orderCreated - CREATED_AT_WINDOW_MS);
	const hi = new Date(orderCreated + CREATED_AT_WINDOW_MS);
	const byDetails = await Payment.findOne({
		userId,
		service: SERVICE,
		amount: { $gte: amount - 0.01, $lte: amount + 0.01 },
		paidAt: { $gte: lo, $lte: hi },
		$or: orClauses,
	}).lean();

	return byDetails || null;
}

async function run(dryRun) {
	await mongoose.connect(env.DB_URI);

	const orders = await HostingOrder.find({ status: "completed" })
		.sort({ createdAt: 1 })
		.lean();

	let created = 0;
	let skipped = 0;
	let errors = 0;

	for (const order of orders) {
		const amount = order.amount == null ? 0 : Number(order.amount);
		if (!Number.isFinite(amount) || amount <= 0) {
			console.warn(`⚠️  Skip order ${order._id}: missing or invalid amount`);
			skipped++;
			continue;
		}

		const existing = await findExistingPayment(order);
		if (existing) {
			skipped++;
			continue;
		}

		const title = order.domainName || order.planName || "Hosting Plan";
		const paymentMethod = mapPaymentTypeToMethod(order.paymentType);

		if (dryRun) {
			console.log(`[dry-run] Would create Payment: user=${order.user} amount=${amount} title=${title}`);
			created++;
			continue;
		}

		try {
			const paymentId = generatePaymentId();
			const invoiceId = await generateInvoiceId();
			const payment = new Payment({
				userId: order.user,
				paymentId,
				invoiceId,
				service: SERVICE,
				title,
				amount: Math.abs(amount),
				currency: order.currency || "USD",
				paymentMethod,
				status: "completed",
				metadata: {
					hostbayOrderId: order.hostbayOrderId || undefined,
					domainName: order.domainName,
					planName: order.planName,
					plan: order.plan,
					period: order.period,
					provider: order.provider,
					transactionId: order.transactionId,
					paymentReference: order.paymentReference,
					paymentType: order.paymentType,
					backfilled: true,
					hostingOrderId: order._id.toString(),
				},
				paidAt: order.createdAt || new Date(),
			});
			await payment.save();
			try {
				await createInvoiceFromPayment(payment);
			} catch (invoiceErr) {
				console.warn(`⚠️ Invoice not created for ${payment.paymentId}:`, invoiceErr.message);
			}
			console.log(`✅ Created Payment ${payment.paymentId} for "${title}" (order ${order._id})`);
			created++;
		} catch (e) {
			console.error(`❌ Failed to create Payment for order ${order._id}:`, e.message);
			errors++;
		}
	}

	console.log("\n--- Summary ---");
	console.log(`Completed hosting orders: ${orders.length}`);
	console.log(`Payments created: ${created}`);
	console.log(`Skipped (existing or invalid): ${skipped}`);
	console.log(`Errors: ${errors}`);
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");
	if (dryRun) console.log("🔍 DRY RUN — no Payment records will be created.\n");

	try {
		console.log("Connecting to MongoDB...");
		await run(dryRun);
	} catch (e) {
		console.error("Backfill failed:", e);
		process.exit(1);
	} finally {
		await mongoose.connection.close();
		console.log("\nDisconnected from MongoDB.");
	}
}

main();
