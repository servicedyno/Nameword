const RDPInstance = require("../models/RDPInstance");

const validateUserOwnsRDPInstance = async (req, res, next) => {
  const rdpId = req.params.rdp_id;

  try {
    const rdp = await RDPInstance.findById(rdpId).populate("plan");
    if (!rdp) {
      return res.status(404).json({ success: false, message: "RDP instance not found." });
    }

    if (String(rdp.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not own this RDP server." });
    }

    // Attach instance to req for controller access
    req.rdpInstance = rdp;
    next();
  } catch (error) {
    console.error("❌ RDP ownership check failed:", error);
    return res.status(500).json({ success: false, message: "Failed to validate RDP access." });
  }
};

module.exports = {
  validateUserOwnsRDPInstance
};
