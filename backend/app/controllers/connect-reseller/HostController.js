const apiClient = require("../../utils/apiclient");
const domainProviderApiClient = require("../../utils/domainProviderApiClient");
const Domain = require("../../models/Domain");

class HostController {
	async addChildNameServer(req, res, next) {
		let { domainNameId, websiteName, hostName, ipAddress, provider } =
			req.query;

		// Get provider from domain data if not provided
		let domainData = await Domain.findOne({ websiteName: websiteName, deletedAt: { $eq: null } });
		const actualProvider = domainData?.provider || provider || "hostbay";

		// For HostBay, use DNS A records instead of dedicated child nameserver API
		if (actualProvider === "hostbay") {
			try {
				// Extract just the host part (e.g., "ns1" from "ns1.example.com")
				let hostPart = hostName;
				if (hostName.includes(".")) {
					hostPart = hostName.split(".")[0];
				}

				// Create an A record for the child nameserver
				const response = await domainProviderApiClient.request(
					"AddDNSRecord",
					{
						WebsiteName: websiteName,
						RecordName: hostPart, // Just the subdomain part
						RecordType: "A",
						RecordValue: ipAddress,
						RecordTTL: 3600,
					},
					"POST",
					actualProvider
				);

				return res.status(200).json({
					responseMsg: {
						statusCode: 200,
						message: "Child nameserver created successfully via DNS A record",
					},
					responseData: {
						hostname: hostName,
						ipAddress: ipAddress,
					},
					provider: "hostbay",
				});
			} catch (error) {
				console.error("Error creating child nameserver via DNS:", error);
				return res.status(error?.response?.status || 500).json({
					responseMsg: {
						statusCode: error?.response?.status || 500,
						message: error?.response?.data?.message || "Failed to create child nameserver",
					},
					responseData: null,
					providerError: error?.response?.data,
				});
			}
		}

		// For OpenProvider and other providers, need to get existing nameservers first
		const detail = await domainProviderApiClient.request(
			"ViewDomain",
			{ websiteName, domainId: domainNameId },
			null,
			actualProvider
		);

		console.log("detail =============>", detail);
		let nameServer = [];
		if (actualProvider == "openprovider") {
			nameServer = detail.responseData.nameServers || [];
			nameServer.push({
				ip: ipAddress,
				name: hostName,
			});
		}

		console.log("nameServer =============>", nameServer);
		const response = await domainProviderApiClient.request(
			"AddChildNameServer",
			{
				domainNameId,
				websiteName,
				hostName,
				ipAddress,
				nameServer,
			},
			"POST",
			actualProvider
		);
		return res.status(200).json(response);
	}

