const NotAuthorizedError = require("../errors/NotAuthorizedError");
const { hmacHash, sessionizeUser } = require('../utils/common');
const User = require('../models/User');
const env = require("../../start/env");

const validateAdminRegisterKey = async (req, res, next)=>{

    let token = req.headers['x-api-key'];

    if(!token){
        throw new NotAuthorizedError();
    }
    
	let admin_api_token = env.ADMIN_REGISTER_TOKEN;

    if(admin_api_token !== token){
        throw new NotAuthorizedError();
    }
  
    next();
};

module.exports = validateAdminRegisterKey;