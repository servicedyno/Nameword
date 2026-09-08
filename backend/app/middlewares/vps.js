const { default: mongoose } = require("mongoose");
const VPS = require("../models/VPS");

// Add VPS Data
const getVPSMiddleware = async (req, res, next) => {

    const { vps_id } = req.params;
    console.log("###vps_id",vps_id)
    // Check if vps_id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(vps_id)) {
        return res.status(400).json({ success: false, message: 'Invalid VPS ID format.' });
    }

    let user;
    try {
        // Fetch the VPS details using userId
        const vps = await VPS.findOne({ _id: vps_id });
        if (!vps) {
            return res.status(404).json({ message: `VPS with ID ${vps_id} not found.`, success: false });
        }
        
        req.vps = vps;
        console.log("###vps", vps);
        next();
    } catch (err) {
        console.error(err); // Log the error for debugging
        return res.status(500).json({ message: 'An error occurred while processing your request.', success: false });
    }
}

module.exports = {
    getVPSMiddleware,
};