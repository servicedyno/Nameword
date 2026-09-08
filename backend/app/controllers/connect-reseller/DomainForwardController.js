const axios = require("axios");
const domainProviderApiClient = require("../../utils/domainProviderApiClient");
const Domain = require("../../models/Domain");
const { saveActivity } = require("../activityController");
const Cloudflare = require("cloudflare");

const cloudflare = new Cloudflare({
	apiEmail: process.env.CLOUDFLARE_EMAIL,
	apiKey: process.env.CLOUDFLARE_API_KEY,
});

const REDIRECT_PHASE = "http_request_dynamic_redirect";
const FALLBACK_A_IP = "192.0.2.1";
const DNS_TTL = 3600;

class DomainForwardController {
	constructor() {
		["store", "update", "destroy", "view", "all"].forEach((method) => {
			this[method] = this[method].bind(this);
		});
	}                                                                                                                                                                                                                                                

	async store(req, res) {
		const { domainName, rewrite, subDomain } = req.query;

		try {
			this.require(domainName, "Domain name is required");
			this.require(rewrite, "Destination URL is required");

			const domain = await this.getDomain(domainName);
			const zoneId = await this.ensureZone(domain, domainName);
			await this.ensureNameservers(domain, zoneId, domainName);

			const data = subDomain
				? await this.upsertSubdomainCname(zoneId, domainName, subDomain, rewrite)
				: await this.upsertRootRedirect(domain, zoneId, domainName, rewrite);

			await this.logActivity(req.user?.id, domainName, "domain", `Forwarding created (${subDomain || "root"})`, "Successful");
			return res.status(200).json(this.ok(data));
		} catch (error) {
			return this.handleError(res, req.user?.id, domainName, "creation", error);
		}
	}

	async update(req, res) {
		const { domainName, rewrite, subDomain } = req.query;

		try {
			this.require(domainName, "Domain name is required");
			this.require(rewrite, "Destination URL is required");

			const domain = await this.getDomain(domainName);
			const zoneId = await this.ensureZone(domain, domainName);
			await this.ensureNameservers(domain, zoneId, domainName);

			const data = subDomain
				? await this.upsertSubdomainCname(zoneId, domainName, subDomain, rewrite)
				: await this.upsertRootRedirect(domain, zoneId, domainName, rewrite);

			await this.logActivity(req.user?.id, domainName, "domain", `Forwarding updated (${subDomain || "root"})`, "Successful");
			return res.status(200).json(this.ok(data));
		} catch (error) {
			return this.handleError(res, req.user?.id, domainName, "update", error);
		}
	}

	async destroy(req, res) {
		const { domainName, subDomain } = req.query;

		try {
			this.require(domainName, "Domain name is required");

			const domain = await this.getDomain(domainName);
			const zoneId = await this.ensureZone(domain, domainName);

			const data = subDomain
				? await this.deleteSubdomainCname(zoneId, domainName, subDomain)
				: await this.deleteRootRedirect(domain, zoneId, domainName);

			await this.logActivity(req.user?.id, domainName, "domain", `Forwarding deleted (${subDomain || "root"})`, "Successful");
			return res.status(200).json(this.ok(data));
		} catch (error) {
			return this.handleError(res, req.user?.id, domainName, "deletion", error);
		}
	}

	async view(req, res) {
		const { domainName, subDomain } = req.query;

		try {
			this.require(domainName, "Domain name is required");

			const domain = await this.getDomain(domainName);
			const zoneId = await this.ensureZone(domain, domainName);

			const data = subDomain
				? await this.getSubdomainForward(zoneId, domainName, subDomain)
				: await this.getRootForward(domain, zoneId, domainName);

			return res.status(200).json(this.ok(data));
		} catch (error) {
			return this.handleError(res, null, domainName, "view", error);
		}
	}

	async all(req, res) {



        console.log(req.query,"req.query==========>");
		const domainName = req.query.domainName || req.query.domain;

		try {
			this.require(domainName, "Domain name is required");

			const domain = await this.getDomain(domainName);
			const zoneId = await this.ensureZone(domain, domainName);

			const [root, subdomains] = await Promise.all([
				this.getRootForward(domain, zoneId, domainName),
				this.listSubdomainForwards(zoneId, domainName),
			]);

			return res.status(200).json(this.ok({ root, subdomains }));
		} catch (error) {
			return this.handleError(res, null, domainName, "list", error);
		}
	}

	// Root forwarding helpers -------------------------------------------------

