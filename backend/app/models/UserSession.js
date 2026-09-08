const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSessionSchema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    currentLogin: { type: Date, required: true, default: Date.now },
    device: { type: String, required: true },
    location: { type: String},
    ipAddress: { type: String },
    loginType: {
      type: String,
      enum: ["Email", "Google", "Telegram","Authenticator"],
      default: "Email"
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

const UserSession = mongoose.model('UserSession', userSessionSchema);
module.exports = UserSession;
