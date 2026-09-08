const mongoose = require('mongoose');

// Define the VM schema
const vmSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    instanceName: {
        type: String,
        required: true,
        unique: true,
    },
    zone: {
        type: String,
    },
    autoRenewable: {
        type: Boolean,
        default: false,
    },
    plan: {
        type: String,
    },
    planPrice: {
        type: Number,
    },
    osPrice: {
        type: Number,
    },
    cpanelPrice: {
        type: Number,
    },
    vCPUs: {
        type: Number,
    },
    RAM: {
        type: Number,
    },
    disk: {
        type: Number,
    },
    diskType: {
        type: String,
    },
    os: {
        type: String,
    },
    cPanel: {
        type: String
    },
    license: {
        type: String,
    },
    billingCycle: {
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

// Create the VM model
const VM = mongoose.model('VM', vmSchema);

module.exports = VM;