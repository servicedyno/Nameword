const vpsDiskSeeder = async () => {
    return Promise.resolve([
        {
            type: "pd-standard",
            level: 1,
            basePrice: 5,
            label: "Standard Persistent Disk",
            description: "📀 Standard Persistent Disk (pd-standard) – Affordable for sequential workloads"
        },
        {
            type: "pd-balanced",
            level: 2,
            basePrice: 10,
            label: "Balanced Persistent Disk",
            description: "⚖️ Balanced Persistent Disk (pd-balanced) – Best balance of speed & cost"
        },
        {
            type: "pd-ssd",
            level: 3,
            basePrice: 20,
            label: "SSD Persistent Disk",
            description: "🚀 SSD Persistent Disk (pd-ssd) – Fastest for high I/O applications"
        },
        // {
        //     type: "pd-extreme",
        //     level: 4,
        //     basePrice: 25,
        //     label: "Extreme Persistent Disk",
        //     description: "🔥 Extreme Persistent Disk (pd-extreme) – High performance for demanding applications"
        // }
    ]);
};

module.exports = vpsDiskSeeder;
