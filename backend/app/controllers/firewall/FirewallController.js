const { FirewallsClient} = require('@google-cloud/compute').v1;

class FirewallController {

    // To retrieve the firewall rule
    static async getFirewall(projectID, firewallName) {
        const computeClient = new FirewallsClient();
        const [firewall] = await computeClient.get({
            project: projectID,
            firewall: firewallName
        });
        return firewall;
    }

    // To update the firewall rule
    static async updateFirewall(projectID, firewallName, allowed) {
        const computeClient = new FirewallsClient();
        await computeClient.patch({
            project: projectID,
            firewall: firewallName,
            firewallResource: { name: firewallName, allowed }
        });
    }

    // To format the ports
    static formatPorts(ports) {
        return ports.map(({ IPProtocol, ports }) => ({
            IPProtocol,
            ports: ports.map(port => port.toString())
        }));
    }

    // To extract the current ports
    static extractCurrentPorts(currentAllowedPorts) {
        return currentAllowedPorts.reduce((port, rule) => {
            if (rule.IPProtocol) {
                port[rule.IPProtocol] = port[rule.IPProtocol] || [];
                port[rule.IPProtocol].push(...rule.ports);
            }
            return port;
        }, {});
    }

    // To check if all ports are open
    static areAllPortsOpen(ports, currentPorts) {
        return ports.every(({ IPProtocol, ports }) =>
            ports.every(port => currentPorts[IPProtocol]?.includes(port))
        );
    }

    // To merge the ports
    static mergePorts(currentAllowed, newPorts) {
        const updatedAllowed = [...currentAllowed];
        newPorts.forEach(newPort => {
            const existingRule = updatedAllowed.find(rule => rule.IPProtocol === newPort.IPProtocol);
            if (existingRule) {
                existingRule.ports = Array.from(new Set([...existingRule.ports, ...newPort.ports]));
            } else {
                updatedAllowed.push(newPort);
            }
        });
        return updatedAllowed;
    }

    // To filter the ports
    static filterPorts(currentAllowed, portsToRemove) {
        return currentAllowed.map(rule => {
            const isExist = portsToRemove.some(port => port.IPProtocol === rule.IPProtocol);
            if (isExist) {
                const portsToKeep = rule.ports.filter(port => {
                    const removalRule = portsToRemove.find(port => port.IPProtocol === rule.IPProtocol);
                    return !removalRule.ports.includes(port);
                });
                return { ...rule, ports: portsToKeep };
            }
            return rule;
        }).filter(rule => rule.ports.length > 0);
    }

    // To open specified ports in a firewall rule
    static async openPorts(req, res) {
        const { projectID, firewallName, ports } = req.body;

        try {
            const firewall = await FirewallController.getFirewall(projectID, firewallName);
            const allowedPorts = FirewallController.formatPorts(ports);
            const currentAllowed = firewall.allowed || [];
            const currentPorts = FirewallController.extractCurrentPorts(currentAllowed);

            if (FirewallController.areAllPortsOpen(allowedPorts, currentPorts)) {
                return res.status(400).json({ error: 'All requested ports are already open', firewall });
            }

            const updatedAllowed = FirewallController.mergePorts(currentAllowed, allowedPorts);
            await FirewallController.updateFirewall(projectID, firewallName, updatedAllowed);
            const updatedFirewall = await FirewallController.getFirewall(projectID, firewallName);

            res.status(200).json({ message: 'Ports opened successfully', data: updatedFirewall });
        } catch (error) {
            console.error('Error opening ports:', error);
            res.status(500).json({ message: `Error opening ports: ${error.message}` });
        }
    }

    // To close specified ports in a firewall rule
    static async closePorts(req, res) {
        const { projectID, firewallName, ports } = req.body;

        try {
            const firewall = await FirewallController.getFirewall(projectID, firewallName);
            const portsToRemove = FirewallController.formatPorts(ports);
            const currentAllowed = firewall.allowed || [];
            const currentPorts = FirewallController.extractCurrentPorts(currentAllowed);

            if (!FirewallController.areAllPortsOpen(portsToRemove, currentPorts)) {
                return res.status(400).json({ message: 'Some requested ports are not currently open', firewall });
            }

            const updatedAllowed = FirewallController.filterPorts(currentAllowed, portsToRemove);
            await FirewallController.updateFirewall(projectID, firewallName, updatedAllowed);
            const updatedFirewall = await FirewallController.getFirewall(projectID, firewallName);

            res.status(200).json({ message: 'Ports closed successfully', data: updatedFirewall });
        } catch (error) {
            console.error('Error closing ports:', error);
            res.status(500).json({ message: `Error closing ports: ${error.message}` });
        }
    }
}

module.exports = FirewallController;
