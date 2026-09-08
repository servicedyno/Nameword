const axios = require("axios");
const dotenv = require("dotenv");
const ServiceUnavailableError = require("../errors/ServiceUnavailableError");

dotenv.config();

const API_URL = "https://api.connectreseller.com/ConnectReseller/ESHOP/";
const API_KEY = process.env.CONNECTSELLER_API_KEY;

if (!API_KEY) {
	console.error(
		"API key is missing. Please set CONNECTSELLER_API_KEY in your environment variables."
	);
	throw new Error(
		"API key is missing. Please set CONNECTSELLER_API_KEY in your environment variables."
	);                        
}                                                              		                
	       
module.exports.get = async (type, params) => {
	try {
		console.log(`Fetching data from ${type}...`);
		console.log(`Request parameters: ${JSON.stringify(params.params)}`);
		const response = await axios.get(`${API_URL}${type}`, {
			headers: {
				"Content-Type": "application/json",
			},
			params: {
				APIKey: API_KEY,
				...params,
			},
		});
		return response.data;
	} catch (error) {
		console.log("axios", error);
		if (error.response) {
			//console.log('Response error:', error.response);
			//console.error('Response data:', error.response.data);
			// console.error('Response status:', error.response.status);
			// console.error('Response headers:', error.response.headers);
			throw new Error(
				`Invalid API Key or API request failed with status ${error.response.data.statusCode}: ${error.response.data.responseText}`,
				{ cause: error }
			);
		} else if (error.request) {
			//console.error('Request data:', error.request);
			throw new Error("API request failed: No response received");
		} else {
			//console.error('Error message:', error.message);
			throw new Error(`API request failed: ${error.message}`);
		}
	}
};

module.exports.request = async (type, params, method = "get") => {
	try {
		const response = await axios.get(`${API_URL}${type}`, {
			headers: {
				"Content-Type": "application/json",
			},
			params: {
				APIKey: API_KEY,
				...params,
			},
		});
		return response.data;
	} catch (error) {
		console.error("Error fetching data from third-party API:", error);
		// Handle different types of errors
		if (error.response) {
			throw new Error(
				error.response.data.statusText ||
					error.response.statusText ||
					"An error occurred"
			);
		} else if (error.request) {
			throw new ServiceUnavailableError();
		} else {
			throw new Error(error.message || "Internal Server Error");
		}
	}
};
