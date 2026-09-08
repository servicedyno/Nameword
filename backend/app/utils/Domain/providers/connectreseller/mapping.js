const connectresellerMappings = {
	checkdomainavailable: { method: "GET", path: "checkdomainavailable" },
	domainSuggestion: { method: "GET", path: "domainSuggestion" },
	getTldSuggestion: { method: "GET", path: "getTldSuggestion" },
	checkDomainPrice: { method: "GET", path: "checkDomainPrice" },
	domainorder: { method: "GET", path: "domainorder" },
	ViewDomain: { method: "GET", path: "ViewDomain" },
	TransferOrder: { method: "GET", path: "TransferOrder" },
	CancelTransfer: { method: "GET", path: "CancelTransfer" },
	syncTransfer: { method: "GET", path: "syncTransfer" },
	RenewalOrder: { method: "GET", path: "RenewalOrder" },
	UpdateNameServer: { method: "GET", path: "UpdateNameServer" },
	updateAuthCode: { method: "GET", path: "updateAuthCode" },
	ManageDomainLock: { method: "GET", path: "ManageDomainLock" },
	ManageDomainPrivacyProtection: {
		method: "GET",
		path: "ManageDomainPrivacyProtection",
	},
	ViewEPPCode: { method: "GET", path: "ViewEPPCode" },
	ManageDNSRecords: { method: "GET", path: "ManageDNSRecords" },
	// AddClient: { method: "GET", path: "AddClient" },
	AddClient: {
		method: "GET",
		path: "AddClient",
		params: (p) => ({
			Name: p.Name,
			userName: p.userName,
			password: p.password,
			companyName: p.companyName,
			Address1: p.Address1,
			city: p.city,
			stateName: p.stateName,
			CountryName: p.CountryName,
			zip: p.zip,
			phoneNo_cc: p.phoneNo_cc,
			phoneNo: p.phoneNo,
			faxNo_cc: p.faxNo_cc || "",
			faxNo: p.faxNo || "",        
			alternatePhone_cc: p.alternatePhone_cc || "",
			alternatePhone: p.alternatePhone || "",   
		}),                                             
	},                                        

	AddDNSRecord: { method: "GET", path: "AddDNSRecord" },
	ModifyDNSRecord: { method: "GET", path: "ModifyDNSRecord" },
	DeleteDNSRecord: { method: "GET", path: "DeleteDNSRecord" },
	ViewDNSRecord: { method: "GET", path: "ViewDNSRecord" },

	SetDomainForwarding: { method: "GET", path: "SetDomainForwarding" },
	GetDomainForwarding: { method: "GET", path: "GetDomainForwarding" },
	updatedomainforwarding: { method: "GET", path: "updatedomainforwarding" },
	deletedomainforwarding: { method: "GET", path: "deletedomainforwarding" },
	AddChildNameServer: { method: "GET", path: "AddChildNameServer" },
	ModifyChildNameServerIP: { method: "GET", path: "ModifyChildNameServerIP" },
	ModifyChildNameServerHostname: {
		method: "GET",
		path: "ModifyChildNameServerHostname",
	},
	DeleteChildNameServer: { method: "GET", path: "DeleteChildNameServer" },
	getchildnameservers: { method: "GET", path: "getchildnameservers" },
	AddDNSSec: { method: "POST", path: "AddDNSSec" },
	DeleteDNSSec: { method: "POST", path: "DeleteDNSSec" },
	GetDNSSec: { method: "GET", path: "GetDNSSec" },

	// Contact management mappings based on official documentation
	AddRegistrantContact: {
		method: "GET",
		path: "AddRegistrantContact",
		params: (p) => ({
			Name: p.Name || p.name || `${p.firstName} ${p.lastName}`,
			EmailAddress: p.EmailAddress || p.email,
			CompanyName: p.CompanyName || p.companyName || "",
			Address: p.Address || p.address,
			City: p.City || p.city,
			StateName: p.StateName || p.stateName || p.state || "",
			CountryName: p.CountryName || p.countryName || p.country,
			Zip: p.Zip || p.zip,
			PhoneNo_cc: p.PhoneNo_cc || p.phoneCountryCode || "+1",
			PhoneNo: p.PhoneNo || p.phone,
			Faxno_cc: p.Faxno_cc || p.faxCountryCode || "",
			FaxNo: p.FaxNo || p.fax || "",
			Alternate_Phone_cc:
				p.Alternate_Phone_cc || p.alternatePhoneCountryCode || "",
			Alternate_Phone: p.Alternate_Phone || p.alternatePhone || "",
			Id: p.Id || p.clientId,
		}),
	},

	ModifyRegistrantContact: {
		method: "GET",
		path: "ModifyRegistrantContact",
		params: (p) => ({
			Name: p.Name || p.name || `${p.firstName} ${p.lastName}`,
			EmailAddress: p.EmailAddress || p.email,
			CompanyName: p.CompanyName || p.companyName || "",
			Address: p.Address || p.address,
			City: p.City || p.city,
			StateName: p.StateName || p.stateName || p.state || "",
			CountryName: p.CountryName || p.countryName || p.country,
			Zip: p.Zip || p.zip,
			PhoneNo_cc: p.PhoneNo_cc || p.phoneCountryCode || "+1",
			PhoneNo: p.PhoneNo || p.phone,
			Faxno_cc: p.Faxno_cc || p.faxCountryCode || "",
			FaxNo: p.FaxNo || p.fax || "",
			Alternate_Phone_cc:
				p.Alternate_Phone_cc || p.alternatePhoneCountryCode || "",
			Alternate_Phone: p.Alternate_Phone || p.alternatePhone || "",
			RegistrantContactId: p.RegistrantContactId || p.contactId,
		}),
	},

	ViewRegistrant: {
		method: "GET",
		path: "ViewRegistrant",
		params: (p) => ({
			RegistrantContactId: p.RegistrantContactId || p.contactId,
		}),
	},

	// Domain contact assignment based on official documentation
	ModifyDomainContact: {
		method: "GET",
		path: "updatecontact",
		params: (p) => ({
			domainNameId: p.domainNameId,
			websiteName: p.websiteName || p.domainName,
			adminContactId: p.adminContactId,
			billingContactId: p.billingContactId,
			registrantContactId: p.registrantContactId,
			technicalContactId: p.technicalContactId,
		}),
	},

	// Get domain info to extract domainNameId and current contact IDs
	GetDomainInfo: {
		method: "GET",
		path: "ViewDomain",
		params: (p) => ({
			UserName: p.userName,
			DomainName: p.domainName,
		}),
	},

	// Legacy mappings for backward compatibility - keeping existing working endpoints
	GetContactDetails: {
		method: "GET",
		path: "GetContactDetails",
		params: (p) => ({
			UserName: p.userName,
			ContactId: p.contactId,
		}),
	},

	UpdateContact: {
		method: "POST",
		path: "UpdateContact",
		params: (p) => ({
			UserName: p.userName,
			ContactId: p.contactId,
			FirstName: p.FirstName || p.firstName,
			LastName: p.LastName || p.lastName,
			EmailAddress: p.EmailAddress || p.email,
			Address: p.Address || p.address,
			City: p.City || p.city,
			StateName: p.StateName || p.state,
			CountryCode: p.CountryCode || p.country,
			ZipCode: p.ZipCode || p.zip,
			PhoneNo: p.PhoneNo || p.phone,
			CompanyName: p.CompanyName || p.companyName || "",
			FaxNo: p.FaxNo || p.fax || "",
			AlternatePhone: p.AlternatePhone || p.alternatePhone || "",
		}),
	},

	DeleteContact: {
		method: "POST",
		path: "DeleteContact",
		params: (p) => ({
			ContactId: p.contactId,
		}),
	},

	// Hosting Plans
	GetHostingPlans: { method: "GET", path: "GetHostingPlans" },
};

module.exports = connectresellerMappings;