	async upsertRootRedirect(domain, zoneId, domainName, rewrite) {
		const destination = this.normalizeUrl(rewrite);

		await this.ensureFallbackA(zoneId, domainName);
		await this.removeRootCnames(zoneId, domainName);

		const rulesetId = await this.ensureRedirectRuleset(zoneId);
		const ruleId = await this.createOrUpdateRedirectRule(domain, zoneId, rulesetId, domainName, destination);

		return { type: "root", ruleId, destination };
	}

	async deleteRootRedirect(domain, zoneId, domainName) {
		const rulesetId = await this.ensureRedirectRuleset(zoneId);
		const ruleId = await this.getStoredRuleId(domain, zoneId, rulesetId, domainName);

		if (ruleId) {
			await this.removeRedirectRule(zoneId, rulesetId, ruleId, domainName);
			await this.saveDomainMeta(domain, { rootRedirectRuleId: null });
		}

		return { type: "root", ruleId: ruleId || null };
	}

	async getRootForward(domain, zoneId, domainName) {
		const rulesetId = await this.ensureRedirectRuleset(zoneId);
		const rule = await this.fetchRedirectRule(domain, zoneId, rulesetId, domainName);
		if (!rule) return { type: "root", destination: null };

		const params = rule.action_parameters || rule.actionParameters || {};
		const fromValue = params.from_value || params.fromValue || {};
		const target = fromValue.target_url || fromValue.targetUrl || {};

		return {
			type: "root",
			ruleId: rule.id,
			destination: target.value || null,
		};
	}

	async ensureRedirectRuleset(zoneId) {
		const list = await this.listRulesets(zoneId);
		const existing = (list.result || list).find((r) => r.phase === REDIRECT_PHASE);
		if (existing) return existing.id;

		const created = await this.createRuleset(zoneId, {
			name: "DomainForwardController Redirects",
			description: "Auto-managed root redirects",
			phase: REDIRECT_PHASE,
			kind: "zone",
			rules: [],
		});

		return created.result?.id || created.id;
	}

	async createOrUpdateRedirectRule(domain, zoneId, rulesetId, domainName, destination) {
		const expression = `(http.host eq "${domainName.toLowerCase()}")`;
		const ruleset = await this.getRuleset(zoneId, rulesetId);
		const rules = [...(ruleset.rules || [])];
		const rulePayload = {
			action: "redirect",
			expression,
			description: `Root redirect for ${domainName}`,
			enabled: true,
			action_parameters: {
				from_value: {
					status_code: 301,
					preserve_query_string: true,
					target_url: { value: destination },
				},
			},
		};

		let ruleId = await this.getStoredRuleId(domain, zoneId, rulesetId, domainName);
		let index = -1;

		if (ruleId) {
			index = rules.findIndex((rule) => rule.id === ruleId);
		}

		if (index === -1) {
			index = rules.findIndex((rule) => rule.expression === expression);
		}

		if (index > -1) {
			rulePayload.id = rules[index].id;
			rules[index] = { ...rules[index], ...rulePayload };
		} else {
			rules.push(rulePayload);
		}

		const updated = await this.updateRuleset(zoneId, rulesetId, ruleset, rules);
		const updatedRuleset = this.extractRuleset(updated);
		const savedRule = (updatedRuleset.rules || []).find((rule) => rule.expression === expression);
		ruleId = savedRule?.id || ruleId;

		if (!domain.cloudflare?.rootRedirectRuleId && ruleId) {
			await this.saveDomainMeta(domain, { rootRedirectRuleId: ruleId });
		}

		return ruleId;
	}

	async fetchRedirectRule(domain, zoneId, rulesetId, domainName) {
		const cached = domain.cloudflare?.rootRedirectRuleId;
		const ruleset = await this.getRuleset(zoneId, rulesetId);
		const rules = ruleset.rules || [];

		if (cached) {
			const match = rules.find((r) => r.id === cached);
			if (match) return match;
		}

		const expression = `(http.host eq "${domainName.toLowerCase()}")`;
		const rule = rules.find((r) => r.expression === expression);

		if (rule && !cached) {
			await this.saveDomainMeta(domain, { rootRedirectRuleId: rule.id });
		}

		return rule || null;
	}

	async getStoredRuleId(domain, zoneId, rulesetId, domainName) {
		const cached = domain.cloudflare?.rootRedirectRuleId;
		if (cached) return cached;

		const rule = await this.fetchRedirectRule(domain, zoneId, rulesetId, domainName);
		return rule?.id || null;
	}

	// Subdomain forwarding helpers -------------------------------------------

