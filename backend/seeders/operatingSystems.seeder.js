const operatingSystemsSeeder = async () => {
    return Promise.resolve([
        {
            name: "Ubuntu",
            version: "Ubuntu 24.04 LTS",
            cloud: "ubuntu-os-cloud",
            family: "ubuntu-2204-lts",
            caption: "Best for general use and development",
            os_name: "ubuntu",
            price: 0
        },
        {
            name: "Debian",
            version: "Debian 12",
            cloud: "debian-cloud",
            family: "debian-12",
            caption: "Stable, lightweight, and widely used",
            os_name: "debian",
            price: 0
        },
        {
            name: "AlmaLinux",
            version: "AlmaLinux 9",
            cloud: "almalinux-cloud",
            family: "almalinux-9",
            caption: "Popular CentOS replacement for servers",
            os_name: "almalinux",
            price: 0
        },
        {
            name: "Rocky Linux",
            version: "Rocky Linux 9",
            cloud: "rocky-linux-cloud",
            family: "rocky-linux-9",
            caption: "Another CentOS alternative, enterprise-ready",
            os_name: "rockylinux",
            price: 0
        },
        {
            name: "CentOS",
            version: "CentOS Stream 9",
            cloud: "centos-cloud",
            family: "centos-stream-9",
            caption: "Stable for enterprise applications",
            os_name: "centos",
            price: 0
        },
        {
            name: "Windows Server 2022",
            version: "Windows Server 2022",
            cloud: "windows-cloud",
            family: "windows-2022",
            caption: "For Windows-based applications (+$21/month)",
            os_name: "win",
            price: 21,
            priceDuration: "monthly"
        }
    ]);
};

module.exports = operatingSystemsSeeder;

