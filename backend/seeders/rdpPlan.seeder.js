const rdpPlanSeeder = async () => {
    return Promise.resolve([
      {
        name: 'Basic Plan',
        storage: {
          type: 'SSD',
          size: 100
        },
        cpu: 2,
        ram: 4,
        networkSpeed: {
          type: 'Gbps',
          speed: 1
        },
        increment: {
          unit: 'percentage',
          value: 40
        }
      },
      {
        name: 'Standard Plan',
        storage: {
          type: 'SSD',
          size: 250
        },
        cpu: 4,
        ram: 8,
        networkSpeed: {
          type: 'Gbps',
          speed: 1
        },
        increment: {
          unit: 'percentage',
          value: 40
        }
      },
      {
        name: 'Premium Plan',
        storage: {
          type: 'SSD',
          size: 500
        },
        cpu: 8,
        ram: 16,
        networkSpeed: {
          type: 'Gbps',
          speed: 1
        },
        increment: {
          unit: 'percentage',
          value: 40
        }
      }
    ]);
  };
  
  module.exports = rdpPlanSeeder;
  