	async upsertSubdomainCname(zoneId, domainName, subDomain, rewrite) {
		const recordName = `${subDomain}.${domainName}`.toLowerCase();
		const target = this.normalizeHost(rewrite);

		await this.removeCname(zoneId, recordName);

		const response = await cloudflare.dns.records.create({
					zone_id: zoneId,
					type: "CNAME",
			name: recordName,
			content: target,
			ttl: DNS_TTL,
			proxied: true,
		});

		return {
			type: "subdomain",
			recordId: response.id || response.result?.id,
			name: recordName,
			target,
		};
	}

	async deleteSubdomainCname(zoneId, domainName, subDomain) {
		const recordName = `${subDomain}.${domainName}`.toLowerCase();
		const deleted = await this.removeCname(zoneId, recordName);
		return { type: "subdomain", name: recordName, deleted };
	}

	async getSubdomainForward(zoneId, domainName, subDomain) {
		const recordName = `${subDomain}.${domainName}`.toLowerCase();
		const list = await cloudflare.dns.records.list({ zone_id: zoneId, type: "CNAME", name: recordName });
		const record = (list.result || []).find((r) => (r.name || "").toLowerCase() === recordName);

		return {
			type: "subdomain",
			name: recordName,
			target: record?.content || null,
			recordId: record?.id || null,
		};
	}

	async listSubdomainForwards(zoneId, domainName) {
		const domainLower = domainName.toLowerCase();
		const list = await cloudflare.dns.records.list({ zone_id: zoneId, type: "CNAME" });
		return (list.result || [])
			.filter((record) => {
				const name = (record.name || "").toLowerCase();
				return name.endsWith(`.${domainLower}`) && name !== domainLower;
			})
			.map((record) => ({
				name: record.name,
				target: record.content,
				recordId: record.id,
			}));
	}

	async removeCname(zoneId, name) {
		const list = await cloudflare.dns.records.list({ zone_id: zoneId, type: "CNAME", name });
		const records = list.result || [];
		await Promise.all(records.map((record) => cloudflare.dns.records.delete(record.id, { zone_id: zoneId })));
		return records.length;
	}

	// Cloudflare ruleset helpers ----------------------------------------------

	async listRulesets(zoneId) {
		return this.callCloudflare("GET", `/zones/${zoneId}/rulesets`);
	}

	async createRuleset(zoneId, body) {
		return this.callCloudflare("POST", `/zones/${zoneId}/rulesets`, body);
	}

	async getRuleset(zoneId, rulesetId) {
		const response = await this.callCloudflare("GET", `/zones/${zoneId}/rulesets/${rulesetId}`);
		return this.extractRuleset(response);
	}

	async updateRuleset(zoneId, rulesetId, ruleset, rules) {
		return this.callCloudflare("PUT", `/zones/${zoneId}/rulesets/${rulesetId}`, {
			name: ruleset.name || "DomainForwardController Redirects",
			description: ruleset.description || "Auto-managed root redirects",
			kind: ruleset.kind || "zone",
			phase: ruleset.phase || REDIRECT_PHASE,
			rules,
		});
	}

	extractRuleset(response) {
		return response?.result || response;
	}

	async callCloudflare(method, path, data) {
		try {
			const response = await axios({
				method,
				url: `https://api.cloudflare.com/client/v4${path}`,
				headers: {
					"Content-Type": "application/json",
					"X-Auth-Email": process.env.CLOUDFLARE_EMAIL,
					"X-Auth-Key": process.env.CLOUDFLARE_API_KEY,
				},
				data,
			});

			if (!response.data?.success) {
				throw new Error(JSON.stringify(response.data));
			}

			return response.data;
		} catch (error) {
			if (error.response?.data) {
				throw new Error(`${error.response.status} ${JSON.stringify(error.response.data)}`);
			}
			throw error;
		}
	}

	async removeRedirectRule(zoneId, rulesetId, ruleId, domainName) {
		const ruleset = await this.getRuleset(zoneId, rulesetId);
		const rules = [...(ruleset.rules || [])];
		const expression = `(http.host eq "${domainName.toLowerCase()}")`;
		const filtered = rules.filter((rule) => rule.id !== ruleId && rule.expression !== expression);

		if (filtered.length === rules.length) return;

		await this.updateRuleset(zoneId, rulesetId, ruleset, filtered);
	}

