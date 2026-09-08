const vpsPlansSeeder = async () => {

  return Promise.resolve([
    {
        name: "Basic",
        specs: { vCPU: 2, RAM: 8, disk: 64, machineType: "e2-standard-2"},
        increment: { 
            unit: 'percentage', // or 'currency'
            value: 40 // 40% increment
        },
        level: 1,
    },
    {
        name: "Standard",
        specs: { vCPU: 4, RAM: 16, disk: 80, machineType: "e2-standard-4"},
        increment: { 
            unit: 'percentage', // or 'currency'
            value: 40 // 40% increment
        },
        level: 2,
    },
    {
        name: "Premium",
        specs: { vCPU: 8, RAM: 32, disk: 160, machineType: "e2-standard-8"},
        increment: { 
            unit: 'percentage', // or 'currency'
            value: 40 // 40% increment
        },
        level: 3,
    },
    {
        name: "Enterprise",
        specs: { vCPU: 16, RAM: 64, disk: 200, machineType: "e2-standard-16"},
        increment: { 
            unit: 'percentage', // or 'currency'
            value: 40 // 40% increment
        },
        level: 4,
    }
  ]);
};


module.exports = vpsPlansSeeder;
