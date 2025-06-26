const mongoose = require('mongoose');
const transactionSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true }, 
    momoOrderId: { type: String }, 
    amount: { type: Number, required: true },
    status: { type: String, default: 'Thất bại' },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    order: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order' 
    },
    cartItems: { type: Array, default: [] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);