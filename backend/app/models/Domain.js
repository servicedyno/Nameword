const mongoose = require('mongoose');
const { Schema } = mongoose;

const domainSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'user', required: true },
	domainNameId: { type: Number, required: true, },
	customerId: { type: Schema.Types.Mixed, required: true, },	
	websiteName: { type: String, required: true },
	provider: { type: String, required: false },
	status: { type: String, required: false, enum: ["Requested","Active"] },
	autorenew: { type: String, required: false },
	// Reason and description for auto-renewal turn-off
	autoRenewalTurnOffReason: { type: String, required: false },
	autoRenewalTurnOffDescription: { type: String, required: false },
	duration: { type: Number, required: false },
	orderDate: { type: Date, required: true },
	expirationDate: { type: Date, required: true },
	expiryReminderSent: { type: Boolean, default: false },
	expiredNotificationSent: { type: Boolean, default: false },
	price: { type: Schema.Types.Decimal128, required: true },
	transferInfo: {
		transferId: { type: String, default: null },
		transferStatus: { type: String, enum: ["Pending", "Accepted", "Completed", "Failed", null], default: null },
		initiatedAt: { type: Date, default: null },
		acceptedAt: { type: Date, default: null },
		completedAt: { type: Date, default: null },
		authorizationCode: { type: String, default: null },
		transferDuration: { type: Number, default: null },
		provider: { type: String, default: null },
	},
	cloudflare: {
		zoneId: { type: String, required: false },
	},
	lockStatus: {
		isLocked: { type: Boolean, default: null },
		provider: { type: String, default: null },
		updatedAt: { type: Date, default: null },
	},
	authInfo: {
		code: { type: String, default: null },
		provider: { type: String, default: null },
		updatedAt: { type: Date, default: null },
	},
	// Store domain contact information
	contacts: {
		registrant: {
			type: {
				handle: { type: String },
				name: {
					first_name: { type: String },
					last_name: { type: String },
					full_name: { type: String },
				},
				email: { type: String },
				phone: {
					country_code: { type: String },
					subscriber_number: { type: String },
				},
				address: {
					street: { type: String },
					addressLine2: { type: String },
					city: { type: String },
					state: { type: String },
					country: { type: String },
					zipcode: { type: String },
				},
				company_name: { type: String },
			},
			default: null,
		},
		admin: {
			type: {
				handle: { type: String },
				name: {
					first_name: { type: String },
					last_name: { type: String },
					full_name: { type: String },
				},
				email: { type: String },
				phone: {
					country_code: { type: String },
					subscriber_number: { type: String },
				},
				address: {
					street: { type: String },
					addressLine2: { type: String },
					city: { type: String },
					state: { type: String },
					country: { type: String },
					zipcode: { type: String },
				},
				company_name: { type: String },
			},
			default: null,
		},
		technical: {
			type: {
				handle: { type: String },
				name: {
					first_name: { type: String },
					last_name: { type: String },
					full_name: { type: String },
				},
				email: { type: String },
				phone: {
					country_code: { type: String },
					subscriber_number: { type: String },
				},
				address: {
					street: { type: String },
					addressLine2: { type: String },
					city: { type: String },
					state: { type: String },
					country: { type: String },
					zipcode: { type: String },
				},
				company_name: { type: String },
			},
			default: null,
		},
		billing: {
			type: {
				handle: { type: String },
				name: {
					first_name: { type: String },
					last_name: { type: String },
					full_name: { type: String },
				},
				email: { type: String },
				phone: {
					country_code: { type: String },
					subscriber_number: { type: String },
				},
				address: {
					street: { type: String },
					addressLine2: { type: String },
					city: { type: String },
					state: { type: String },
					country: { type: String },
					zipcode: { type: String },
				},
				company_name: { type: String },
			},
			default: null,
		},
		lastUpdated: { type: Date, default: null },
	},
	privacy: {
		originalContacts: {
			registrant: { type: Schema.Types.Mixed, default: null },
			admin: { type: Schema.Types.Mixed, default: null },
			tech: { type: Schema.Types.Mixed, default: null },
			billing: { type: Schema.Types.Mixed, default: null },
		},
		lastStatus: {
			type: String,
			enum: ["enabled", "disabled"],
			default: null,
		},
		isEnabled: { type: Boolean, default: null },
		updatedAt: { type: Date, default: null },
	},
	deletedAt: { type: Date, default: null },
}, {
	timestamps: true,
	toJSON: {
		transform(doc, ret) {
			ret.id = ret._id;
			ret.price = parseFloat(ret.price.toString());
			delete ret.user;
			delete ret._id;
			delete ret.__v;
		}
	}
});

const Domain = mongoose.model('domain', domainSchema);
module.exports = Domain;