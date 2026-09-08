const mongoose = require('mongoose');
const {Schema} = mongoose;

const verificationSchema = new Schema({
    email:  {
        type: String,
        unique: true,
        sparse: true
    },
    mobile: {
        type: String,
        required: function() {
            return !this.email;
        },
        unique: true,
        sparse: true
    },
    otp:{
        type: String,
        required:true
    },
    expiresAt: { 
        type: Date, 
        required: true 
    },
},{
    timestamps: { createdAt: true, updatedAt: false }
});

const VerificationCode = mongoose.model('verification_code', verificationSchema);
module.exports = VerificationCode;