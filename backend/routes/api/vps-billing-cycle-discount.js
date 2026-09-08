const router = require("express").Router();
const { getVPSBillingCycleDiscount, getVPSBillingCycle } = require("../../app/controllers/vps-billing-cycle-discount/vps-billing-cycle-discount");

// Get all VPS Plans
router.get('/all', getVPSBillingCycleDiscount)



// For future use if needed
// {
// 	"name": "Retrieve Billing Cycles for VPS Plan",
// 	"request": {
// 		"method": "GET",
// 		"header": [
// 			{
// 				"key": "Content-Type",
// 				"value": "application/json"
// 			}
// 		],
// 		"url": {
// 			"raw": "{{base_url}}/vps-billing-cycle-discount/billing-rates/{{plan_id}}",
// 			"host": [
// 				"{{base_url}}"
// 			],
// 			"path": [
// 				"vps-billing-cycle-discount",
// 				"billing-rates",
// 				"{{plan_id}}"
// 			]
// 		}
// 	},
// 	"response": []
// }
router.get('/billing-rates/:planId', getVPSBillingCycle)

module.exports = router;