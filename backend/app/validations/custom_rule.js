const UserModel = require('../models/User');
const Admin = require('../models/Admin');

module.exports.checkIfEmailExists = (value)=>{

	return UserModel.findOne({
		email: value,
		$or: [
			{ deletedAt: { $exists: false } },
			{ deletedAt: null }
		]
	}).then(user => {
		if (user) {
		  return Promise.reject('E-mail already in use');
		}
	});
}

module.exports.checkIfAdminEmailExists = (value)=>{

	return Admin.findOne({email:value}).then(user => {
		if (user) {
		  return Promise.reject('E-mail already in use');
		}
	});
}

module.exports.checkIfMobileExists = (value)=>{

	return UserModel.findOne({
		mobile: value,
		$or: [
			{ deletedAt: { $exists: false } },
			{ deletedAt: null }
		]
	}).then(user => {
		if (user) {
		  return Promise.reject('Mobile already in use');
		}
	});
}

module.exports.checkIfPasswordMatch = (value, {req})=>{
	if (value !== req.body.password && value !== req.body.newPassword ) {
		throw new Error('Password confirmation does not match password');
	}
  
	  // Indicates the success of this synchronous custom validator
	return true;
}

module.exports.checkIfUserNameExists = (value)=>{

	return UserModel.findOne({
		username: value,
		$or: [
			{ deletedAt: { $exists: false } },
			{ deletedAt: null }
		]
	}).then(user => {
		if (user) {
		  return Promise.reject('Username already in use');
		}
	});
}