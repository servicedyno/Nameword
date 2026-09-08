const formatZoneData = (zone) => {
	return {
		id: zone.id,
		name: zone.name,
		paused: zone.paused,
		status: zone.status,
		type: zone.type,
		activated_on: zone.activated_on,
		nameservers: zone.name_servers,
		original_name_servers: zone.original_name_servers
	};
};

const formatRecordData = (dnsRecord) => {
	return {
		id: dnsRecord.id,
		name: dnsRecord.name,
		type: dnsRecord.type,
		content: dnsRecord.content,
		proxiable: dnsRecord.proxiable,
		proxied: dnsRecord.proxied,
		ttl: dnsRecord.ttl,
	}
}

const getErrorMessage = (error) => {
	return error.status === 400 ? error.errors : error.message;
};

module.exports = {
	formatZoneData,
	formatRecordData,
	getErrorMessage
};
