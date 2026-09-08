const axios = require("axios");
const geoip = require("geoip-country");
const Tax = require("../../models/Tax");

class TaxController {
	constructor() {
		this.baseUrl = "https://api.apilayer.com";
		this.apiKey = process.env.APILAYER_TAX_API_KEY || "";
		console.log("[TaxController] APILAYER_TAX_API_KEY present:", !!this.apiKey);
	}

	async getOrFetchTaxRate(countryCode) {
		if (!countryCode) {
			return { taxRate: null, countryName: null, fromCache: false };
		}

		const upperCountryCode = countryCode.toUpperCase();

		try {
			// Step 1: Check Local Database
			const existingTax = await Tax.findOne({ countryCode: upperCountryCode });
			
			if (existingTax) {
				console.log(`[TaxController] Tax rate found in database for ${upperCountryCode}: ${existingTax.taxRate} (from cache)`);
				return {
					taxRate: existingTax.taxRate,
					countryName: existingTax.countryName || upperCountryCode,
					taxType: existingTax.taxType || "VAT",
					fromCache: true,
				};
			}

			// Step 2: Not in database, fetch from API
			console.log(`[TaxController] Tax rate not in database for ${upperCountryCode}, fetching from API...`);
			
			if (!this.apiKey) {
				console.warn("[TaxController] APILAYER_TAX_API_KEY not configured");
				return { taxRate: null, countryName: upperCountryCode, taxType: "VAT", fromCache: false };
			}

			const response = await axios.get(
				`${this.baseUrl}/tax_data/tax_rates`,
				{
					params: {
						country: upperCountryCode,
					},
					headers: {
						apikey: this.apiKey,
					},
				}
			);

			console.log("[TaxController] Tax Data API response:", {
				country: upperCountryCode,
				status: response.status,
				data: response.data,
			});

			// Extract tax rate from response
			let taxRate = null;
			let taxType = "default";
			
			if (response.data) {
				if (response.data.standard_rate !== undefined) {
					taxRate = parseFloat(response.data.standard_rate) / 100;
					taxType = "VAT";
				} else if (response.data.tax_rate !== undefined) {
					taxRate = parseFloat(response.data.tax_rate) / 100;
				} else if (typeof response.data === "number") {
					taxRate = response.data / 100;
				} else if (response.data.rates && response.data.rates.standard) {
					taxRate = parseFloat(response.data.rates.standard) / 100;
					taxType = "VAT";
				}

				// Determine tax type based on country
				const countryTaxTypeMap = {
					// GST countries
					"IN": "GST",
					"AU": "GST",
					"NZ": "GST",
					
					// VAT countries (non-EU)
					"AD": "NRT", // Andorra - NRT
					"BH": "VAT", // Bahrain
					"CH": "VAT", // Switzerland
					"GB": "VAT", // United Kingdom
					"GE": "VAT", // Georgia
					"GT": "VAT", // Guatemala
					"IL": "VAT", // Israel
					"IS": "VAT", // Iceland
					"LI": "VAT", // Liechtenstein
					"MD": "VAT", // Moldova
					"MU": "VAT", // Mauritius
					"NO": "VAT", // Norway
					"OM": "VAT", // Oman
					"SA": "VAT", // Saudi Arabia
					"TH": "VAT", // Thailand
					"TW": "VAT", // Taiwan
					"UA": "VAT", // Ukraine
					"ZA": "VAT", // South Africa
					
					// TIN countries
					"AF": "TIN", // Afghanistan
					"AG": "TIN", // Antigua and Barbuda
					"AL": "TIN", // Albania
					"AM": "TIN", // Armenia
					"AO": "TIN", // Angola
					"AW": "TIN", // Aruba
					"AZ": "TIN", // Azerbaijan
					"BA": "TIN", // Bosnia and Herzegovina
					"BB": "TIN", // Barbados
					"BO": "TIN", // Bolivia
					"BS": "TIN", // Bahamas
					"BY": "TIN", // Belarus
					"CN": "TIN", // China
					"CR": "TIN", // Costa Rica
					"DZ": "TIN", // Algeria
					"EG": "TIN", // Egypt
					"GH": "TIN", // Ghana
					"ME": "TIN", // Montenegro
					"MK": "TIN", // North Macedonia
					"MY": "TIN", // Malaysia
					"NG": "TIN", // Nigeria
					"PH": "TIN", // Philippines
					"PY": "TIN", // Paraguay
					"RS": "TIN", // Serbia
					"TR": "TIN", // Turkey
					"VN": "TIN", // Vietnam
					
					// Special tax types
					"AE": "TRN", // United Arab Emirates
					"BD": "BIN", // Bangladesh
					"BF": "IFU", // Burkina Faso
					"BJ": "IFU", // Benin
					"BR": "CNPJ", // Brazil - Business
					"AR": "CUIT", // Argentina
					"US": "EIN", // United States
					"CA": "BN", // Canada
					"MX": "RFC", // Mexico
					"CL": "RUT", // Chile
					"CO": "NIT", // Colombia
					"PE": "RUC", // Peru
					"EC": "RUC", // Ecuador
					"PA": "RUC", // Panama
					"DO": "RCN", // Dominican Republic
					"UY": "RUT", // Uruguay
					"VE": "RIF", // Venezuela
					"HK": "BR", // Hong Kong
					"ID": "NPWP", // Indonesia
					"JP": "CN", // Japan
					"KE": "PIN", // Kenya
					"KR": "BRN", // South Korea
					"KZ": "BIN", // Kazakhstan
					"MC": "NIF", // Monaco
					"PK": "STRN", // Pakistan
					"RU": "INN", // Russia
					"SG": "UEN", // Singapore
				};

				// EU countries use VAT (27 countries)
				const euCountries = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
				if (euCountries.includes(upperCountryCode)) {
					taxType = "VAT";
				} else if (countryTaxTypeMap[upperCountryCode]) {
					taxType = countryTaxTypeMap[upperCountryCode];
				}
			}

			if (taxRate === null) {
				console.warn(`[TaxController] Could not extract tax rate for ${upperCountryCode}`);
				return { taxRate: null, countryName: upperCountryCode, taxType: "VAT", fromCache: false };
			}

			// Step 3: Save to Database
			try {
				const newTax = new Tax({
					countryCode: upperCountryCode,
					countryName: response.data?.country_name || upperCountryCode,
					taxRate: taxRate,
					taxType: taxType,
					rawApiResponse: response.data,
					lastUpdated: new Date(),
				});

				await newTax.save();
				console.log(`[TaxController] ✅ Saved tax rate for ${upperCountryCode} to database: ${taxRate} (${taxType})`);

				return {
					taxRate: taxRate,
					countryName: newTax.countryName || upperCountryCode,
					taxType: taxType,
					fromCache: false,
				};
			} catch (saveError) {
				// If duplicate key error, someone else saved it concurrently, fetch again
				if (saveError.code === 11000) {
					const savedTax = await Tax.findOne({ countryCode: upperCountryCode });
					if (savedTax) {
						console.log(`[TaxController] Tax rate was saved concurrently, using cached value for ${upperCountryCode}`);
						return {
							taxRate: savedTax.taxRate,
							countryName: savedTax.countryName || upperCountryCode,
							taxType: savedTax.taxType || "VAT",
							fromCache: true,
						};
					}
				}
				console.error(`[TaxController] Failed to save tax rate for ${upperCountryCode}:`, saveError);
				// Return the rate even if save failed
				return {
					taxRate: taxRate,
					countryName: upperCountryCode,
					taxType: taxType,
					fromCache: false,
				};
			}
		} catch (error) {
			console.error(`[TaxController] Error fetching tax rate for ${upperCountryCode}:`, error.response?.data || error.message);
			return { taxRate: null, countryName: upperCountryCode, taxType: "VAT", fromCache: false };
		}
	}

