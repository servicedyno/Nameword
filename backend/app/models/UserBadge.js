const mongoose = require('mongoose');
const {Schema} = mongoose;

const userBadgeSchema = new Schema({
	badge: { type: mongoose.Schema.Types.ObjectId, ref: 'badge', required: true },
	earnedDate: { type: Date, default: Date.now }
},{
	toJSON: {
        transform(doc, ret){

            delete ret._id;

            delete ret.__v;
        }
    }
});

//const UserBadge = mongoose.model('user_badge', userBadgeSchema);
module.exports = userBadgeSchema;