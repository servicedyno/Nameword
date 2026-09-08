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
    } catch (err) {
        console.log(err);
        next(err);
    }
    next();
}

module.exports = currentUser;