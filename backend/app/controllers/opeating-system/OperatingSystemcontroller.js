const OperatingSystem = require("../../models/OperatingSystem");

// ✅ Get All OS Records (User & Admin)
const getAllOS = async (req, res) => {
    try {
        const { cPanel } = req.query;

        // Fetch all OS records
        let osList = await OperatingSystem.find();

        // Apply filtering if cPanel compatibility is specified
        if (cPanel) {
            switch (cPanel.toLowerCase()) {
                case 'whm':
                    osList = osList.filter(os =>
                        ['ubuntu', 'rockylinux', 'almalinux'].includes(os.os_name.toLowerCase())
                    );
                    break;
                case 'plesk':
                    osList = osList.filter(os =>
                        ['ubuntu', 'win', 'centos'].includes(os.os_name.toLowerCase())
                    );
                    break;
            }
        }

        return res.status(200).json({ success: true, message: "OS list fetched successfully.", data: osList });

    } catch (error) {
        console.error("Error fetching OS list:", error);
        return res.status(500).json({ success: false, message: "Error fetching OS list.", details: error.message });
    }
};

const updateOS = async (req, res) => {
    try {
        const { os_id } = req.params;
        const { name, version, cloud, family, caption, os_name, price, priceDuration } = req.body;

        const os = await OperatingSystem.findById(os_id);
        if (!os) {
            return res.status(404).json({ success: false, message: "Operating System not found." });
        }

        // Update fields if provided
        if (name) os.name = name;
        if (version) os.version = version;
        if (cloud) os.cloud = cloud;
        if (family) os.family = family;
        if (caption) os.caption = caption;
        if (os_name) os.os_name = os_name;
        if (price !== undefined) os.price = price;
        if (priceDuration !== undefined) os.priceDuration = priceDuration;

        await os.save();
        return res.status(200).json({ success: true, message: "OS updated successfully.", data: os });

    } catch (error) {
        console.error("Error updating OS:", error);
        return res.status(500).json({ success: false, message: "Error updating OS.", details: error.message });
    }
}


module.exports = { getAllOS, updateOS };