                            const mongoose = require('mongoose');
const {Schema} = mongoose;
const cryptr = require('../services/cryptr');

const apiKeySchema = new Schema({
    user:{
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },                                                                                                 
    name:{
        type: String,
        required: true
    },
    tokenHash:{
        type:String,                          
        required:true
    },                                                                                                                                                                                                                                                 
    token:{
        type:String,
        required:true
    },
    expiresAt:{                                                              
        type: Date,
        required: true
    },
    lastUsedAt:{
        type: Date
    },
    deletedAt: {
        type: Date,
        default: null
    }                                                                                                                             
},{
    timestamps: true ,
    toJSON:{
        transform(doc, ret){
            ret.id = ret._id;
            delete ret._id;
            delete ret.user;
            delete ret.token;
            delete ret.tokenHash;
            delete ret.__v;
        }
    }
});                                                                                                                                                  
apiKeySchema.virtual('apiKey').get(function() {
    return `${this.get('user')}|${cryptr.decrypt(this.get('token'))}`;
});                                                       

apiKeySchema.post('deleteOne', {document:true} ,async function(          doc, next){
    try {
        // Get the `ApiKey` document that was deleted
        const apiKey = doc;
      
        const User = mongoose.model('user');
        // Update all `User` documents to remove the deleted `ApiKey` from their `apiKeys` field
        await User.updateOne(
            { _id: apiKey.user, apiKeys: apiKey._id },
            { $pull: { apiKeys: apiKey._id } }
        );
    } catch (error) {
        console.error('Error removing reference from User collection:', error);
    }finally{
        next();
    }
});

const APIKey = mongoose.model('api_key', apiKeySchema);
module.exports = APIKey;                                                                         