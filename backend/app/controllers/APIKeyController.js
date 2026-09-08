const User = require('../models/User');
const APIKey = require('../models/APIKey');
const cryptr = require('../services/cryptr');
const { generateApiKey } = require('generate-api-key');
const { hmacHash } = require('../utils/common');
const NotFoundError = require('../errors/NotFoundError');


class APIKeyController{

    async store(req, res){
        const { name, expiration } = req.body;
        const user = await User.findById(req.user.id).populate('apiKeys');

        let key = generateApiKey({ method: 'uuidv4', dashes: false });

        const apiKey = new APIKey({
            name: name,
            tokenHash:hmacHash(key),
            token:cryptr.encrypt(key),
            user: user._id,
            expiresAt: expiration
        });
        await apiKey.save();
        await user.apiKeys.push(apiKey);
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'The Key has been created',
            data: apiKey.toJSON({ virtuals: true })
        });
    }

    async list(req, res){
        let user = await User.findById(req.user.id).populate({
            path: "apiKeys",
            match: { deletedAt: null },
        });

        if(!user){
            throw new NotFoundError('User not found!');
        }
        const apiKeysJson = user.apiKeys.map(apiKey => apiKey.toJSON({virtuals:true}));
        return res.status(200).json({
            success: true,
            message: 'API keys retrieved successfully.',
            data: apiKeysJson
        });
    }

    async destroy(req, res){
        let apiKey = await APIKey.findById(req.params.id);

        if(!apiKey){
            throw new NotFoundError('API key not found!');
        }

        await APIKey.updateOne({ _id: req.params.id }, { deletedAt: new Date() })

        return res.status(200).json({
            success: true,
            message: 'API key deleted successfully.'
        });
    }

    async updateUseAPIKeyTime(tokenHash){
       return await APIKey.updateOne({ tokenHash }, { lastUsedAt: new Date() });
    }


}

module.exports = new APIKeyController();