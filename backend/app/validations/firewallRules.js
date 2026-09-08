const { body } = require('express-validator');

const firewallRulesValidation = [
    body('projectID')
        .isString().notEmpty().withMessage('Project ID is required and should be a string.'),
    body('firewallName')
        .isString().notEmpty().withMessage('Firewall name is required and should be a string.'),
    body('ports')
        .isArray({ min: 1 }).withMessage('Ports must be an array with at least one port.')
        .custom((ports) => {
            const validProtocols = ["ah", "all", "esp", "icmp", "ipip", "sctp", "tcp", "udp"];
            ports.forEach(portObj => {
                if (typeof portObj !== 'object' || !portObj.IPProtocol || !Array.isArray(portObj.ports)) {
                    throw new Error('Each port entry must be an object with IPProtocol and ports array.');
                }
                if (!validProtocols.includes(portObj.IPProtocol) && !(Number(portObj.IPProtocol) >= 0 && Number(portObj.IPProtocol) <= 255)) {
                    throw new Error(`Invalid IPProtocol: ${portObj.IPProtocol}. Must be one of ${JSON.stringify(validProtocols)} or a number between 0 and 255.`);
                }
                portObj.ports.forEach(port => {
                    if (!/^\d+$/.test(port) && !/^\d+-\d+$/.test(port)) {
                        throw new Error('Each port must be a valid number or range.');
                    }
                });
            });
            return true;
        })
];

module.exports = {
    openFirewallRules: firewallRulesValidation,
    closeFirewallRules: firewallRulesValidation
};
