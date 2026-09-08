const { getDiskCostDetails } = require("../../helpers/computeEngineHelper");
const VPSDisk = require("../../models/VPSDisk");

const getAllVPSDisks = async (req, res) => {
    try {
        // Fetch all disks and sort by level in ascending order
        const { region = "us-central1" } = req.query;
        const disks = await VPSDisk.find().sort({ level: 1 });

        // Fetch disk pricing details
        const diskTypes = disks.map(disk => disk.type);
        const skus = await getDiskCostDetails(diskTypes, region);

        // Create an array of disks with multiple upgrade options and SKU pricing
        const disksWithGCPPrice = disks.map((disk, index) => {

            // Find matching SKU for the current disk
            const matchingSku = skus.find(sku => sku.diskType === disk.type) || {};

            return {
                value: disk.type,
                ...disk.toObject(),
                pricePerGBMonthly: matchingSku.pricePerGBMonthly || "N/A",
                pricePerGBHourly: matchingSku.pricePerGBHourly || "N/A",
            };
        });

        res.status(200).json({
            success: true,
            message: "Fetched all VPS disks successfully.",
            data: disksWithGCPPrice
        });
    } catch (error) {
        console.error("Error fetching VPS disks:", error);
        res.status(500).json({
            success: false,
            message: `Error fetching VPS disks: ${error.message}`
        });
    }
};

const updateVPSDisk = async (req, res) => {
    const { disk_id } = req.params;
    try {
        const disk = await VPSDisk.findById(disk_id);
        if (!disk) {
            return res.status(404).json({
                success: false,
                message: "Disk not found."
            });
        }

        // Update fields if provided
        const { type, level, basePrice, label, description } = req.body;
        if (type) disk.type = type;
        if (level) disk.level = level;
        if (basePrice !== undefined) disk.basePrice = basePrice;
        if (label) disk.label = label;
        if (description) disk.description = description;

        await disk.save();
        res.status(200).json({
            success: true,
            message: "Disk updated successfully.",
            data: disk
        });
    } catch (error) {
        console.error("Error updating disk:", error);
        res.status(500).json({
            success: false,
            message: `Error updating disk: ${error.message}`
        });
    }
};

module.exports = {
    getAllVPSDisks,
    updateVPSDisk
};