	async removeRootCnames(zoneId, domainName) {
		const domainLower = domainName.toLowerCase();
		const list = await cloudflare.dns.records.list({ zone_id: zoneId, type: "CNAME" });
		const roots = (list.result || []).filter((record) => {
			const name = (record.name || "").toLowerCase();
			return name === domainLower || name === "@" || name === "";
		});
		await Promise.all(roots.map((record) => cloudflare.dns.records.delete(record.id, { zone_id: zoneId })));
	}

	// Cloudflare zone / DNS helpers -------------------------------------------

	async getDomain(domainName) {
		const domain = await Domain.findOne({ websiteName: domainName, deletedAt: { $eq: null } });
		if (!domain) throw new Error(`Domain ${domainName} not found`);
		return domain;
	}

	async ensureZone(domain, domainName) {
		if (domain.cloudflare?.zoneId) return domain.cloudflare.zoneId;

		const created = await cloudflare.zones.create({ name: domainName, type: "full" });
		const zoneId = created.id || created.result?.id;
		await this.saveDomainMeta(domain, { zoneId });

		const nameservers = created.name_servers || created.result?.name_servers || [];
		await this.updateNameservers(domain, domainName, nameservers);

		return zoneId;
	}

	async ensureNameservers(domain, zoneId, domainName) {
		const zone = await cloudflare.zones.get({ zone_id: zoneId });
		const cf = zone.name_servers || zone.result?.name_servers || [];
		if (!cf.length) return;

		const provider = domain.provider || "connectreseller";
		const view = await domainProviderApiClient.request("ViewDomain", { websiteName: domainName }, null, provider);
		const current = view?.responseData?.nameServers || view?.responseData?.nameservers || [];

		const normalizeValue = (value) => {
			if (typeof value === "string") return value;
			if (Array.isArray(value)) return value.join(",");
			if (value && typeof value === "object") {
				return value.host || value.hostname || value.name || value.value || "";
			}
			return value == null ? "" : String(value);
		};

		const matches = cf.every((ns) =>
			current.some((value) => normalizeValue(value).toLowerCase().includes(ns.toLowerCase())),
		);

		if (!matches) {
			await this.updateNameservers(domain, domainName, cf);
		}
	}

	async updateNameservers(domain, domainName, nameservers) {
		if (!nameservers.length) return;
		const provider = domain.provider || "connectreseller";

		await domainProviderApiClient.request(
			"UpdateNameServer",
			{
				websiteName: domainName,
				nameServer1: nameservers[0],
				nameServer2: nameservers[1],
				nameServer3: nameservers[2] || null,
				nameServer4: nameservers[3] || null,
			},
						null,
			provider,
		);
	}

	async ensureFallbackA(zoneId, domainName) {
		const domainLower = domainName.toLowerCase();
		const list = await cloudflare.dns.records.list({ zone_id: zoneId, type: "A" });
		const hasRoot = (list.result || []).some((record) => {
			const name = (record.name || "").toLowerCase();
			return record.type === "A" && record.content === FALLBACK_A_IP && (name === domainLower || name === "@" || name === "");
		});

		if (!hasRoot) {
			await cloudflare.dns.records.create({
				zone_id: zoneId,
				type: "A",
				name: "@",
				content: FALLBACK_A_IP,
				ttl: DNS_TTL,
				proxied: true,
			});
		}
	}

	async saveDomainMeta(domain, patch) {
		domain.cloudflare = { ...(domain.cloudflare || {}), ...patch };
		await domain.save();
	}

	// Response helpers --------------------------------------------------------

	ok(data) {
		return {
			responseMsg: { statusCode: 200, message: "Success" },
			responseData: data,
		};
	}

	require(value, message) {
		if (!value) throw new Error(message);
	}

	normalizeUrl(url) {
		let value = (url || "").trim();
		if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
		return value;
	}

	normalizeHost(url) {
		let host = (url || "").trim();
		while (/^https?:\/\//i.test(host)) host = host.replace(/^https?:\/\//i, "");
		return host.split("/")[0];
	}

	async logActivity(userId, domain, type, activity, status) {
		if (!userId) return;
		await saveActivity({
			userId,
			domain,
			activityType: type,
			activity,
			status,
		});
	}

	handleError(res, userId, domainName, action, error) {
		if (userId) {
			this.logActivity(userId, domainName, "domain", `Forwarding ${action} failed: ${error.message}`, "Rejected").catch(() => {});
		}

		const statusCode = /Cloudflare zone/i.test(error.message) ? 400 : 500;
		return res.status(statusCode).json({
				responseMsg: {
				statusCode,
					message: error.message || "Internal server error",
				},
				responseData: null,
			});
	}
}

module.exports = new DomainForwardController();

