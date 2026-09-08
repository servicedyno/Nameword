require("dotenv").config();

const config = {
  hostbay: {
  apiUrl: "https://api.hostbay.io/api/v1/",
  // apiUrl: 'https://b611e40a-f793-46e4-8b5f-69695e07954c-00-w29elnqfd1yw.janeway.replit.dev/api/v1',
  // apiUrl: "https://staging-api.hostbay.io/api/v1/",
  apiKey: `Bearer ${process.env.HOSTBAY_API_KEY}`,
},

  openprovider: {
    apiUrl: "https://api.openprovider.eu/v1beta",
    // apiUrl: "http://api.sandbox.openprovider.nl:8480/v1beta/",
    username: process.env.OPENPROVIDER_USERNAME,
    password: process.env.OPENPROVIDER_PASSWORD,
  },
  connectreseller: {
    apiUrl: "https://api.connectreseller.com/ConnectReseller/ESHOP/",
    // apiUrl: "https://staging.connectreseller.com/",
    apiKey: process.env.CONNECTSELLER_API_KEY,
  },
  price_diffrence_threshold: 3
};

// Validate ConnectReseller API Key
if (!config.connectreseller.apiKey) {
  console.error(
    "ConnectReseller API key is missing. Please set CONNECTSELLER_API_KEY in your environment variables."
  );
  throw new Error("ConnectReseller API key is missing.");
}

// Validate HostBay API Key (warn but don't throw, as it's optional for some deployments)
if (!config.hostbay.apiKey) {
  console.warn(
    "HostBay API key is missing. Please set HOSTBAY_API_KEY in your environment variables if using HostBay provider."
  );
}



module.exports = config;