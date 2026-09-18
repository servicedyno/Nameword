const jwt = require('jsonwebtoken');
const User = require("../models/User");
const { sessionizeUser } = require('../utils/common');
const ForbiddenError = require('../errors/ForbiddenError');
const UserSession = require('../models/UserSession');
const NotAuthorizedError = require('../errors/NotAuthorizedError');

const currentUser = async (req, res, next) => {
    if (req.user) {
        //console.log("Api key found user, skip");
        return next();
    }
    
    // Try to get token from session cookie first
    let token = req.session.jwt;
    
    // Fallback: Try Authorization header if cookie not available (for iOS compatibility)
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            token = authHeader;
        }
    }
    
    if (!token) {
        //console.log("JWT not supplied, skip");
        return next();
    }
    
    try {
        const payload = jwt.verify(token, process.env.JWT_KEY);
        const user = await User.findById(payload?.id).select("-password");

        // Valid signature but the account no longer exists → stale session.
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Your session is no longer valid. Please sign in again.",
            });
        }

        const userSession = await UserSession.findById(payload?.sessionId);
        if (!userSession){
            throw new NotAuthorizedError();
        }

        if (user.banned) {
            throw new ForbiddenError("Your account has been banned. Please contact support for further assistance.");
        }
        if (user.deactivated) {
            throw new ForbiddenError("Your account has been deactivated. Please contact support for further assistance.");
        }
        req.user = sessionizeUser(user);
        req.user.sessionId = payload?.sessionId;
        return next();
    } catch (err) {
        // A malformed / invalid / expired bearer token is a CLIENT auth failure,
        // not a server error → respond 401 instead of bubbling to the 500 handler.
        // (jwt.TokenExpiredError / NotBeforeError both extend JsonWebTokenError.)
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired session. Please sign in again.",
            });
        }
        // Custom auth errors (NotAuthorizedError → 401 / ForbiddenError → 403) and
        // any unexpected error are delegated to the global error handler unchanged.
        return next(err);
    }
}

module.exports = currentUser;