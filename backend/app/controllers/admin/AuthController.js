const Admin = require("../../models/Admin");
const BadRequestError = require('../../errors/BadRequestError');
const jwt = require('jsonwebtoken');

class AuthController{

	async login(req, res, next){
		const { email, password} = req.body;
        const user = await Admin.findOne({email});
        if(!user){
            throw new BadRequestError("Email is not registered with us.");
        }
        const isValid = await user.isValidPassword(password);
        if(!isValid){
            throw new BadRequestError("Invalid credentials")
        }
        const userJwt = jwt.sign({
            id:user.id,
            email:user.email
        },process.env.JWT_KEY);

        req.session.adminjwt=userJwt;
        return res.status(200).json({data:user});
	}

	async register(req, res, next){
		let admin = new Admin({
			name:req.body.name,
			email:req.body.email,
			password:req.body.password
		})
		await admin.save();
		return res.status(201).json({data:admin});
	}

	async logout(req, res, next){
        delete req.session.adminjwt;
        return res.json({});
    }
}

module.exports = new AuthController();