	async modifyChildNameServerIP(req, res, next) {
		let {
			domainNameId,
			websiteName,
			hostName,
			newIpAddress,
			oldIpAddress,
			provider,
		} = req.query;

		// Get provider from domain data if not provided
		let domainData = await Domain.findOne({ websiteName: websiteName, deletedAt: { $eq: null } });
		const actualProvider = domainData?.provider || provider || "hostbay";

		// For HostBay, use DNS A records to modify child nameserver IP
		if (actualProvider === "hostbay") {
			try {
				// Extract host part
				let hostPart = hostName;
				if (hostName.includes(".")) {
					hostPart = hostName.split(".")[0];
				}

				// First, get the DNS record ID by fetching records
				const dnsResponse = await domainProviderApiClient.request(
					"ViewDNSRecord",
					{ WebsiteName: websiteName },
					"GET",
					actualProvider
				);

				const records = dnsResponse?.responseData?.records || dnsResponse?.responseData || [];
				const record = records.find(r => {
					const recordName = r.name || r.hostname || "";
					const recordType = r.type || r.recordType || "";
					return recordName === hostPart && recordType === "A";
				});

				if (!record) {
					return res.status(404).json({
						responseMsg: {
							statusCode: 404,
							message: "Child nameserver DNS record not found",
						},
						responseData: null,
					});
				}

				// Update the DNS A record
				const response = await domainProviderApiClient.request(
					"ModifyDNSRecord",
					{
						WebsiteName: websiteName,
						RecordName: hostPart,
						RecordType: "A",
						RecordValue: newIpAddress,
						RecordTTL: record.ttl || 3600,
						OldRecordName: hostPart,
						OldRecordType: "A",
						OldRecordValue: oldIpAddress,
						RecordID: record.id || record.recordId,
					},
					"PUT",
					actualProvider
				);

				return res.status(200).json({
					responseMsg: {
						statusCode: 200,
						message: "Child nameserver IP updated successfully",
					},
					responseData: response?.responseData || {
						hostname: hostName,
						ipAddress: newIpAddress,
					},
				});
			} catch (error) {
				console.error("Error updating child nameserver IP:", error);
				return res.status(error?.response?.status || 500).json({
					responseMsg: {
						statusCode: error?.response?.status || 500,
						message: error?.response?.data?.message || "Failed to update child nameserver IP",
					},
					responseData: null,
					providerError: error?.response?.data,
				});
			}
		}

		// For OpenProvider and other providers, need to get existing nameservers first
		const detail = await domainProviderApiClient.request(
			"ViewDomain",
			{ websiteName, domainId: domainNameId },
			null,
			actualProvider
		);

		let nameServer = [];
		if (actualProvider == "openprovider") {
			nameServer = detail.responseData.nameServers || [];
			nameServer = nameServer.map((ns) => {
				if (ns?.ip === oldIpAddress && ns?.name === hostName) {
					return { ...ns, ip: newIpAddress };
				}
				return ns;
			});
		}                                                                            

		const response = await domainProviderApiClient.request(
			"ModifyChildNameServerIP",
			{
				domainNameId,
				websiteName,
				hostName,
				newIpAddress,
				oldIpAddress,
				nameServer,
			},
			"PUT",
			actualProvider
		);
		return res.status(200).json(response);
	}

	async modifyChildNameServerHost(req, res, next) {
		let {
			domainNameId,
			websiteName,
			oldHostName,
			newHostName,
			provider,
		} = req.query;

		// Get provider from domain data if not provided
		let domainData = await Domain.findOne({ websiteName: websiteName, deletedAt: { $eq: null } });
		const actualProvider = domainData?.provider || provider || "hostbay";

		// For HostBay, use DNS A records to modify child nameserver hostname
		if (actualProvider === "hostbay") {
			try {
				// Extract host parts
				let oldHostPart = oldHostName;
				if (oldHostName.includes(".")) {
					oldHostPart = oldHostName.split(".")[0];
				}
				let newHostPart = newHostName;
				if (newHostName.includes(".")) {
					newHostPart = newHostName.split(".")[0];
				}

				// Get the DNS record to find its IP
				const dnsResponse = await domainProviderApiClient.request(
					"ViewDNSRecord",
					{ WebsiteName: websiteName },
					"GET",
					actualProvider
				);

				const records = dnsResponse?.responseData?.records || dnsResponse?.responseData || [];
				const oldRecord = records.find(r => {
					const recordName = r.name || r.hostname || "";
					const recordType = r.type || r.recordType || "";
					return recordName === oldHostPart && recordType === "A";
				});

				if (!oldRecord) {
					return res.status(404).json({
						responseMsg: {
							statusCode: 404,
							message: "Child nameserver DNS record not found",
						},
						responseData: null,
					});
				}

				const ipAddress = oldRecord.content || oldRecord.value || "";

				// Delete old A record
				await domainProviderApiClient.request(
					"DeleteDNSRecord",
					{
						WebsiteName: websiteName,
						RecordName: oldHostPart,
						RecordType: "A",
						RecordValue: ipAddress,
						RecordID: oldRecord.id || oldRecord.recordId,
					},
					"DELETE",
					actualProvider
				);

				// Create new A record with new hostname
				const response = await domainProviderApiClient.request(
					"AddDNSRecord",
					{
						WebsiteName: websiteName,
						RecordName: newHostPart,
						RecordType: "A",
						RecordValue: ipAddress,
						RecordTTL: oldRecord.ttl || 3600,
					},
					"POST",
					actualProvider
				);

				return res.status(200).json({
					responseMsg: {
						statusCode: 200,
						message: "Child nameserver hostname updated successfully",
					},
					responseData: response?.responseData || {
						hostname: newHostName,
						ipAddress: ipAddress,
					},
				});
			} catch (error) {
				console.error("Error updating child nameserver hostname:", error);
				return res.status(error?.response?.status || 500).json({
					responseMsg: {
						statusCode: error?.response?.status || 500,
						message: error?.response?.data?.message || "Failed to update child nameserver hostname",
					},
					responseData: null,
					providerError: error?.response?.data,
				});
			}
		}

		// For OpenProvider and other providers, need to get existing nameservers first
		const detail = await domainProviderApiClient.request(
			"ViewDomain",
			{ websiteName, domainId: domainNameId },
			null,
			actualProvider
		);

		let nameServer = [];
		if (actualProvider == "openprovider") {
			nameServer = detail.responseData.nameServers || [];
			nameServer = nameServer.map((ns) => {
				if (ns?.name === oldHostName) {
					return { ...ns, name: newHostName };
				}
				return ns;
			});
		}

		const response = await domainProviderApiClient.request(
			"ModifyChildNameServerHostname",
			{
				domainNameId,
				websiteName,
				oldHostName,
				newHostName,
				nameServer,
			},
			"PUT",
			actualProvider
		);
		return res.status(200).json(response);
	}

