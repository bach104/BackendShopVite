const mongoose = require('mongoose');

const shipperOrderSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  shipperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  status: {
    type: String,
    enum: ['đang giao', 'đã nhận được hàng', 'giao hàng thất bại'],
    required: true
  },
  deliveryStartTime: {
    type: Date,
    default: null
  },
  deliveryEndTime: {
    type: Date,
    default: null
  },
  images: [{
    type: String 
  }],
  note: {
    type: String 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('ShipperOrder', shipperOrderSchema);