	// Get user's country from IP address and fetch tax rate
	async getUserCountry(req, res) {
		try {
			// Get client IP address
			const clientIp =
				req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
				req.headers["x-real-ip"] ||
				req.connection?.remoteAddress ||
				req.socket?.remoteAddress ||
				req.ip ||
				"127.0.0.1";

			console.log("[TaxController] Detecting country for IP:", clientIp);

			// Lookup country from IP using geoip-country
			const geoData = geoip.lookup(clientIp);

			if (!geoData || !geoData.country) {
				console.warn("[TaxController] Could not detect country for IP:", clientIp);
				return res.status(200).json({
					success: true,
					responseMsg: {
						statusCode: 200,
						message: "Country detection unavailable",
					},
					responseData: {
						country: null,
						countryName: null,
						taxRate: null,
						ip: clientIp,
					},
				});
			}

			const countryCode = geoData.country;
			console.log("[TaxController] Detected country:", countryCode, "for IP:", clientIp);

			// Use the new getOrFetchTaxRate method (checks DB first, then API)
			const { taxRate, countryName, taxType, fromCache } = await this.getOrFetchTaxRate(countryCode);

			console.log(`[TaxController] Tax rate for ${countryCode}: ${taxRate} (${taxType || 'VAT'}) (${fromCache ? 'from cache' : 'from API'})`);

			return res.status(200).json({
				success: true,
				responseMsg: {
					statusCode: 200,
					message: "Country detected successfully",
				},
				responseData: {
					country: countryCode,
					countryName: countryName || geoData.name || countryCode,
					taxRate: taxRate,
					taxType: taxType || "VAT",
					ip: clientIp,
					fromCache: fromCache,
				},
			});
		} catch (error) {
			console.error("Error in getUserCountry:", error);
			return res.status(500).json({
				success: false,
				responseMsg: {
					statusCode: 500,
					message: error.message || "Internal server error",
				},
				responseData: null,
			});
		}
	}

