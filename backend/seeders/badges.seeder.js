const MembershipTier = require('../app/models/MembershipTier');

const badgesSeeder = async()=>{
	let data = await MembershipTier.find();
	//console.log(data);
	//let starterTier = data.filter(d=>d.name =="Starter");
	let proTier = data.find(d=>d.name =="Pro");
	let eliteTier = data.find(d=>d.name =="Elite");
	let vipTier = data.find(d=>d.name =="VIP");
	return [
		{name:"First Domain Registration"},
		{name:"Pro Member", membershipTier: proTier._id},
		{name:"First 500 Points", membershipTier: proTier._id},
		{name:"Elite Member", membershipTier: eliteTier._id},
		{name:"Top Domainer", membershipTier: eliteTier._id},
		{name:"First 2000 Points", membershipTier: eliteTier._id},
		{name:"VIP Member", membershipTier: vipTier._id},
		{name:"Domain Master", membershipTier: vipTier._id},
		{name:"First 5000 Points", membershipTier: vipTier._id},
	];
} ;


module.exports= badgesSeeder;
