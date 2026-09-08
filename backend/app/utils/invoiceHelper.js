const PaymentInvoice = require("../models/PaymentInvoice");
const Payment = require("../models/Payment");
const User = require("../models/User");


const SELLER = {
	name: "Dynotech Innovations, LDA",
	address: {
		street: "Rua Luís de Camões 1017, 7° Dt°",
		city: "Montijo",
		postalCode: "2870-154",
		country: "Portugal",
	},
	nif: "PT518713130",
};


function getInvoiceNumberFromPayment(payment) {
	return payment.invoiceId || `HCY-${Date.now().toString().slice(-8)}`;
}

function getBuyerDetails(user) {
	const registrant = user?.domainProviderClient?.hostbay?.contactData?.registrant;
	const isDefaultPlaceholder =
		registrant &&
		registrant.city === "San Francisco" &&
		registrant.address === "123 Main Street" &&
		registrant.state === "CA" &&
		registrant.postal_code === "94102";
	const hasValidContact =
		registrant && (registrant.address || registrant.city) && !isDefaultPlaceholder;

	let name = user?.name || user?.email || "Customer";
	let email = user?.email || "";
	let address = null;
	let nif = null;

	if (hasValidContact) {
		const fn = registrant.first_name || "";
		const ln = registrant.last_name || "";
		name = `${fn} ${ln}`.trim() || name;
		email = registrant.email || email;
		address = {
			street: registrant.address || "",
			city: registrant.city || "",
			postalCode: registrant.postal_code || "",
			country: registrant.country || "",
		};
		nif = registrant.vat_number || registrant.tax_id || null;
	}

	return { name, email, address, nif };
}

async function createInvoiceFromPayment(payment) {
	try {
		const existing = await PaymentInvoice.findOne({ paymentId: payment._id }).lean();
		if (existing) {
			return existing;
		}

		const user = await User.findById(payment.userId).lean();
		if (!user) {
			throw new Error("User not found for invoice");
		}

		const amount = Number(payment.amount) || 0;
		const meta = payment.metadata || {};
		const defaultVatRate = Number(process.env.DEFAULT_VAT_RATE) || 0;
		let vatRate = 0;
		let vatAmount = 0;
		let subtotal = amount;

		// Use tax the user actually paid when stored on the payment (e.g. from checkout/webhook)
		const savedVatAmount = Number(meta.vatAmount);
		const savedBaseAmount = Number(meta.baseAmount);
		if (savedVatAmount > 0 && savedVatAmount < amount) {
			subtotal = Math.round((amount - savedVatAmount) * 100) / 100;
			vatAmount = savedVatAmount;
			vatRate = subtotal > 0 ? Math.round((savedVatAmount / subtotal) * 10000) / 100 : 0;
		} else if (savedBaseAmount > 0 && savedBaseAmount < amount) {
			subtotal = savedBaseAmount;
			vatAmount = Math.round((amount - savedBaseAmount) * 100) / 100;
			vatRate = subtotal > 0 ? Math.round((vatAmount / subtotal) * 10000) / 100 : 0;
		} else if (defaultVatRate > 0 && defaultVatRate < 100) {
			// Fallback: treat payment amount as total incl. VAT; back-calculate subtotal and VAT
			vatRate = defaultVatRate;
			subtotal = amount / (1 + vatRate / 100);
			vatAmount = Math.round((amount - subtotal) * 100) / 100;
		}
		const serviceFee = 0;

		const buyer = getBuyerDetails(user);

		const invoice = new PaymentInvoice({
			invoiceNumber: getInvoiceNumberFromPayment(payment),
			paymentId: payment._id,
			userId: payment.userId,
			seller: SELLER,
			buyer: {
				name: buyer.name,
				email: buyer.email,
				address: buyer.address,
				nif: buyer.nif,
			},
			items: [
				{
					description: payment.service,
					domain: meta.domainName || payment.title,
					unitPrice: subtotal,
					quantity: 1,
					period: meta.period ? `${meta.period} month(s)` : null,
					vatRate,
					vatAmount,
					total: amount,
				},
			],
			subtotal,
			vat: { percentage: vatRate, amount: vatAmount },
			serviceFee,
			total: amount,
			currency: payment.currency || "USD",
			paymentTerms: "Due on receipt",
			issuedAt: payment.paidAt || payment.createdAt || new Date(),
			paidAt: payment.status === "completed" ? (payment.paidAt || new Date()) : null,
			status: payment.status === "completed" ? "paid" : payment.status === "refunded" ? "cancelled" : "unpaid",
		});

		await invoice.save();
		console.log(`✅ Invoice saved: ${invoice.invoiceNumber} for payment ${payment.paymentId}`);
		return invoice;
	} catch (error) {
		console.error("❌ Error creating invoice from payment:", error);
		throw error;
	}
}

module.exports = {
	createInvoiceFromPayment,
	SELLER,
	getBuyerDetails,
};