	// Get tax rate for a specific country
	async getTaxRate(req, res) {
		try {
			const { country } = req.query;

			if (!country) {
				return res.status(400).json({
					success: false,
					responseMsg: {
						statusCode: 400,
						message: "Country code is required",
					},
					responseData: null,
				});
			}

			// Use the new getOrFetchTaxRate method (checks DB first, then API)
			const { taxRate, countryName, taxType, fromCache } = await this.getOrFetchTaxRate(country);

			if (taxRate === null) {
				return res.status(200).json({
					success: false,
					responseMsg: {
						statusCode: 200,
						message: "Could not retrieve tax rate for this country",
					},
					responseData: {
						country: country.toUpperCase(),
						taxRate: null,
						taxType: "VAT",
					},
				});
			}

			return res.status(200).json({
				success: true,
				responseMsg: {
					statusCode: 200,
					message: "Tax rate retrieved successfully",
				},
				responseData: {
					country: country.toUpperCase(),
					countryName: countryName,
					taxRate: taxRate,
					taxType: taxType || "VAT",
					fromCache: fromCache,
				},
			});
		} catch (error) {
			console.error("Error in getTaxRate:", error);
			return res.status(500).json({
				success: false,
				responseMsg: {
					statusCode: 500,
					message: error.message || "Internal server error",
				},
				responseData: null,
			});
		}
	}

	// Validate VAT ID
	async validateVatId(req, res) {
		try {
			const { country_code, vat_number } = req.body;

			if (!country_code || !vat_number) {
				return res.status(400).json({
					success: false,
					responseMsg: {
						statusCode: 400,
						message: "Country code and VAT number are required",
					},
					responseData: null,
				});
			}

			if (!this.apiKey) {
				console.error("[TaxController] APILAYER_TAX_API_KEY not configured");
				return res.status(500).json({
					success: false,
					responseMsg: {
						statusCode: 500,
						message: "Tax API configuration error",
					},
					responseData: null,
				});
			}

			try {
				const response = await axios.get(
					`${this.baseUrl}/tax_data/validate`,
					{
						params: {
							country_code: country_code.toUpperCase(),
							vat_number: vat_number,
						},
						headers: {
							apikey: this.apiKey,
						},
					}
				);

				console.log("[TaxController] VAT Validation API response:", {
					country_code,
					vat_number,
					status: response.status,
					data: response.data,
				});

				const isValid = response.data?.valid === true;

				const taxRate = isValid ? 0 : null;

				return res.status(200).json({
					success: true,
					responseMsg: {
						statusCode: 200,
						message: isValid
							? "VAT ID validated successfully"
							: "VAT ID validation failed",
					},
					responseData: {
						country_code: country_code.toUpperCase(),
						vat_number: vat_number,
						isValid: isValid,
						taxRate: taxRate,
						rawResponse: response.data,
					},
				});
			} catch (apiError) {
				console.error("[TaxController] VAT Validation API error:", {
					country_code,
					vat_number,
					error: apiError.response?.data || apiError.message,
					status: apiError.response?.status,
				});

				return res.status(200).json({
					success: false,
					responseMsg: {
						statusCode: 200,
						message: "VAT ID validation unavailable",
					},
					responseData: {
						country_code: country_code.toUpperCase(),
						vat_number: vat_number,
						isValid: false,
						taxRate: null,
						error: apiError.response?.data || apiError.message,
					},
				});
			}
		} catch (error) {
			console.error("Error in validateVatId:", error);
			return res.status(500).json({
				success: false,
				responseMsg: {
					statusCode: 500,
					message: error.message || "Internal server error",
				},
				responseData: null,
			});
		}
	}
}

module.exports = new TaxController();

