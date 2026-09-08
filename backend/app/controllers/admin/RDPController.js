const RDPPlan = require("../../models/RDPPlan");

// Create a new RDP plan
const createRDPPlan = async (req, res) => {
    try {
        const { name, cpu, ram, storage, networkSpeed, price, description, features } = req.body;

        // Check if a plan with the same name already exists
        const existingPlan = await RDPPlan.findOne({ name });
        if (existingPlan) {
            return res.status(400).json({ success: false, message: "Plan with this name already exists." });
        }

        const plan = await RDPPlan.create({ name, cpu, ram, storage, networkSpeed, price, description, features });
        res.json({ success: true, data: plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to create RDP plan" });
    }
};

// Update an existing RDP plan
const updateRDPPlan = async (req, res) => {
    try {
      const { plan_id } = req.params;
  
      if (!plan_id) {
        return res.status(400).json({ success: false, message: "Plan ID is required" });
      }
  
      const updatedPlan = await RDPPlan.findByIdAndUpdate(plan_id, req.body, { new: true });
  
      if (!updatedPlan) {
        return res.status(404).json({ success: false, message: "RDP Plan not found" });
      }
  
      res.json({ success: true, data: updatedPlan });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Failed to update RDP plan" });
    }
  };

// Delete an RDP plan
const deleteRDPPlan = async (req, res) => {
    try {
        const { plan_id } = req.params;
        const deletedPlan = await RDPPlan.findByIdAndDelete(plan_id);

        if (!deletedPlan) {
            return res.status(404).json({ success: false, message: "RDP Plan not found" });
        }

        res.json({ success: true, message: "RDP plan deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to delete RDP plan" });
    }
};

module.exports = {
    createRDPPlan,
    updateRDPPlan,
    deleteRDPPlan
};
