const mongoose = require("mongoose");

const VPSDiskSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["pd-standard", "pd-balanced", "pd-ssd", "pd-extreme"],
        required: true,
        unique: true
    },
    level: {
        type: Number,
        required: true,
        unique: true
    },
    basePrice: {
        type: Number
    },
    label: {
        type: String,
    },
    description: {
        type: String,
    }
}, { timestamps: true });

const VPSDisk = mongoose.model("VPSDisk", VPSDiskSchema);
module.exports = VPSDisk;
