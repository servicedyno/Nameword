const mongoose = require('mongoose');
const {Schema} = mongoose;

const tokenSchema = new Schema({
	email:  {
        type: String,
        required: true,
        unique: true
    },
	token:{
        type: String,
		required:true
    },
},{
	timestamps: { createdAt: true, updatedAt: false }
});

const PasswordResetToken = mongoose.model('password_reset_token', tokenSchema);
module.exports = PasswordResetToken;