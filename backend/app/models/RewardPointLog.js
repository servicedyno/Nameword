const mongoose = require('mongoose');
const {Schema} = mongoose;
const { assignTierAndBadges } = require("../utils/query");

const rewardPointLogSchema = new Schema({
	userId: { type: Schema.Types.ObjectId,  ref: 'user', required: true  },
	rewardPoints: { type: Schema.Types.Decimal128, required: true },
	operationType: { type: String, enum: ['credit', 'debit'], required: true },
	expiryDate: {type: Date, default: null}

},{
	timestamps: true
});

// Post-save middleware to assign tier and badges after reward points change
rewardPointLogSchema.post('save', async function (doc, next) {
	await assignTierAndBadges(doc.userId);
	next();
});

const RewardPointLog = mongoose.model('reward_point_log', rewardPointLogSchema);

module.exports = RewardPointLog;