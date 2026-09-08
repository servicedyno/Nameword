const mongoose = require('mongoose');
const { Schema } = mongoose;

const vpsPriceIncreaseSchema = new Schema({
    type: { type: String, enum: ['vpsPurchase', 'vpsUpgrade'], required: true },
    unit: { type: String, enum: ['percentage', 'currency'], default: 'percentage' }, // Unit of increase
    value: { type: Number, default: 0 } // Increase value
});

const membershipTierSchema = new Schema({
	name: { type: String, enum: ['Starter', 'Pro', 'Elite', 'VIP'], required: true },
	pointsRequired: { type: Number, required: true },
	benefits: {
		earnRate: { type: Number, required: true }, // Points per $1 spent
		discount: { type: Number, default: 0 }, // Discount on domain renewals and registrations
		discountUnit: [{ type: String, enum: ['percentage', 'currency'], required: true }],
		discountItems: [{ type: String, enum: ['domainRegistration', 'domainRenewal'], default: null }],
		prioritySupport: { type: Boolean, default: false },
		exclusiveWebinars: { type: Boolean, default: false },
		annualGift: { type: Boolean, default: false },
		// VPS price increase fields
		vpsPriceIncrease: [vpsPriceIncreaseSchema],
	}
}, {
	timestamps: true,
	toJSON: {
		transform(doc, ret) {

			delete ret._id;
			delete ret.benefits;
			delete ret.pointsRequired;
			delete ret.createdAt;
			delete ret.updatedAt;
			delete ret.__v;
		}
	}
});

// Method to add a new VPS price increase
membershipTierSchema.methods.addVpsPriceIncrease = async function (type, unit, value) {
    this.benefits.vpsPriceIncrease.push({ type, unit, value });
    await this.save();
};

// Method to update an existing VPS price increase
membershipTierSchema.methods.updateVpsPriceIncrease = async function (index, newValue, newUnit) {
    if (this.benefits.vpsPriceIncrease[index]) {
        this.benefits.vpsPriceIncrease[index].value = newValue;
        this.benefits.vpsPriceIncrease[index].unit = newUnit;
        await this.save();
    } else {
        throw new Error("VPS price increase not found at the specified index.");
    }
};

const MembershipTier = mongoose.model('membership_tier', membershipTierSchema);

module.exports = MembershipTier;