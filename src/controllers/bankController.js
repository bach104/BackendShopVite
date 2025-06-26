const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const accessKey = 'F8BBA842ECF85';
const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
const partnerCode = 'MOMO';
exports.createPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (!req.user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(401).json({
                error: true,
                message: 'Bạn cần đăng nhập để thực hiện thanh toán'
            });
        }
        const { amount, orderInfo, cartItems, shippingInfo, subtotal, shippingFee, totalAmount } = req.body;
        if (!amount || isNaN(amount) || amount < 1000 || amount > 50000000) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                error: true,
                message: 'Số tiền phải từ 1,000 VND đến 50,000,000 VND'
            });
        }
        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                error: true,
                message: 'Giỏ hàng không hợp lệ'
            });
        }
        const invalidCartItems = [];
        const validCartItems = [];
        await Promise.all(cartItems.map(async (item) => {
            try {
                const cartItem = await Cart.findOne({
                    _id: item._id,
                    userId: req.user.userId
                }).populate('productId').session(session);
                
                if (!cartItem || !cartItem.productId) {
                    invalidCartItems.push(item._id);
                } else {
                    if (cartItem.quantity < item.quantity) {
                        invalidCartItems.push(item._id);
                    } else {
                        validCartItems.push({
                            ...item,
                            product: cartItem.productId 
                        });
                    }
                }
            } catch (error) {
                invalidCartItems.push(item._id);
            }
        }));
        if (invalidCartItems.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                error: true,
                message: 'Một số sản phẩm trong giỏ hàng không hợp lệ hoặc đã thay đổi',
                invalidItems: invalidCartItems
            });
        }
        const newOrder = new Order({
            userId: req.user.userId,
            items: validCartItems.map(item => ({
                productId: item.productId || item.product._id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                size: item.size,
                color: item.color,
                image: item.image
            })),
            shippingInfo,
            paymentMethod: 'chuyển khoản',
            status: 'đang chờ xác nhận',
            subtotal,
            shippingFee,
            totalAmount
        });
        const savedOrder = await newOrder.save({ session });
        await Cart.deleteMany({
            _id: { $in: cartItems.map(item => item._id) },
            userId: req.user.userId
        }).session(session);
        const redirectUrl = 'http://localhost:5173/cart-manager';
        const ipnUrl = 'https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b';
        const requestType = "payWithMethod";
        const orderId = partnerCode + new Date().getTime();
        const requestId = orderId;
        const extraData = '';
        const orderGroupId = '';
        const autoCapture = true;
        const lang = 'vi';
        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        const signature = crypto.createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');

        const newTransaction = new Transaction({
            orderId,
            momoOrderId: orderId,
            amount,
            userId: req.user.userId,
            order: savedOrder._id,
            cartItems: validCartItems,
            status: 'pending'
        });

        await newTransaction.save({ session });
        const requestBody = {
            partnerCode,
            partnerName: "Test",
            storeId: "MomoTestStore",
            requestId,
            amount,
            orderId,
            orderInfo: orderInfo || 'Thanh toán qua MoMo',
            redirectUrl,
            ipnUrl,
            lang,
            requestType,
            autoCapture,
            extraData,
            orderGroupId,
            signature
        };
        const options = {
            method: 'POST',
            url: 'https://test-payment.momo.vn/v2/gateway/api/create',
            headers: {
                'Content-Type': 'application/json'
            },
            data: requestBody
        };

        const result = await axios(options);
        
        if (result.data.resultCode === 0) {
            newTransaction.status = 'thành công';
            await newTransaction.save({ session });
            savedOrder.status = 'đang chờ xác nhận';
            await savedOrder.save({ session });
            
            await session.commitTransaction();
            session.endSession();
            
            res.status(200).json({
                ...result.data,
                transactionId: newTransaction._id,
                orderId: savedOrder._id,
                payUrl: result.data.payUrl
            });
        } else {
            await session.abortTransaction();
            session.endSession();
            
            res.status(400).json({
                error: true,
                message: "Thanh toán không thành công",
                detail: result.data.message
            });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error in createPayment:', error);
        
        if (error.response) {
            res.status(error.response.status).json({
                error: true,
                message: "Lỗi khi gọi API thanh toán",
                detail: error.response.data
            });
        } else {
            res.status(500).json({
                error: true,
                message: "Lỗi server",
                detail: error.message
            });
        }
    }
};

exports.processPaymentResult = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { orderId, resultCode, amount, transId, message } = req.body;
        
        const transaction = await Transaction.findOne({ orderId }).session(session);
        if (!transaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                error: true,
                message: 'Không tìm thấy giao dịch'
            });
        }
        
        const order = await Order.findById(transaction.order).session(session);
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                error: true,
                message: 'Không tìm thấy đơn hàng'
            });
        }
        
        if (resultCode === 0) {
            transaction.status = 'thành công';
            transaction.momoTransId = transId;
            await transaction.save({ session });
            
            order.status = 'shop đang đóng gói';
            await order.save({ session });
            
            await session.commitTransaction();
            session.endSession();
            
            return res.status(200).json({
                success: true,
                message: 'Cập nhật trạng thái thanh toán thành công'
            });
        } else {
            transaction.status = 'failed';
            transaction.message = message;
            await transaction.save({ session });
            
            order.status = 'đã hủy';
            order.cancelledReason = `Thanh toán thất bại: ${message}`;
            await order.save({ session });
            
            await Cart.insertMany(
                transaction.cartItems.map(item => ({
                    userId: transaction.userId,
                    productId: item.productId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color,
                    image: item.image
                })),
                { session }
            );
            
            await session.commitTransaction();
            session.endSession();
            
            return res.status(200).json({
                success: true,
                message: 'Đã cập nhật trạng thái thanh toán thất bại và khôi phục giỏ hàng'
            });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error in processPaymentResult:', error);
        res.status(500).json({
            error: true,
            message: "Lỗi khi xử lý kết quả thanh toán",
            detail: error.message
        });
    }
};