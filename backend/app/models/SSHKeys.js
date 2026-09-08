const mongoose = require('mongoose');

// Define the SSH key schema
const sshKeySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', 
    },
    username: {
        type: String,
        required: true,
    },
    sshKeyName: {
        type: String,
        unique: true,
    },
    publicKey: {
        type: String,
        required: true,
    },
    privateKey: {
        type: String,
    },
    revoked: {
        type: Boolean,
        default: false, 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Create the SSHKey model
const SSHKey = mongoose.model('SSHKey', sshKeySchema);

module.exports = SSHKey;