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

const ReactivateAccountToken = mongoose.model('reactivate_account_token', tokenSchema);
module.exports = ReactivateAccountToken;