	async deleteChildNameServer(req, res, next) {
		let { domainNameId, websiteName, hostName, provider } = req.query;

		// Get provider from domain data if not provided
		let domainData = await Domain.findOne({ websiteName: websiteName, deletedAt: { $eq: null } });
		const actualProvider = domainData?.provider || provider || "hostbay";

		// For HostBay, use DNS A records to delete child nameserver
		if (actualProvider === "hostbay") {
			try {
				// Extract host part (e.g., "ns1" from "ns1.example.com")
				let hostPart = hostName;
				if (hostName.includes(".")) {
					hostPart = hostName.split(".")[0];
				}

				// Get the DNS record to find its ID and value
				const dnsResponse = await domainProviderApiClient.request(
					"ViewDNSRecord",
					{ WebsiteName: websiteName },
					"GET",
					actualProvider
				);

				const records = dnsResponse?.responseData?.records || dnsResponse?.responseData || [];
				
				// Find the record - HostBay might return name as full FQDN or just subdomain
				const record = records.find(r => {
					const recordName = r.name || r.hostname || "";
					const recordType = r.type || r.recordType || "";
					
					// Check if it's an A record and matches either:
					// 1. Exact match with hostPart (e.g., "ns1")
					// 2. Full hostname match (e.g., "ns1.example.com")
					// 3. Ends with hostPart (e.g., "ns1.example.com" ends with "ns1" when domain is removed)
					if (recordType !== "A") return false;
					
					// Remove domain from record name if it's a full FQDN
					let recordHostPart = recordName;
					if (recordName.includes(".")) {
						recordHostPart = recordName.split(".")[0];
					}
					
					return recordHostPart === hostPart || recordName === hostName || recordName === hostPart;
				});

				if (!record) {
					// Log for debugging
					console.log("DNS records found:", records.map(r => ({ name: r.name, type: r.type })));
					console.log("Looking for hostPart:", hostPart, "hostName:", hostName);
					
					return res.status(404).json({
						responseMsg: {
							statusCode: 404,
							message: `Child nameserver DNS record not found for ${hostName}`,
						},
						responseData: null,
					});
				}

				// Extract the record name for deletion (HostBay expects just the subdomain part)
				const recordNameForDelete = record.name?.includes(".") 
					? record.name.split(".")[0] 
					: (record.name || hostPart);

				// Delete the DNS A record
				const response = await domainProviderApiClient.request(
					"DeleteDNSRecord",
					{
						WebsiteName: websiteName,
						RecordName: recordNameForDelete,
						RecordType: "A",
						RecordValue: record.value || record.content,
						RecordID: record.id || record.record_id,
					},
					"DELETE",
					actualProvider
				);

				return res.status(200).json({
					responseMsg: {
						statusCode: 200,
						message: "Child nameserver deleted successfully",
					},
					responseData: response?.responseData || null,
				});
			} catch (error) {
				console.error("Error deleting child nameserver:", error);
				return res.status(error?.response?.status || 500).json({
					responseMsg: {
						statusCode: error?.response?.status || 500,
						message: error?.response?.data?.message || "Failed to delete child nameserver",
					},
					responseData: null,
					providerError: error?.response?.data,
				});
			}
		}

		// For OpenProvider and other providers, need to get existing nameservers first
		const detail = await domainProviderApiClient.request(
			"ViewDomain",
			{ websiteName, domainId: domainNameId },
			null,
			actualProvider
		);

		let nameServer = [];
		if (actualProvider == "openprovider") {
			nameServer = detail.responseData.nameServers || [];
			nameServer = nameServer.filter((ns) => ns?.name !== hostName);
		}

		const response = await domainProviderApiClient.request(
			"DeleteChildNameServer",
			{
				domainNameId,
				websiteName,
				hostName,
				nameServer,
			},
			"DELETE",
			actualProvider
		);
		return res.status(200).json(response);
	}

