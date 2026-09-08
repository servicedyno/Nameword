const VpsPlan = require("../../models/VPSPlan");

// Create a New VPS Plan
const createVPSPlan = async (req, res) => {
    try {
        const { name, monthlyPrice, hourlyPrice, specs, level, upgrade_options, increment } = req.body;

        // Check if plan already exists
        const existingPlan = await VpsPlan.findOne({ name });

        if (existingPlan) {
            return res.status(400).json({ error: "VPS plan name already exists." });
        }

        const newPlan = new VpsPlan({
            name,
            monthlyPrice,
            hourlyPrice,
            specs,
            level,
            upgrade_options,
            increment
        });

        const savedPlan = await newPlan.save();
        res.status(201).json({
            success: true,
            message: "VPS plan created successfully.",
            data: savedPlan
        });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to create VPS plan", details: err.message });
    }
};

// Update an Existing VPS Plan
const updateVPSPlan = async (req, res) => {
    try {
        const { monthlyPrice, hourlyPrice, specs, level, increment, upgrade_options, name } = req.body;
        const { planId } = req.params;

        // Check if the plan to be updated exists
        const existingPlan = await VpsPlan.findById(planId);
        if (!existingPlan) {
            return res.status(404).json({ success: false, message: "VPS plan not found." });
        }

        // Check if another plan (excluding the current one) already has the same name
        if (name && name !== existingPlan.name) {
            const duplicatePlan = await VpsPlan.findOne({ name, _id: { $ne: planId } });
            if (duplicatePlan) {
                return res.status(400).json({
                    success: false,
                    message: `A VPS plan with the name '${name}' already exists. Please choose a different name.`
                });
            }
        }

        // Proceed with the update
        existingPlan.name = name || existingPlan.name;
        existingPlan.monthlyPrice = monthlyPrice ?? existingPlan.monthlyPrice;
        existingPlan.hourlyPrice = hourlyPrice ?? existingPlan.hourlyPrice;
        existingPlan.specs = specs || existingPlan.specs;
        existingPlan.level = level ?? existingPlan.level;
        existingPlan.upgrade_options = upgrade_options || existingPlan.upgrade_options;
        existingPlan.increment = increment || existingPlan.increment;

        const updatedPlan = await existingPlan.save();

        return res.status(200).json({
            success: true,
            message: "VPS plan updated successfully.",
            data: updatedPlan
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to update VPS plan.",
            details: err.message
        });
    }
};

// Delete a VPS Plan
const deleteVPSPlan = async (req, res) => {
    try {
        const deletedPlan = await VpsPlan.findByIdAndDelete(req.params.planId);

        if (!deletedPlan) {
            return res.status(404).json({ error: "VPS plan not found." });
        }

        res.json({ status: true, message: "VPS plan deleted successfully." });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete VPS plan", details: err.message });
    }
};

module.exports = {
    createVPSPlan,
    updateVPSPlan,
    deleteVPSPlan
};
