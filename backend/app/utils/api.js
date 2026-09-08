const apiClient = require('./apiclient');
const domainProviderApiClient = require('./domainProviderApiClient');
const BadRequestError = require('../errors/BadRequestError');

module.exports.getPriceForDomain = async(websiteName, duration,provider = "openprovider") => {
	const priceResponse = await domainProviderApiClient.request('checkDomainPrice', { websiteName },null,provider);
	if(!priceResponse.responseData){
		throw new BadRequestError("Domain Not Available for Registration");
	}
	const data = priceResponse.responseData[0];
	const result = data.map(item => {
		const match = item.description.match(/for (\d+) year.*is (\d+\.\d+)/);
		if (match) {
			return {
				year: parseInt(match[1], 10),
				price: parseFloat(match[2])


			};
		}
		return null; // Return null or handle the case if the regex doesn't match
	}).filter(item => item !== null);
	let domainPrice = result.find(r=> r.year == duration);          
	return domainPrice;                                                                       `	                                                                               `
}                                                                                                              
                           

                          
 
                 