const NotAuthorizedError = require("../errors/NotAuthorizedError");

const requireAdminAuth = (req, res, next)=>{
    if(!req.admin){
		//console.log("here request")
        throw new NotAuthorizedError();
    }
    next();
}

module.exports = requireAdminAuth;