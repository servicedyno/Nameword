const User = require("../../models/User");

const checkMissingEmail = async (req, res) => {
    try {
        const { _id } = req.user;

        // Find user by id
        const user = await User.findById(_id).select('-password -banned');

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if the email field exists and is valid
        if (!user.email) {
            return res.status(200).json({
                success: false,
                missingEmail: true,
                message: "Email is missing. Please update your email.",
            });
        }

        // If email exists, return success response
        return res.status(200).json({
            success: true,
            missingEmail: false,
            message: "Email is present.",
            email: user.email,
            data: user.toObject(),
        });

    } catch (error) {
        console.error("Error in checkMissingEmail:", error);
        res.status(500).json({ success: false, message: "Something went wrong", details: error.messsage });
    }
};

const updateUser = async (req, res) => {
    try {
        const { _id } = req.user;
        const { name, email, banned } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (banned) updateData.banned = banned;

        const updatedUser = await User.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true, select: "-password" }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json({ message: "User updated successfully.", user: updatedUser });

    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

module.exports = { checkMissingEmail, updateUser };