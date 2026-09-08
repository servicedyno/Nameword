const NotAuthorizedError = require("../errors/NotAuthorizedError");

const requireAuth = (req, res, next)=>{
    if(!req.user){
        throw new NotAuthorizedError();
    }

    next();
}

module.exports = requireAuth;