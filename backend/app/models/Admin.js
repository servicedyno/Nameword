const mongoose = require('mongoose');
const {Schema} = mongoose;
const { hash, compare } = require('bcrypt');

const adminSchema = new Schema({
	name:  {
        type: String,
        required: true
    },
    email:  {
        type: String,
		unique: true,
		required: true,
    },
	password: {
        type: String,
        required: true,
    },
    username: {
        type: String,
    },
    sshKeyName: {
        type: String,
    },
    publicKey: {
        type: String,
    },
    privateKey: {
        type: String,
    },
},{
    timestamps: true ,
    toJSON:{
        transform(doc, ret){
            ret.id = ret._id;
            delete ret._id;
            delete ret.password;
            delete ret.__v;
        }
    }
});

adminSchema.pre('save', async function(next){

    if(this.isModified('password')){
        const hashedPassword =  await hash(this.get('password'), 10);
        this.set('password', hashedPassword);
    }

    next();
});

adminSchema.method('isValidPassword', async function(password){
    const isValid = await compare(password, this.get('password'));
    return isValid;
});

const Admin = mongoose.model('admin', adminSchema);
module.exports = Admin;