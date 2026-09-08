const SSHKey = require("../models/SSHKeys");
const cryptr = require("../services/cryptr");

// Add SSH keys data
async function getSSHDataMiddleware(req, res, next) {
	try {
		const user = req.user;
		const userId = user.id;
		const { sshKeyName } = req.body;
		const sshKeyDetails = await SSHKey.findOne({ userId, sshKeyName });
		if (!sshKeyDetails) {
			return res
				.status(404)
				.json({ message: "SSH key not found.", success: false });
		}
		req.userId = userId;
		req.sshKeyDetails = {
			...sshKeyDetails._doc,
			privateKey: cryptr.decrypt(sshKeyDetails.privateKey),
		};
		next();
	} catch (error) {
		console.error("Error fetching SSH key details:", error);
		return res
			.status(500)
			.json({ message: "Internal server error.", success: false });
	}
}

module.exports = { getSSHDataMiddleware };
