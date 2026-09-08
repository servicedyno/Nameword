const mongoose = require("mongoose");

const RDPPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  cpu: {
    type: Number,
    required: true,
  },
  ram: {
    type: Number,
    required: true,
  },
  storage: {
    type: {
      type: String,
      enum: ["HDD", "SSD"],
      required: true,
    },
    size: {
      type: Number,
      required: true, // in GB
    }
  },
  networkSpeed: {
    type: {
      type: String,
      enum: ["Mbps", "Gbps"],
      required: true,
    },
    speed: {
      type: Number,
      required: true,
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
  }
}, { timestamps: true });

module.exports = mongoose.model("RDPPlan", RDPPlanSchema);
