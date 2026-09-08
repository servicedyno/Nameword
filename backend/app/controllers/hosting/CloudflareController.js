const Cloudflare = require('cloudflare');

const { get } = require("../../utils/apiclient");

const cloudflareHelper = require('../../helpers/cloudflareHelper');
const { domainBelongsToUser } = require('../../helpers/authorizationHelper');


const cloudflare = new Cloudflare({
	apiEmail: process.env.CLOUDFLARE_EMAIL,
	apiKey: process.env.CLOUDFLARE_API_KEY,
});


/*****************************Zone Records*****************************/
const zones = async (req, res) => {
	const { status } = req.query;

	try {
		const response = await cloudflare.zones.list({
			status
		});

		const data = response.result.map(cloudflareHelper.formatZoneData)
		res.json({ total: response.result.length, data });
	} catch (error) {
		console.error('Error fetching zones:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

const showZone = async (req, res) => {
	const { domainId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		const response = await cloudflare.zones.get({
			zone_id: domain.cloudflare.zoneId,
		});

		const data = cloudflareHelper.formatZoneData(response);
		res.json({ data });
	} catch (error) {
		console.error('Error fetching zone:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

const createZone = async (req, res) => {
	const { domainId } = req.body;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		const response = await cloudflare.zones.create({
			name: domain.websiteName,
			type: 'full',
		});

		// Update nameservers with the domain provider
		try {
			await get('UpdateNameServer', {
				domainNameId: domain.domainNameId,
				websiteName: domain.websiteName,
				nameServer1: response.name_servers[0],
				nameServer2: response.name_servers[1],
			});
		} catch (error) {
			// Rollback zone creation
			await cloudflare.zones.delete({
				zone_id: response.id,
			});

			console.error('Error updating nameservers:', error);
			return res.status(500).json({ message: 'Zone was not created due to nameserver update failure' });
		}

		// Update the domain with the zoneId
		domain.cloudflare.zoneId = response.id;
		await domain.save();

		const data = cloudflareHelper.formatZoneData(response);
		res.status(201).json({ message: 'Zone created successfully', data });
	} catch (error) {
		console.error('Error creating zone:', error);
		res.status(409).json({ message: error.errors[0].message });
	}
};

const pauseZone = async (req, res) => {
	const { domainId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		await cloudflare.zones.edit({
			zone_id: domain.cloudflare.zoneId,
			paused: true,
		});

		res.json({ message: 'Zone paused successfully' });
	} catch (error) {
		console.error('Error suspending zone:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

const unpauseZone = async (req, res) => {
	const { domainId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		await cloudflare.zones.edit({
			zone_id: domain.cloudflare.zoneId,
			paused: false,
		});

		res.json({ message: 'Zone unpaused successfully' });
	} catch (error) {
		console.error('Error unsuspending zone:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

const purgeCache = async (req, res) => {
	const { domainId } = req.params;
	const { action, url } = req.body;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		if (action === 'purge_everything') {
			await cloudflare.cache.purge({
				zone_id: domain.cloudflare.zoneId,
				purge_everything: true
			});
		} else {
			await cloudflare.cache.purge({
				zone_id: domain.cloudflare.zoneId,
				files: [url]
			});
		}

		res.json({ message: 'Cache purged successfully' });
	} catch (error) {
		console.error('Error purging cache:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

const terminateZone = async (req, res) => {
	const { domainId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		await cloudflare.zones.delete({
			zone_id: domain.cloudflare.zoneId,
		});

		// Update nameservers with the domain provider
		try {
		} catch (error) {
			console.error('Error updating nameservers:', error);
			res.status(500).json({ message: 'Zone was not terminated due to nameserver update failure' });
		}

		res.json({ message: 'Zone terminated successfully' });
	} catch (error) {
		console.error('Error terminating zone:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

/*****************************DNS Records*****************************/
const dns = async (req, res) => {
	const { domainId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		const response = await cloudflare.dns.records.list({
			zone_id: domain.cloudflare.zoneId
		});

		const data = response.result.map(cloudflareHelper.formatRecordData);
		res.json({ total: response.result.length, data });
	} catch (error) {
		console.error('Error fetching DNS records:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

const createDns = async (req, res) => {
	const { domainId } = req.params;
	const { type, name, content, ttl, proxied } = req.body;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		const response = await cloudflare.dns.records.create({
			zone_id: domain.cloudflare.zoneId,
			type,
			name,
			content,
			ttl,
			proxied
		});

		const data = {
			...cloudflareHelper.formatRecordData(response),
		}

		res.status(201).json({ message: 'DNS record created successfully', data });
	} catch (error) {
		console.error('Error creating DNS record:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

const editDns = async (req, res) => {
	const { domainId, recordId } = req.params;
	const { type, name, content, ttl, proxied } = req.body;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		const response = await cloudflare.dns.records.edit(recordId, {
			zone_id: domain.cloudflare.zoneId,
			type,
			name,
			content,
			ttl,
			proxied
		});

		const data = cloudflareHelper.formatRecordData(response);
		res.json({ message: 'DNS record updated successfully', data });
	} catch (error) {
		console.error('Error updating DNS record:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

const deleteDns = async (req, res) => {
	const { domainId, recordId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		await cloudflare.dns.records.delete(recordId, {
			zone_id: domain.cloudflare.zoneId
		});

		res.json({ message: 'DNS record deleted successfully' });
	} catch (error) {
		console.error('Error deleting DNS record:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
};

/*****************************Rulesets*****************************/
const rulesets = async (req, res) => {
	const { domainId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		const response = await cloudflare.rulesets.list({
			zone_id: domain.cloudflare.zoneId
		});

		const data = response.result;
		return res.json({ total: response.result?.length, data });
	} catch (error) {
		console.error('Error fetching rulesets:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
}

const createRuleset = async (req, res) => {
	const { domainId } = req.params;
	const { name, description, rules } = req.body;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		const response = await cloudflare.rulesets.create({
			zone_id: domain.cloudflare.zoneId,
			phase: "http_request_firewall_custom",
			kind: "zone",
			name,
			description,
			rules
		});

		res.status(201).json({ message: 'Ruleset created successfully', data: response });
	} catch (error) {
		console.error('Error creating ruleset:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
}

const showRuleset = async (req, res) => {
	const { domainId, rulesetId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		const response = await cloudflare.rulesets.get(rulesetId, {
			zone_id: domain.cloudflare.zoneId,
		});

		res.json({ data: response });
	} catch (error) {
		console.error('Error fetching ruleset:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
}

const deleteRuleset = async (req, res) => {
	const { domainId, rulesetId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		await cloudflare.rulesets.delete(rulesetId, {
			zone_id: domain.cloudflare.zoneId
		});

		res.json({ message: 'Ruleset deleted successfully' });
	} catch (error) {
		console.error('Error deleting ruleset:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
}

/*****************************Rules*****************************/
const createRule = async (req, res) => {
	const { domainId, rulesetId } = req.params;
	const { action, expression, description } = req.body;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		const response = await cloudflare.rulesets.rules.create(rulesetId, {
			zone_id: domain.cloudflare.zoneId,
			action,
			expression,
			description
		});

		const data = response.rules;
		res.status(201).json({ message: 'Rule created successfully', data });
	} catch (error) {
		console.error('Error creating rule:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
}

const deleteRule = async (req, res) => {
	const { domainId, rulesetId, ruleId } = req.params;

	try {
		const domain = await domainBelongsToUser(domainId, req.user.id);
		if (!domain.cloudflare.zoneId) return res.status(400).json({ message: 'Zone not found' });

		const response = await cloudflare.rulesets.rules.delete(rulesetId, ruleId, {
			zone_id: domain.cloudflare.zoneId
		});

		const data = response.rules;
		res.json({ message: 'Rule deleted successfully', data });
	} catch (error) {
		console.error('Error deleting rule:', error);
		res.status(500).json({ message: cloudflareHelper.getErrorMessage(error) });
	}
}

module.exports = {
	/*****************************Zone Records*****************************/
	zones,
	showZone,
	createZone,
	pauseZone,
	unpauseZone,
	purgeCache,
	terminateZone,

	/*****************************DNS Records*****************************/
	dns,
	createDns,
	editDns,
	deleteDns,

	/*****************************Rulesets*****************************/
	rulesets,
	createRuleset,
	showRuleset,
	deleteRuleset,

	/*****************************Rules*****************************/
	createRule,
	deleteRule
}