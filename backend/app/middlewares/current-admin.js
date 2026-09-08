const jwt = require('jsonwebtoken');
const Admin = require("../models/Admin");


const currentAdmin = async(req, res, next)=>{
	//console.log(req.session);
    if(!req.session.adminjwt){
        //console.log("JWT not supplied, skip");
        return next();
    }

    try{
        const payload = jwt.verify(req.session.adminjwt, process.env.JWT_KEY);
        const user = await Admin.findById(payload?.id).select("-password");
        req.admin = { id: user.id, email: user.email};
    }catch(err){
        console.log(err);
    }
    next()
}
module.exports= currentAdmin;