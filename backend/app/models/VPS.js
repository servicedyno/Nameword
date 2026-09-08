const mongoose = require('mongoose');

// Define the VPS schema
const VPSSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    label: {
        type: String,
        required: true,
    },
    vps_name: {
        type: String,
        required: true,
        unique: true,
    },
    zone: {
        type: String,
    },
    region: {
        type: String,
    },
    host: {
        type: String,
    },
    sourceImage: {
        type: String,
    },
    sshKeys: {
        type: [String], 
        default: [],
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

// Middleware to update the updatedAt field on save
VPSSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create the VM model
const VPS = mongoose.model('VPS', VPSSchema);

module.exports = VPS;