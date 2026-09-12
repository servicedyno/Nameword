const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
        userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user",
                required: true,
        },
        walletId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Wallet",
                required: true,
        },
        invoiceId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Invoice",
        },
        transactionId: {
                type: String,
                unique: true,
        },
        amount: { type: Number, required: true },
        currency: { type: String, required: true },
        type: { type: String, enum: ["credit", "debit"], required: true },
        method: { type: String, required: true },
        from: { type: String },
        reference: { type: String, required: true },
        // Cross-path exactly-once guard for provider credits (e.g. `dynopay:<payment_id>`).
        // Sparse + unique: only credits that set it are deduplicated; legacy docs are unaffected.
        idempotencyKey: { type: String, default: undefined },
        status: {
                type: String,
                enum: ["pending", "completed", "failed"],
                default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
});

TransactionSchema.pre("save", function (next) {
        if (!this.transactionId) {
                this.transactionId = `NW${Date.now()}${Math.random()
                        .toString(36)
                        .substring(2, 11)}`;
        }
        next();
});

TransactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Transaction", TransactionSchema);
