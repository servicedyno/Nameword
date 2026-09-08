const crypto = require('crypto');
const env = require('../../start/env');
const moment = require('moment');
const OTP_EXPIRES_MINUTES = 10

module.exports.hash=(data, method="sha256")=>{
    const hash = crypto.createHash(method);
    hash.update(data);
    return hash.digest('hex');
}

module.exports.hmacHash=(data, method="sha256")=>{
    const hash = crypto.createHmac(method, env.APP_KEY);
    hash.update(data);
    return hash.digest('hex');
}

module.exports.strRandom=(length =20)=>{
    return crypto.randomBytes(length).toString('hex');
}

module.exports.sessionizeUser = (user)=>{
    return {
        id: user._id,
        name:user.name,
        email:user.email,
        mobile:user.mobile,
        banned: user.banned,
        deactivated:user.deactivated
    }
};

module.exports.generatePassword = (
	length = 24,
	characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
) => {
	if (length < 4) {
		throw new Error("Password length should be at least 4 to include all character types.");
	}

	const getRandomCharacter = (charSet) => {
		const randomIndex = crypto.randomInt(0, charSet.length);
		return charSet[randomIndex];
	};

	let password = [];

	// Fill the rest of the password length with random characters
	for (let i = password.length; i < length; i++) {
		password.push(getRandomCharacter(characters));
	}

	// Shuffle the password array to ensure randomness
	password = password.sort(() => crypto.randomInt(0, 2) - 1);

	return password.join('');
};

module.exports.generateRandomOtp = () =>{
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = moment().add(OTP_EXPIRES_MINUTES, "minutes");
    return { otp, expiresAt };
}