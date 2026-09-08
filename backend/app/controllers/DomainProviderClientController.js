const User = require("../models/User");
const {
	createDomainProviderClient,
	createClientOnBothProviders,
} = require("../services/domainProviderClient");

class DomainProviderClientController {
	/**
	 * Create a client on a specific domain provider
	 */
	async createClient(req, res) {
		try {
			const { provider = "both" } = req.query;
			const clientData = req.body;

			// Validate that user exists
			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}

			// Add user ID to client data
			clientData.Id = user._id.toString();

			let response;
			if (provider === "both") {
				response = await createClientOnBothProviders(clientData);
			} else {
				response = await createDomainProviderClient(
					clientData,
					provider
				);
			}

			// Update user with client information if successful
			if (
				response?.responseMsg?.statusCode === 200 &&
				response?.responseData
			) {
				const providerKey = response.provider || provider;
				const clientInfo = response.responseData;

				user.domainProviderClient[providerKey] = {
					clientId:
						clientInfo.clientId ||
						clientInfo.id ||
						clientInfo.customerId,
					username: clientData.UserName,
					createdAt: new Date(),
					status: "active",
				};

				await user.save();
			}

			return res.status(200).json(response);
		} catch (error) {
			console.error("Error creating domain provider client:", error);
			return res.status(500).json({
				message: "Failed to create client",
				error: error.message,
			});
		}
	}

	/**
	 * Get client information for the current user
	 */
	async getClientInfo(req, res) {
		try {
			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}

			return res.status(200).json({
				message: "Client information retrieved successfully",
				data: user.domainProviderClient,
			});
		} catch (error) {
			console.error("Error retrieving client information:", error);
			return res.status(500).json({
				message: "Failed to retrieve client information",
				error: error.message,
			});
		}
	}

	/**
	 * Update client status
	 */
	async updateClientStatus(req, res) {
		try {
			const { provider, status } = req.body;

			if (!provider || !status) {
				return res.status(400).json({
					message: "Provider and status are required",
				});
			}

			if (!["openprovider", "connectreseller"].includes(provider)) {
				return res.status(400).json({
					message:
						"Invalid provider. Must be openprovider or connectreseller",
				});
			}

			if (!["active", "inactive", "pending"].includes(status)) {
				return res.status(400).json({
					message:
						"Invalid status. Must be active, inactive, or pending",
				});
			}

			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}

			if (!user.domainProviderClient[provider]) {
				return res.status(404).json({
					message: `No client found for provider: ${provider}`,
				});
			}

			user.domainProviderClient[provider].status = status;
			await user.save();

			return res.status(200).json({
				message: "Client status updated successfully",
				data: user.domainProviderClient[provider],
			});
		} catch (error) {
			console.error("Error updating client status:", error);
			return res.status(500).json({
				message: "Failed to update client status",
				error: error.message,
			});
		}
	}

	/**
	 * Retry client creation for a specific provider
	 */
	async retryClientCreation(req, res) {
		try {
			const { provider } = req.params;

			if (!["openprovider", "connectreseller"].includes(provider)) {
				return res.status(400).json({
					message:
						"Invalid provider. Must be openprovider or connectreseller",
				});
			}

			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}

			// Prepare client data from user information
			const clientData = {
				FirstName: user.name.split(" ")[0] || user.name,
				LastName: user.name.split(" ").slice(1).join(" ") || "",
				UserName: user.username || user.email.split("@")[0],
				Password: Math.random().toString(36).slice(-8),
				CompanyName: "Individual",
				Address1: "Not provided",
				City: "Not provided",
				StateName: "Not provided",
				CountryName: "US",
				Zip: "00000",
				PhoneNo_cc: "+1",
				PhoneNo: user.mobile || "0000000000",
				Faxno_cc: "",
				FaxNo: "",
				Alternate_Phone_cc: "",
				Alternate_Phone: "",
				Id: user._id.toString(),
				email: user.email,
			};

			const response = await createDomainProviderClient(
				clientData,
				provider
			);

			// Update user with client information if successful
			if (
				response?.responseMsg?.statusCode === 200 &&
				response?.responseData
			) {
				const clientInfo = response.responseData;

				user.domainProviderClient[provider] = {
					clientId:
						clientInfo.clientId ||
						clientInfo.id ||
						clientInfo.customerId,
					username: clientData.UserName,
					createdAt: new Date(),
					status: "active",
				};

				await user.save();
			}

			return res.status(200).json(response);
		} catch (error) {
			console.error("Error retrying client creation:", error);
			return res.status(500).json({
				message: "Failed to retry client creation",
				error: error.message,
			});
		}
	}
}

module.exports = new DomainProviderClientController();
