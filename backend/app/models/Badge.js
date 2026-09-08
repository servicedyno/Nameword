const mongoose = require('mongoose');
const {Schema} = mongoose;

const badgeSchema = new mongoose.Schema({
	name: { type: String, required: true },
	membershipTier:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'membership_tier'
	}
  },{
	timestamps: true,
	toJSON:{
        transform(doc, ret){
           
            delete ret._id;
			delete ret.membershipTier;
            delete ret.createdAt;
            delete ret.updatedAt;
            delete ret.__v;
        }
    }
  });
  
  const Badge = mongoose.model('badge', badgeSchema);
  module.exports = Badge;