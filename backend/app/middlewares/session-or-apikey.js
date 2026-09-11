const currentUser = require("./current-user");
const validateAPIKey = require("./validate-apikey");
const requireAuth = require("./require-auth");

// Accept a signed-in session/JWT first; fall back to an x-api-key for API consumers.
const apiKeyIfNoSession = (req, res, next) => (req.user ? next() : validateAPIKey(req, res, next));

module.exports = [currentUser, apiKeyIfNoSession, requireAuth];
