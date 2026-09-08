

const tierSeeder = async()=>{


	return [
		{
			name:"Starter",
			pointsRequired:0,
			benefits:{
				earnRate:1,
				discount:0,
				discountUnit:"percentage",
				vpsPriceIncrease: [
					{ type: 'vpsPurchase', unit: 'percentage', value: 5 }, 
					{ type: 'vpsUpgrade', unit: 'percentage', value: 5 }
				]
			},
		},
		{
			name:"Pro",
			pointsRequired:500,
			benefits:{
				earnRate:1.5,
				discount:5,
				discountUnit:"percentage",
				discountItems: ["domainRenewal"],
				vpsPriceIncrease: [
					{ type: 'vpsPurchase', unit: 'percentage', value: 10 }, 
					{ type: 'vpsUpgrade', unit: 'percentage', value: 10 }
				]
			}
		},
		{
			name:"Elite",
			pointsRequired:2000,
			benefits:{
				earnRate:2,
				discount:10,
				discountUnit:"percentage",
				discountItems: ["domainRenewal", "domainRegistration"],
				vpsPriceIncrease: [
					{ type: 'vpsPurchase', unit: 'percentage', value: 15 },
					{ type: 'vpsUpgrade', unit: 'percentage', value: 15 }
				]
			}
		},
		{
			name:"VIP",
			pointsRequired:5000,
			benefits:{
				earnRate:3,
				discount:20,
				discountUnit:"percentage",
				discountItems: ["domainRenewal", "domainRegistration"],
				vpsPriceIncrease: [
					{ type: 'vpsPurchase', unit: 'percentage', value: 20 },
					{ type: 'vpsUpgrade', unit: 'percentage', value: 20 }
				]
			}
		},
	];
};
	

module.exports = tierSeeder;
