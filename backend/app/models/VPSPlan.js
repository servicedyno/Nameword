const mongoose = require("mongoose");

const VpsPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  specs: {
    vCPU: {
      type: Number,
      required: true
    },
    RAM: {
      type: Number,
      required: true
    },
    disk: {
      type: Number,
      required: true
    },
    machineType: {
      type: String,
      default: "e2-standard-8"
    }
  },
  increment: { 
    unit: { 
      type: String,
      enum: ['percentage', 'currency'],
      default: 'percentage',
      required: true
    },
    value: { 
      type: Number,
      default: 0,
      required: true
    }
  },
  level: {
    type: Number,
    required: true
  }
}, { timestamps: true });

const VpsPlan = mongoose.model("VpsPlan", VpsPlanSchema);
module.exports = VpsPlan;
