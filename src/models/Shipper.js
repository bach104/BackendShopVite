const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShipperSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  yourname: {
    type: String,
    required: false,
    trim: true,
  },
  address: {
    type: String,
    required: false,
    trim: true,
  },
  avatar: {
    type: String,
    required: false,
    default: 'default-avatar.jpg',
  },
  phoneNumber: {
    type: String,
    required: false,
    match: [/^\d{10}$/, 'Số điện thoại không hợp lệ'],
  },
  cccd: {
    type: String,
    required: false,
    match: [/^\d{9,12}$/, 'CCCD phải có từ 9 đến 12 chữ số'],
    trim: true,
  },
  licensePlate: {
    type: String,
    required: false,
    match: [/^[0-9A-Za-z]{8,12}$/, 'Biển số xe không hợp lệ'],
    trim: true,
    uppercase: true,
  },
  cccdFrontImage: {
    type: String,
    required: false,
  },
  cccdBackImage: {
    type: String,
    required: false,
  },
  licensePlateImage: {
    type: String,
    required: false,
  }
}, {
  timestamps: true,
});

const Shipper = mongoose.model('Shipper', ShipperSchema);
module.exports = Shipper;