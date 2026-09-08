const BadRequestError = require("../../errors/BadRequestError");
const User = require("../../models/User");

class UserController{
	async list(req, res,next){
		let query = {};
		const { page = 1, limit = 10 , search=""} = req.query;
		if(search != ""){
			query.email= { $regex: search, $options: "i" };
		}
		let users = await User.paginate(query,{
			page,
			limit,
			customLabels:{
				totalDocs: 'totalCount',
  				docs: 'users',
				page: 'currentPage',
				pagingCounter: false,
				meta: 'meta',
			}
		});
		return res.status(200).json({data:users});
	}

	async banUser(req, res, next){
		let user = await User.findById(req.params.userId);
		if(!user){
			throw new BadRequestError("User not found!");
		}
		user.banned = true;
		await user.save();
	
		return res.status(200).json({message:"User banned successfully",user:user});
	}

	async unbanUser(req, res, next){
		let user = await User.findById(req.params.userId);
		if(!user){
			throw new BadRequestError("User not found!");
		}
		user.banned = false;
		await user.save();
	
		return res.status(200).json({message:"User unbanned successfully",user:user});
	}

	async deleteUser(req, res, next){
		let user = await User.findById(req.params.userId);
		if(!user){
			throw new BadRequestError("User not found!");
		}
		await user.deleteOne();

		return res.status(204).send();
	}
}

module.exports = new UserController();