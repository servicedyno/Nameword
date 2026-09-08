const mongoose = require("mongoose");
const { Schema } = mongoose;
const { hash, compare } = require("bcrypt");
const { assignTierAndBadges } = require("../utils/query");
const userBadgeSchema = require("./UserBadge");
const mongoosePaginate = require("mongoose-paginate-v2");
const { getSignedURL, deleteFile } = require("../utils/gCloudStorage");

const userSchema = new Schema(
	{
		name: { type: String, required: true },
		email: { type: String, unique: true, sparse: true },
		username: { type: String, unique: true, sparse: true },
		mobile: { type: String, unique: true, sparse: true },
		password: { type: String, default: null },
		profileImg: { type: String },
		googleId: { type: String, unique: true, sparse: true },
		telegramId: { type: String, unique: true, sparse: true },
		banned: { type: Boolean, default: false },
		deactivated: { type: Boolean, default: false },
		locked: { type: Boolean, default: false },
		failedLoginAttempts: { type: Number, default: 0 },
		lockedUntil: { type: Date, default: null },
		isProfileVerified: { type: Boolean, default: false },
		notifySMS: { type: Boolean, default: true },
		notifyEmail: { type: Boolean, default: false },
		notificationPreferences: {
			subscriptionsAndPayments: {
				sms: { type: Boolean, default: false },
				whatsapp: { type: Boolean, default: false },
				email: { type: Boolean, default: true },
			},
			accountAndSecurity: {
				sms: { type: Boolean, default: false },
				whatsapp: { type: Boolean, default: true },
				email: { type: Boolean, default: true },
			},
			serviceStatusAndChanges: {
				sms: { type: Boolean, default: false },
				whatsapp: { type: Boolean, default: true },
				email: { type: Boolean, default: true },
			},
			productUpdatesAndOffers: {
				sms: { type: Boolean, default: true },
				whatsapp: { type: Boolean, default: true },
				email: { type: Boolean, default: true },
			},
		},
		enabled2FA: { type: Boolean, default: false },
		twoFactorSecret: { type: String, default: '' },
		apiKeys: [{ type: Schema.Types.ObjectId, ref: "api_key" }],
		domains: [{ type: Schema.Types.ObjectId, ref: "domain" }],
		membershipTier: { type: Schema.Types.ObjectId, ref: "membership_tier" },
		badges: [userBadgeSchema],

		walletId: {
			type: String,
			default: null,
		},
		walletToken: {
			type: String,
			default: null,
		},

		// Domain provider client information
		domainProviderClient: {
			openprovider: {
				clientId: { type: String },
				username: { type: String },
				createdAt: { type: Date },
				status: {
					type: String,
					enum: ["active", "inactive", "pending"],
					default: "pending",
				},
			},
			connectreseller: {
				clientId: { type: String },
				username: { type: String },
				createdAt: { type: Date },
				status: {
					type: String,
					enum: ["active", "inactive", "pending"],
					default: "pending",
				},
			},
			hostbay: {
				contactId: { type: String },
				contactData: { type: Object },
				createdAt: { type: Date },
				status: {
					type: String,
					enum: ["active", "inactive", "pending"],
					default: "pending",
				},
			},
		},

		cpanelAccounts: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "CpanelAccount" },
		],
		pleskAccounts: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "PleskAccount" },
		],
		usedPromoCodes: [
			{
				code: { type: String, required: true },
				usedAt: { type: Date, default: Date.now },
				orderReference: { type: String }, // Reference to transaction/order
			}
		],
		deletedAt: { type: Date, required: false },
	},
	{
		timestamps: true,
		toJSON: {
			transform(doc, ret) {
				ret.id = ret._id;
				delete ret._id;
				delete ret.twoFactorSecret;
				delete ret.apiKeys;
				delete ret.password;
				delete ret.domains;
				delete ret.__v;
			},
		},
	}
);
// Text index for email search
userSchema.index({ email: "text" });

userSchema.plugin(mongoosePaginate);

userSchema.pre("save", async function (next) {
	if (this.isModified("password")) {
		const hashedPassword = await hash(this.get("password"), 10);
		this.set("password", hashedPassword);
	}

	next();
});

// Middleware to trigger tier and badge assignment after saving a new user
userSchema.post("save", async function (doc, next) {
	if (!doc.membershipTier) {
		await assignTierAndBadges(doc._id);
	}
	next();
});

userSchema.method("isValidPassword", async function (password) {
	return await compare(password, this.get("password"));
});

userSchema.method("getProfileWithSignedURL", async function () {
	if (this.profileImg) {
		this.profileImg = await getSignedURL(this.profileImg);
	}
	return this;
});

userSchema.method("rewardPoints", async function () {
	const RewardPointLog = mongoose.model("reward_point_log");

	const result = await RewardPointLog.aggregate([
		{
			$match: {
				userId: this._id,
				$or: [
					{ expiryDate: { $eq: null } }, // false:Include if no expiry_date
					{ expiryDate: { $gt: new Date() } }, // Include if expiry_date is in the future
				],
			},
		},
		{
			$group: {
				_id: null,
				totalPoints: {
					$sum: {
						$cond: [
							{ $eq: ["$operationType", "credit"] },
							"$rewardPoints",
							{ $multiply: ["$rewardPoints", -1] },
						],
					},
				},
			},
		},
	]);
	return result.length > 0 ? result[0].totalPoints.toString() : 0;
});

// Soft delete method
userSchema.methods.softDelete = async function () {
	this.deletedAt = new Date();
	await this.save();
	return this;
};

// Permanently remove the document from the collection
userSchema.methods.forceDelete = async function () {
	await this.deleteOne();
	return null;
};

// Static method to find non-deleted users
userSchema.statics.findActive = function () {
	return this.find({ deletedAt: { $exists: false } });
};

userSchema.post("deleteOne", { document: true }, async function (doc) {
	try {
		const user = doc;
		if (user.profileImg) {
			await deleteFile(user.profileImg);
		}

		const APIKey = mongoose.model("api_key");
		const Domain = mongoose.model("domain");
		await Promise.all([
			APIKey.deleteMany({ user: user._id }),
			Domain.deleteMany({ user: user._id }),
		]);
	} catch (error) {
		console.error("Error removing reference from User collection:", error);
	}
});

module.exports = mongoose.models.user || mongoose.model("user", userSchema);
