import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
   firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true,
    maxlength: [25, 'First name cannot be more than 25 characters']
  },

 lastName: {
    type: String,
    required: [true, 'Please add a lastName '],
    trim: true,
    maxlength: [25, 'First name cannot be more than 25 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  availableTime: {
  type: Map,
  of: {
    from: {
      type: Number,
      min: 0,
      max: 23
    },
    to: {
      type: Number,
      min: 0,
      max: 23
    }
  },
  default: {} 
},



  specialization: [{
    type: String,
    required: true
  }],
 
  avatar: {
    type: String,
    default: 'default-avatar.jpg'
  },

   phoneNumber: {
    type: String,
  },
  
  confirmed: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedAt: Date,
  blockedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  resetCode: String,
  resetCodeExpire: Date,
  lastLogin: Date
}, {
  timestamps: true
});

// Encrypt password using bcrypt
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) {
//     next();
//   }
  
//   const salt = await bcrypt.genSalt(10);
//   this.password = bcrypt.hashSync(this.password, salt);
// });

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};


// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 
  
  return resetToken;
};

// Block user
userSchema.methods.blockUser = function(blockedBy) {
  this.isBlocked = true;
  this.blockedAt = new Date();
  this.blockedBy = blockedBy;
};

// Unblock user
userSchema.methods.unblockUser = function() {
  this.isBlocked = false;
  this.blockedAt = undefined;
  this.blockedBy = undefined;
};

export default mongoose.model('User', userSchema);