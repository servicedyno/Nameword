const vpsBillingCycleDiscountsSeeder = async () => {
    return Promise.resolve([
        { type: "Hourly", discount: 0, enabled: true},
        { type: "Monthly", discount: 10, enabled: true}, // Default 10% discount
        { type: "Quarterly", discount: 15, enabled: true}, // Default 15% discount
        { type: "Annually", discount: 20, enabled: true } // Default 20% discount
    ]);
};

module.exports = vpsBillingCycleDiscountsSeeder;
