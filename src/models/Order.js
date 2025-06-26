const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    size: String,
    color: String,
    image: String
  }],
  shippingInfo: {
    yourname: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  paymentMethod: {
    type: String,
    enum: ['thanh toán khi nhận hàng', 'chuyển khoản'],
    default: 'thanh toán khi nhận hàng'
  },
  status: {
    type: String,
    enum: [
      'đang chờ xác nhận',
      'shop đang đóng gói',
      'đã giao cho bên vận chuyển',
      'đang giao',
      'đã nhận được hàng',
      'giao hàng thất bại',
      'đã huỷ',
      'hết hàng'],
    default: 'đang chờ xác nhận'
  },
  cancelledReason: String,
  subtotal: {
    type: Number,
    required: true
  },
  shippingFee: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  images: [{
    type: String
  }],

}, {
  timestamps: true
});
module.exports = mongoose.model('Order', orderSchema);