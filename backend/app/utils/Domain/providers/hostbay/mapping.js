const hostbayMappings = {
    // Domain Registration
    domainorder: {
        method: "POST",
        path: "/domains/register",
        params: (p) => {
            // Debug log to see what parameters are coming in
            console.log("HostBay params received:", p);

            return {
                domain_name: p.Websitename || p.websiteName || p.domain_name || p.domain,
                period: Number(p.Duration || p.period || 1),
                privacy_protection:
                    p.IsWhoisProtection === "true" ||
                    p.IsWhoisProtection === true ||
                    p.isWhoisProtection === "true" ||
                    p.isWhoisProtection === true ||
                    p.privacy_protection === true ||
                    false,
                auto_renew: p.auto_renew || false,
                use_hostbay_contacts: p.use_hostbay_contacts !== false, // Default to true, but can be overridden
            };
        },
    },
    
    // Domain Availability Check
    checkdomainavailable: {
        method: "GET",
        path: "/domains/availability",
        params: (p) => ({
            domain: p.websiteName,
        }),
    },

    // Domain Price
    checkDomainPrice: {
        method: "GET",
        path: "/domains/pricing",
        params: (p) => ({
            domain: p.websiteName,
        }),
    },

    // Domain Transfer
    TransferOrder: {
        method: "POST",
        path: "/domains/transfer",
        params: (p) => {
            const domain =
                p.domain_name ||
                p.domainName ||
                p.Websitename ||
                p.websiteName ||
                p.domain ||
                "";

            const normalizeBoolean = (value, fallback = false) => {
                if (typeof value === "boolean") return value;
                if (typeof value === "string") {
                    const normalized = value.trim().toLowerCase();
                    if (normalized === "true") return true;
                    if (normalized === "false") return false;
                }
                return fallback;
            };

            return {
                domain_name: domain.toString().trim().toLowerCase(),
                auth_code:
                    p.auth_code ||
                    p.authCode ||
                    p.AuthCode ||
                    p.epp_code ||
                    p.eppCode ||
                    "",
                period: Number(p.period || p.Duration || p.transferPeriod || 1),
                auto_renew: normalizeBoolean(
                    p.auto_renew ?? p.autoRenew ?? p.autoRenewal,
                    false
                ),
            };
        },
    },

    ApproveTransfer: {
        method: "POST",
        path: (p) => {
            const domain =
                p.domain_name ||
                p.domainName ||
                p.Websitename ||
                p.websiteName ||
                p.domain ||
                "";
            return `/domains/${domain.toString().trim().toLowerCase()}/transfer/approve`;
        },
        params: (p) => {
            const registrarTag =
                p.registrar_tag || p.registrarTag || p.RegistrarTag || null;
            return registrarTag
                ? {
                        registrar_tag: registrarTag,
                  }
                : {};
        },
    },

    RejectTransfer: {
        method: "POST",
        path: (p) => {
            const domain =
                p.domain_name ||
                p.domainName ||
                p.Websitename ||
                p.websiteName ||
                p.domain ||
                "";
            return `/domains/${domain.toString().trim().toLowerCase()}/transfer/reject`;
        },
        params: () => ({}),
    },

    RestartTransfer: {
        method: "POST",
        path: (p) => {
            const domain =
                p.domain_name ||
                p.domainName ||
                p.Websitename ||
                p.websiteName ||
                p.domain ||
                "";
            return `/domains/${domain.toString().trim().toLowerCase()}/transfer/restart`;
        },
        params: () => ({}),
    },

    // Get domain transfer status
    TransferStatus: {
        method: "GET",
        path: (p) => {
            const domain =
                p.domain_name ||
                p.domainName ||
                p.Websitename ||
                p.websiteName ||
                p.domain ||
                "";
            return `/domains/${domain.toString().trim().toLowerCase()}/transfer/status`;
        },
        params: () => ({}),
    },

    // Renew domain registration
    RenewalOrder: {
        method: "POST",
        path: (p) => `/domains/${p.Websitename || p.websiteName || p.domain_name}/renew`,
        params: (p) => ({
            period: Number(p.Duration || p.period || 1),
        }),
    },

    // Get domain contacts - HostBay might have a separate endpoint
    GetDomainContacts: {
        method: "GET",
        path: (p) => `/domains/${p.domain_name || p.websiteName}/contacts`,
        params: (p) => ({}),
    },

    // Update domain contacts
    updateDomainContacts: {
        method: "PUT",
        path: (p) => `/domains/${p.domain_name || p.websiteName}/contacts`,
        params: (p) => {
            // HostBay expects contacts in the request body
            // Structure: { registrant: {...}, admin: {...}, tech: {...}, billing: {...} }
            const contacts = {};
            
            // Handle both nested (p.contacts) and flat (p.registrant, p.admin, etc.) structures
            if (p.contacts) {
                // Nested structure
                if (p.contacts.registrant) contacts.registrant = p.contacts.registrant;
                if (p.contacts.admin) contacts.admin = p.contacts.admin;
                if (p.contacts.tech || p.contacts.technical) contacts.tech = p.contacts.tech || p.contacts.technical;
                if (p.contacts.billing) contacts.billing = p.contacts.billing;
            } else {
                // Flat structure
                if (p.registrant) contacts.registrant = p.registrant;
                if (p.admin) contacts.admin = p.admin;
                if (p.tech || p.technical) contacts.tech = p.tech || p.technical;
                if (p.billing) contacts.billing = p.billing;
            }
            
            return contacts;
        },
    },

    ManageDomainLock: {
        method: "POST",
        path: (p) => {
            const domain = (
                p.Websitename ||
                p.websiteName ||
                p.domain_name ||
                p.domain ||
                p.domainName ||
                ""
            )
                .toString()
                .trim()
                .toLowerCase();
            const rawLockValue = p.isDomainLocked;
            const shouldLock =
                typeof rawLockValue === "string"
                    ? rawLockValue.trim().toLowerCase() === "true"
                    : Boolean(rawLockValue);
            const action = shouldLock ? "lock" : "unlock";
            return `/domains/${domain}/${action}`;
        },
        params: () => ({}),
    },

    updateAuthCode: {
        method: "POST",
        path: (p) => {
            const domain = (
                p.Websitename ||
                p.websiteName ||
                p.domain_name ||
                p.domain ||
                p.domainName ||
                ""
            )
                .toString()
                .trim()
                .toLowerCase();
            return `/domains/${domain}/auth-code/reset`;
        },
        params: () => ({}),
    },
    GetAuthCode: {
        method: "GET",
        path: (p) => {
            const domain = (
                p.Websitename ||
                p.websiteName ||
                p.domain_name ||
                p.domain ||
                p.domainName ||
                ""
            )
                .toString()
                .trim()
                .toLowerCase();
            return `/domains/${domain}/auth-code`;
        },
        params: () => ({}),
    },

    ViewDomain: {
        method: "GET",
        path: (p) => `/domains/${p.websiteName}`,
        params: (p) => {
            // HostBay GET requests typically don't need query params when using path params
            return {};
        },
    },
    // Delete Domain
    DeleteDomain: {
        method: "DELETE",
        path: (p) => `/domains/${p.websiteName}`,
        params: (p) => {
            return {};
        },
    },

    // DNS Management
    // Enable/Initialize DNS zone for domain
    ManageDNSRecords: {
        method: "POST",
        path: (p) => `/domains/${p.WebsiteName}/dns`,
        params: (p) => ({
            // Enable DNS management for the domain
        }),
    },

    // Add DNS record
    AddDNSRecord: {
        method: "POST",
        path: (p) => `/domains/${p.WebsiteName}/dns/records`,
        params: (p) => {
            // Format record name - remove domain if it's the root
            const recordName = p.RecordName === p.WebsiteName 
                ? "@" 
                : p.RecordName?.replace(`.${p.WebsiteName}`, "") || "@";
            
            const params = {
                name: recordName,
                type: p.RecordType,
                content: p.RecordValue, // HostBay API expects 'content' not 'value'
                ttl: Number(p.RecordTTL) || 3600,
            };
            
            // Add priority only if provided (for MX and SRV records)
            if (p.RecordPriority) {
                params.priority = Number(p.RecordPriority);
            }
            return params;
        },
    },                                                          
                       
               
    // Modify DNS record
    ModifyDNSRecord: {
        method: "PUT",
        path: (p) => {
            // If we have a record ID, use it in the path, otherwise use records endpoint
            if (p.DNSZoneRecordID || p.RecordID) {
                return `/domains/${p.WebsiteName}/dns/records/${p.DNSZoneRecordID || p.RecordID}`;
            }
            return `/domains/${p.WebsiteName}/dns/records`;
        },
        params: (p) => {
            // Format record name - remove domain if it's the root
            const recordName = p.RecordName === p.WebsiteName 
                ? "@" 
                : p.RecordName?.replace(`.${p.WebsiteName}`, "") || "@";
            
            const params = {
                name: recordName,
                type: p.RecordType,
                content: p.RecordValue, // HostBay API expects 'content' not 'value'
                ttl: Number(p.RecordTTL) || 3600,
            };
            
            // Add priority only if provided (for MX records)
            if (p.RecordPriority) {
                params.priority = Number(p.RecordPriority);
            }
            
            // If no record ID in path, include old record details for identification
            if (!p.DNSZoneRecordID && !p.RecordID && p.OldRecordValue) {
                params.old_value = p.OldRecordValue;
                params.old_name = p.OldRecordName === p.WebsiteName 
                    ? "@" 
                    : p.OldRecordName?.replace(`.${p.WebsiteName}`, "") || "@";
                params.old_type = p.OldRecordType;
            }
            
            return params;
        },
    },

    // Delete DNS record
    DeleteDNSRecord: {
        method: "DELETE",
        path: (p) => {
            // If we have a record ID, use it in the path
            if (p.DNSZoneRecordID || p.RecordID) {
                return `/domains/${p.WebsiteName}/dns/records/${p.DNSZoneRecordID || p.RecordID}`;
            }
            // Otherwise, use records endpoint with query params
            return `/domains/${p.WebsiteName}/dns/records`;
        },
        params: (p) => {
            // If no record ID, include record details for identification
            if (!p.DNSZoneRecordID && !p.RecordID) {
                const recordName = p.RecordName === p.WebsiteName 
                    ? "@" 
                    : p.RecordName?.replace(`.${p.WebsiteName}`, "") || "@";
                
                return {
                    name: recordName,
                    type: p.RecordType,
                    value: p.RecordValue,
                };
            }
            return {};
        },
    },

    // View DNS records
    ViewDNSRecord: {
        method: "GET",
        path: (p) => `/domains/${p.WebsiteName}/dns/records`,
        params: (p) => ({}),
    },

    // Child Nameservers
    // NOTE: HostBay API doesn't support child nameserver endpoints directly
    // Child nameservers are implemented via DNS A records in HostController.js
    // These mappings are kept for reference but not used for HostBay
    AddChildNameServer: {
        method: "POST",
        path: (p) => `/domains/${p.websiteName || p.WebsiteName}/nameservers`,
        params: (p) => {
            // Use the hostname as provided - HostBay may expect full hostname or just subdomain
            // Try with full hostname first
            let hostname = p.hostName || p.hostname || "";
            
            return {
                hostname: hostname,
                ip_address: p.ipAddress || p.ip_address,
            };
        },
    },

    // Modify child nameserver IP
    ModifyChildNameServerIP: {
        method: "PUT",
        path: (p) => {
            const domain = p.websiteName || p.WebsiteName || "";
            let hostname = p.hostName || p.hostname || "";
            // Extract subdomain from hostname for URL path
            if (hostname && domain && hostname.includes(`.${domain}`)) {
                hostname = hostname.replace(`.${domain}`, "");
            }
            return `/domains/${domain}/nameservers/${hostname}`;
        },
        params: (p) => ({
            ip_address: p.newIpAddress || p.new_ip_address,
        }),
    },

    // Modify child nameserver hostname
    ModifyChildNameServerHostname: {
        method: "PUT",
        path: (p) => {
            const domain = p.websiteName || p.WebsiteName || "";
            let oldHostname = p.oldHostName || p.old_hostname || "";
            // Extract subdomain from hostname for URL path
            if (oldHostname && domain && oldHostname.includes(`.${domain}`)) {
                oldHostname = oldHostname.replace(`.${domain}`, "");
            }
            return `/domains/${domain}/nameservers/${oldHostname}`;
        },
        params: (p) => {
            let newHostname = p.newHostName || p.new_hostname || "";                                                                                                                                                                                                                                                                       
            // Extract subdomain from hostname for params
            const domain = p.websiteName || p.WebsiteName || "";
            if (newHostname && domain && newHostname.includes(`.${domain}`)) {
                newHostname = newHostname.replace(`.${domain}`, "");
            }
            return {
                hostname: newHostname,
            };
        },
    },

    // Delete child nameserver
    DeleteChildNameServer: {
        method: "DELETE",
        path: (p) => {
            const domain = p.websiteName || p.WebsiteName || "";
            let hostname = p.hostName || p.hostname || "";
            // Extract subdomain from hostname for URL path
            if (hostname && domain && hostname.includes(`.${domain}`)) {
                hostname = hostname.replace(`.${domain}`, "");
            }
            return `/domains/${domain}/nameservers/${hostname}`;
        },
        params: (p) => ({}),
    },

    // Get child nameservers
    getchildnameservers: {
        method: "GET",
        path: (p) => `/domains/${p.websiteName || p.WebsiteName}/nameservers`,
        params: (p) => ({}),
    },

    // DNSSEC
    // Add DNSSEC record
    AddDNSSec: {
        method: "POST",
        path: (p) => `/domains/${p.domain || p.websiteName || p.WebsiteName}/dnssec`,
        params: (p) => ({
            key_tag: p.keyTag || p.key_tag,
            algorithm: p.algorithm,
            digest_type: p.digestType || p.digest_type,
            digest: p.digest,
        }),
    },

    // Delete DNSSEC record
    DeleteDNSSec: {
        method: "DELETE",
        path: (p) => `/domains/${p.domain || p.websiteName || p.WebsiteName}/dnssec/${p.keyTag || p.key_tag}`,
        params: (p) => ({}),
    },

    // Get DNSSEC records
    GetDNSSec: {
        method: "GET",
        path: (p) => `/domains/${p.domain || p.websiteName || p.WebsiteName}/dnssec`,
        params: (p) => ({}),
    },

    // DNS History
    // Get DNS history
    GetDNSHistory: {
        method: "GET",
        path: (p) => `/domains/${p.websiteName || p.WebsiteName}/dns/history`,
        params: (p) => ({
            limit: p.limit || 50,
            offset: p.offset || 0,
        }),
    },
    
    // Restore DNS from history
    RestoreDNSHistory: {
        method: "POST",
        path: (p) => `/domains/${p.websiteName || p.WebsiteName}/dns/history/${p.historyId || p.history_id}/restore`,
        params: (p) => ({}),
    },

    // View Nameservers
    ViewNameservers: {
        method: "GET",
        path: (p) => `/domains/${p.websiteName || p.WebsiteName}/nameservers`,
        params: (p) => ({}),
    },

    // Update Nameservers
    UpdateNameServer: {
        method: "PUT",
        path: (p) => `/domains/${p.websiteName || p.WebsiteName}/nameservers`,
        params: (p) => ({
            nameservers: [
                p.nameServer1 || p.nameserver1,
                p.nameServer2 || p.nameserver2,
                p.nameServer3 || p.nameserver3,
                p.nameServer4 || p.nameserver4,
            ].filter(Boolean), // Remove undefined/null values
        }),
    },

    // WHOIS & Privacy
    GetWhois: {
        method: "GET",
        path: (p) => `/domains/${p.domain || p.websiteName || p.WebsiteName}/whois`,
        params: () => ({}),
    },

    EnableDomainPrivacy: {
        method: "POST",
        path: (p) => `/domains/${p.domain || p.websiteName || p.WebsiteName}/privacy/enable`,
        params: (p) => ({
            restore_on_disable: p.restore_on_disable !== false,
        }),
    },

    DisableDomainPrivacy: {
        method: "POST",
        path: (p) => `/domains/${p.domain || p.websiteName || p.WebsiteName}/privacy/disable`,
        params: () => ({}),
    },

    // Hosting Plans
    GetHostingPlans: {
        method: "GET",
        path: "/hosting/plans",
        params: (p) => ({
            ...(p.page ? { page: p.page } : {}),
            ...(p.limit ? { limit: p.limit } : {}),
        }),
    },

    // Calculate Hosting Price
    CalculateHostingPrice: {
        method: "GET",
        path: "/hosting/calculate-price",
        params: (p) => ({
            plan: p.plan || p.planCode || p.planId,
            period: p.period || p.periods || 1,
        }),
    },
    // Order Hosting (Unified endpoint for new, existing, and external domains)           
    OrderHosting: {                                                                                                                   
        method: "POST",
        path: "/hosting/order",
        params: (p) => {
            // Determine domain_type from domainOption or provided domain_type
            let domainType = p.domain_type || p.domainType;
            if (!domainType) {
                if (p.domainOption === "new") domainType = "new";
                else if (p.domainOption === "existing") domainType = "existing";
                else if (p.domainOption === "external") domainType = "external";
                else domainType = "new"; // default
            }
            
            return {
                domain_name: p.domain_name || p.domainName || "",
                domain_type: domainType,
                plan: p.plan || p.planCode || p.planId,
                period: p.period || p.periods || 1,
            };
        },
    },

    // Create Domain + Hosting Bundle
    CreateDomainHostingBundle: {
        method: "POST",
        path: "/bundles/domain-hosting",
        params: (p) => ({
            domain_name: p.domain_name || p.domainName || "",
            plan: p.plan || p.planCode || p.planId,
            period: p.period || p.periods || 1,
            contacts: p.contacts || {},
            auto_renew: p.auto_renew !== undefined ? p.auto_renew : true,
        }),
    },

    // Link Domain to Hosting
    LinkDomainToHosting: {
        method: "POST",
        path: (p) => `/domains/${p.domain_name || p.domainName}/link`,
        params: (p) => ({
            linking_mode: p.linking_mode || "manual",
            hosting_plan: p.hosting_plan || p.plan || p.planCode,
        }),
    },

    // Get Domain Linking Status
    GetLinkingStatus: {
        method: "GET",
        path: (p) => `/domains/${p.domain_name || p.domainName}/link/status`,
        params: () => ({}),
    },

    // Retry Domain Linking
    RetryLinking: {
        method: "POST",
        path: (p) => `/domains/${p.domain_name || p.domainName}/link/retry`,
        params: () => ({}),
    },

    // Get Hosting Credentials
    GetHostingCredentials: {
        method: "GET",
        path: (p) => `/hosting/${p.subscription_id || p.subscriptionId}/credentials`,
        params: () => ({}),
    },

    // Install SSL
    InstallSSL: {
        method: "POST",
        path: (p) => `/hosting/${p.subscription_id || p.subscriptionId}/ssl/install`,
        params: () => ({}),
    },

    // Get SSL Status
    GetSSLStatus: {
        method: "GET",
        path: (p) => `/hosting/${p.subscription_id || p.subscriptionId}/ssl`,
        params: () => ({}),
    },

    // Get Server Info (unified endpoint - supports optional domain_name for DNS instructions)
    GetServerInfo: {
        method: "GET",
        path: "/hosting/server-info",
        params: (p) => ({
            ...(p.domain_name ? { domain_name: p.domain_name } : {}),
        }),
    },

    // Get Hosting Renewal Price
    GetHostingRenewalPrice: {
        method: "GET",
        path: (p) => `/hosting/${p.subscription_id || p.subscriptionId}/renewal-price`,
        params: (p) => ({
            period: p.period || 1,
        }),
    },

    // Get Hosting Renewal Options
    GetHostingRenewalOptions: {
        method: "GET",
        path: (p) => `/hosting/${p.subscription_id || p.subscriptionId}/renewal-options`,
        params: () => ({}),
    },

    // Renew Hosting Subscription
    RenewHosting: {
        method: "POST",
        path: (p) => `/hosting/${p.subscription_id || p.subscriptionId}/renew`,
        params: (p) => ({
            period: p.period || 1,
            plan: p.plan || null,
            auto_renew: p.auto_renew !== undefined ? p.auto_renew : true,
        }),
    },
};

module.exports = hostbayMappings;                                     
