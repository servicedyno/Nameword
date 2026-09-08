const mongoose = require('mongoose');

const RDPInstanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  title: {
    type: String,
  },
  hostname: {
    type: String,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RDPPlan',
    required: true,
  },
  os_uuid: {
    type: String,
    required: true,
  },
  serverId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Auto-update timestamp
RDPInstanceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const RDPInstance = mongoose.model('RDPInstance', RDPInstanceSchema);
module.exports = RDPInstance;
