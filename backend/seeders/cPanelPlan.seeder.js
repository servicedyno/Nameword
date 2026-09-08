
const cPanelPlanSeeder = async () => {

    return Promise.resolve([
        // WHM Plans
        { type: "WHM", id: "solo", name: "Solo", tier: "Solo", maxAccounts: 1, price: 15, billingDuration: "monthly", durationValue: 1, enabled: true },
        { type: "WHM", id: "admin", name: "Admin", tier: "Admin", maxAccounts: 5, price: 25, billingDuration: "monthly", durationValue: 1, enabled: true },
        { type: "WHM", id: "pro", name: "Pro", tier: "Pro", maxAccounts: 30, price: 35, billingDuration: "monthly", durationValue: 1, enabled: true },
        { type: "WHM", id: "premier", name: "Premier", tier: "Enterprise", maxAccounts: 100, price: 50, billingDuration: "monthly", durationValue: 1, enabled: true },
        { type: "WHM", id: "trial", name: "Free Trial", tier: "Trial", maxAccounts: 1, price: 0, billingDuration: "days", durationValue: 15, enabled: true },

        // Plesk Plans
        { type: "Plesk", id: "webadmin", name: "Web Admin Edition", tier: "Basic", maxDomains: 10, price: 15, billingDuration: "monthly", durationValue: 1, enabled: false },
        { type: "Plesk", id: "webpro", name: "Web Pro Edition", tier: "Pro", maxDomains: 30, price: 25, billingDuration: "monthly", durationValue: 1, enabled: false },
        { type: "Plesk", id: "webhost", name: "Web Host Edition", tier: "Enterprise", maxDomains: "Unlimited", price: 35, billingDuration: "monthly", durationValue: 1, enabled: true },
        { type: "Plesk", id: "byol", name: "Free Trial", tier: "Trial", maxDomains: "Unlimited", price: 0, billingDuration: "days", durationValue: 15, enabled: true }
    ])
};


module.exports = cPanelPlanSeeder;
