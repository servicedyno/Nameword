const mongoose = require("mongoose");
const { Schema } = mongoose;

const activitySchema = new Schema(
	{
		domain: {
			type: String,
			required: true,
		},
		activityType: {
			type: String,
			enum: ["domain", "dns"],
			required: true,
		},
		activity: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: [
				"Successful",
				"Rejected",
				"In Progress",
				"Scheduled",
				"Changed",
			],
			required: true,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: "user",
			required: true,
		},
		// To get user info in single query
		userInfo: {
			name: { type: String, required: false },
		},
	},
	{
		timestamps: true,
		toJSON: {
			transform(doc, ret) {
				ret.id = ret._id;
				delete ret._id;
				delete ret.__v;
			},
		},
	}
);

const Activity = mongoose.model("activity", activitySchema);
module.exports = Activity;