	async getChildNameServer(req, res, next) {
		let { domainNameId, websiteName, provider } = req.query;

		// Get provider from domain data if not provided
		let domainData = await Domain.findOne({ websiteName: websiteName, deletedAt: { $eq: null } });
		const actualProvider = domainData?.provider || provider || "hostbay";

		// For HostBay, fetch DNS records and filter for A records that look like nameservers
		if (actualProvider === "hostbay") {
			try {
				// Get all DNS records
				const dnsResponse = await domainProviderApiClient.request(
					"ViewDNSRecord",
					{
						WebsiteName: websiteName,
					},
					"GET",
					actualProvider
				);

				const records = dnsResponse?.responseData?.records || dnsResponse?.responseData || [];
				
				// Filter A records that match nameserver patterns (ns1, ns2, ns3, etc.)
				const childNameservers = records
					.filter(record => {
						const name = record.name || record.hostname || "";
						const type = record.type || record.recordType || "";
						
						if (type !== "A") return false;
						
						// Extract just the host part for pattern matching
						let hostPart = name;
						if (name.includes(".")) {
							hostPart = name.split(".")[0];
						}
						
						// Match patterns like ns1, ns2, nameserver1, etc.
						return /^ns\d+|^nameserver\d+/i.test(hostPart);
					})
					.map(record => {
						const recordName = record.name || record.hostname || "";
						// Extract host part (e.g., "ns1" from "ns1.example.com")
						let hostPart = recordName;
						if (recordName.includes(".")) {
							hostPart = recordName.split(".")[0];
						}
						
						// Construct full hostname
						const fullHostname = recordName.includes(".") 
							? recordName 
							: `${hostPart}.${websiteName}`;
						
						return {
							hostname: fullHostname,
							host: hostPart,
							ipAddress: record.value || record.content || record.ip,
							ip: record.value || record.content || record.ip,
						};
					});

				return res.status(200).json({
					responseMsg: {
						statusCode: 200,
						message: "Success",
					},
					responseData: {
						childNameservers: childNameservers,
					},
					provider: "hostbay",
				});
			} catch (error) {
				console.error("Error fetching child nameservers:", error);
				return res.status(error?.response?.status || 500).json({
					responseMsg: {
						statusCode: error?.response?.status || 500,
						message: error?.response?.data?.message || "Failed to fetch child nameservers",
					},
					responseData: { childNameservers: [] },
					providerError: error?.response?.data,
				});
			}
		}

		const response = await domainProviderApiClient.request(
			"getchildnameservers",
			{
				id: domainNameId,
			},
			null,
			actualProvider
		);
		return res.status(200).json(response);
	}
}

module.exports = new HostController();
