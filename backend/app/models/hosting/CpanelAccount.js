const mongoose = require('mongoose');

const cpanelAccountSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
	domain: { type: mongoose.Schema.Types.ObjectId, ref: 'domain', required: false },
	domainName: { type: String, required: false },
	username: { type: String, required: true, unique: true },
	plan: { type: String, required: false },
	status: { type: String, enum: ['active', 'suspended'], default: 'active' },
	suspensionEmailSent: { type: Boolean, default: false },
	pendingDeletionWarningSent: { type: Boolean, default: false },
	deletedAt: { type: Date, required: false }
}, {
	timestamps: true,
	toJSON: {
		transform(doc, ret) {
			delete ret._id;
			delete ret.__v;
		}
	}
});

// Soft delete method
cpanelAccountSchema.methods.softDelete = async function () {
	this.deletedAt = new Date();  // Set the deleteAt field to the current timestamp
	await this.save();
	return this;
};

// Permanently remove the document from the collection
cpanelAccountSchema.methods.forceDelete = async function () {
	await this.remove(); 
	return null;
};

// Static method to find non-deleted accounts
cpanelAccountSchema.statics.findActive = function () {
	return this.find({ deletedAt: { $exists: false } });
};

module.exports = mongoose.model('CpanelAccount', cpanelAccountSchema);
