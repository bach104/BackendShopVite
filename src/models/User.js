const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
  password: { type: String, required: true },
  yourname: { type: String },
  address: { type: String },
  phoneNumber: {
    type: String,
    match: /^[0-9]{10}$/, 
  },
  avatar: { type: String},
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  token: { type: String },
});
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
module.exports = mongoose.model('User', userSchema);
