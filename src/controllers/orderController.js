const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const ShipperOrder = require('../models/shipperorder');
const Shipper = require('../models/Shipper');
const mongoose = require('mongoose');
const { createPayment } = require('./bankController');

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { cartIds, paymentMethod = 'thanh toán khi nhận hàng' } = req.body;
    const userId = req.user.userId;
    
    const user = await User.findById(userId).session(session);
    if (!user.yourname || !user.phoneNumber || !user.address) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cập nhật đầy đủ thông tin (họ tên, số điện thoại, địa chỉ) trước khi đặt hàng'
      });
    }
    const cartItems = await Cart.find({
      _id: { $in: cartIds },
      userId
    }).session(session);
    
    if (cartItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong giỏ hàng'
      });
    }

    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shippingFee = subtotal * 0.15;
    const totalAmount = Math.round(subtotal + shippingFee);

    if (paymentMethod === 'chuyển khoản') {
      await session.abortTransaction();
      session.endSession();
      
      const orderInfo = `Thanh toán đơn hàng từ ${user.yourname}`;
      const shippingInfo = {
        yourname: user.yourname,
        phoneNumber: user.phoneNumber,
        address: user.address
      };
      
      req.body = {
        ...req.body,
        amount: totalAmount,
        orderInfo,
        cartItems: cartItems.map(item => ({
          _id: item._id,
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          image: item.image
        })),
        shippingInfo,
        subtotal,
        shippingFee,
        totalAmount
      };
      
      return createPayment(req, res);
    }

    const order = new Order({
      userId,
      items: cartItems.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        image: item.image
      })),
      shippingInfo: {
        yourname: user.yourname,
        phoneNumber: user.phoneNumber,
        address: user.address
      },
      paymentMethod,
      subtotal,
      shippingFee,
      totalAmount
    });

    await order.save({ session });
    await Cart.deleteMany({
      _id: { $in: cartItems.map(item => item._id) },
      userId
    }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      order: {
        _id: order._id,
        items: order.items,
        shippingInfo: order.shippingInfo,
        paymentMethod: order.paymentMethod,
        status: order.status,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đặt hàng',
      error: error.message
    });
  }
};
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      orders: orders.map(order => ({
        _id: order._id,
        items: order.items,
        status: order.status,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        totalAmount: order.totalAmount,
        shippingInfo: order.shippingInfo,
        createdAt: order.createdAt,
        cancelledReason:order.cancelledReason,
      }))
    });
  } catch (error) {
    console.error('Error getting user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn hàng'
    });
  }
};
exports.cancelOrder = async (req, res) => {
    try {
      const { orderId, reason } = req.body;
      const userId = req.user.userId;
      const order = await Order.findOne({ _id: orderId, userId });
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }
      if (order.status !== 'đang chờ xác nhận' && order.status !== 'hết hàng') {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể huỷ đơn hàng khi ở trạng thái chờ xử lý hoặc hết hàng'
        });
      }
      order.status = 'đã huỷ';
      order.cancelledReason = reason;
      await order.save();
  
      res.status(200).json({
        success: true,
        message: 'Huỷ đơn hàng thành công',
        order: {
          _id: order._id,
          status: order.status,
          cancelledReason: order.cancelledReason
        }
      });
  
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi huỷ đơn hàng'
      });
    }
  };
exports.getAllOrders = async (req, res) => {
    try {
      const { 
        page = 1, 
        status, 
        username, 
        paymentMethod,
        startDate,
        endDate,
        minAmount,
        maxAmount
      } = req.query;
      const limit = 20;
      const skip = (page - 1) * limit;
      
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (paymentMethod) {
        query.paymentMethod = paymentMethod;
      }
      
      if (minAmount || maxAmount) {
        query.totalAmount = {};
        if (minAmount) query.totalAmount.$gte = Number(minAmount);
        if (maxAmount) query.totalAmount.$lte = Number(maxAmount);
      }
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      let userQuery = {};
      if (username) {
        userQuery = { username: { $regex: username, $options: 'i' } };
      }
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'userId',
          select: 'username email',
          match: userQuery
        });
      
      const filteredOrders = username 
        ? orders.filter(order => order.userId !== null)
        : orders;
      
      let countQuery = { ...query };
      
      if (username) {
        const users = await User.find(userQuery).select('_id');
        countQuery.userId = { $in: users.map(u => u._id) };
      }
      
      const totalOrders = await Order.countDocuments(countQuery);
      const totalPages = Math.ceil(totalOrders / limit);
      
      res.status(200).json({
        success: true,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalOrders: totalOrders,
        pageOrdersCount: filteredOrders.length,
        ordersPerPage: limit,
        filters: {
          status: status || 'all',
          username: username || '',
          paymentMethod: paymentMethod || 'all',
          dateRange: { startDate, endDate },
          amountRange: { minAmount, maxAmount }
        },
        orders: filteredOrders.map(order => ({
          _id: order._id,
          user: {
            username: order.userId?.username || 'N/A',
            email: order.userId?.email || 'N/A'
          },
          items: order.items,
          status: order.status,
          paymentMethod: order.paymentMethod,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          shippingInfo: order.shippingInfo,
        }))
      });
    } catch (error) {
      console.error('Error getting all orders:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách đơn hàng'
      });
    }
  };

exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status, cancelledReason } = req.body;
        const validStatuses = [
            'đang chờ xác nhận',
            'shop đang đóng gói',
            'đã giao cho bên vận chuyển',
            'hết hàng'
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ'
            });
        }
        if (status === 'hết hàng') {
            if (!cancelledReason || cancelledReason.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập lý do hết hàng'
                });
            }
        }
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        order.status = status;
        if (status === 'hết hàng') {
            order.cancelledReason = cancelledReason;
            order.cancelledAt = new Date();
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái đơn hàng thành công',
            order: {
                _id: order._id,
                status: order.status,
                ...(status === 'hết hàng' && { 
                    cancelledReason: order.cancelledReason,
                    cancelledAt: order.cancelledAt
                })
            }
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái đơn hàng'
        });
    }
};
exports.getOrdersForShipper = async (req, res) => {
  try {
      const {
          page = 1,
          username,
          paymentMethod = 'all',
          startDate,
          endDate,
          minAmount,
          maxAmount,
          sortBy = 'createdAt',
          sortOrder = 'desc'
      } = req.query;

      const limit = 20;
      const skip = (page - 1) * limit;
      const sortDirection = sortOrder === 'desc' ? -1 : 1;

      const query = {
          status: 'đã giao cho bên vận chuyển'
      };

      if (paymentMethod && paymentMethod !== 'all') {
          query.paymentMethod = paymentMethod;
      }

      if (minAmount || maxAmount) {
          query.totalAmount = {};
          if (minAmount) query.totalAmount.$gte = Number(minAmount);
          if (maxAmount) query.totalAmount.$lte = Number(maxAmount);
      }

      if (startDate || endDate) {
          query.createdAt = {};
          if (startDate) query.createdAt.$gte = new Date(startDate);
          if (endDate) query.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
      }

      let userFilter = {};
      if (username) {
          userFilter = { username: { $regex: username, $options: 'i' } };
      }

      const orders = await Order.find(query)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(limit)
          .populate({
              path: 'userId',
              select: 'username email phoneNumber',
              match: userFilter
          });

      const filteredOrders = username
          ? orders.filter(order => order.userId !== null)
          : orders;

      let countQuery = { ...query };
      if (username) {
          const users = await User.find(userFilter).select('_id');
          countQuery.userId = { $in: users.map(u => u._id) };
      }

      const totalOrders = await Order.countDocuments(countQuery);
      const totalPages = Math.ceil(totalOrders / limit);

      const responseData = {
          success: true,
          currentPage: parseInt(page),
          totalPages: totalPages,
          totalOrders: totalOrders,
          ordersPerPage: limit,
          orders: filteredOrders.map(order => ({
              _id: order._id,
              orderCode: `ORDER-${order._id.toString().substring(18, 24)}`, // Mã đơn hàng dễ đọc
              customerInfo: {
                  userId: order.userId?._id,
                  username: order.userId?.username || 'N/A',
                  email: order.userId?.email || 'N/A',
                  phone: order.shippingInfo.phoneNumber // Ưu tiên số điện thoại trong shippingInfo
              },
              items: order.items.map(item => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                  image: item.image,
                  subTotal: item.price * item.quantity
              })),
              status: order.status,
              paymentMethod: order.paymentMethod,
              amountSummary: {
                  subtotal: order.subtotal,
                  shippingFee: order.shippingFee,
                  totalAmount: order.totalAmount
              },
              shippingInfo: {
                  yourname: order.shippingInfo.yourname,
                  address: order.shippingInfo.address,
                  phoneNumber: order.shippingInfo.phoneNumber
              },
              timestamps: {
                  createdAt: order.createdAt,
                  updatedAt: order.updatedAt
              },
              // Thêm trường có thể nhận đơn (nếu cần kiểm tra điều kiện)
              canAccept: true
          }))
      };

      res.status(200).json(responseData);
  } catch (error) {
      console.error('Error getting orders for shipper:', error);
      res.status(500).json({
          success: false,
          message: 'Lỗi hệ thống khi lấy danh sách đơn hàng',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
};
exports.createOrderStatusShipper = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { orders } = req.body;
    const shipperId = req.user.userId;
    
    if (!Array.isArray(orders) || !orders.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Danh sách đơn hàng không hợp lệ' 
      });
    }

    // Verify shipper exists
    const shipper = await Shipper.findById(shipperId).session(session);
    if (!shipper) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thông tin shipper' 
      });
    }

    // Check required fields
    const requiredFields = {
      yourname: 'Họ và tên',
      address: 'Địa chỉ',
      phoneNumber: 'Số điện thoại',
      cccd: 'Số CCCD',
      licensePlate: 'Biển số xe',
      cccdFrontImage: 'Ảnh mặt trước CCCD',
      cccdBackImage: 'Ảnh mặt sau CCCD',
      licensePlateImage: 'Ảnh biển số xe'
    };

    const missingFields = Object.keys(requiredFields).filter(field => !shipper[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        isProfileIncomplete: true,
        message: 'Vui lòng cập nhật đầy đủ thông tin shipper trước khi nhận đơn hàng',
        missingFields,
        details: requiredFields
      });
    }
    
    // Process orders
    const results = await Promise.all(orders.map(async ({ orderId, status }) => {
      try {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
          return { orderId, success: false, error: 'Không tìm thấy đơn hàng' };
        }
        
        order.status = status;
        await order.save({ session });
        
        await new ShipperOrder({
          orderId,
          shipperId,
          status,
          deliveryStartTime: status === 'đang giao' ? new Date() : null
        }).save({ session });

        return { orderId, success: true, status, updatedAt: new Date() };
      } catch (error) {
        return { orderId, success: false, error: error.message };
      }
    }));
    
    const successResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    if (!successResults.length) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: 'Cập nhật thất bại cho tất cả đơn hàng',
        failedUpdates: failedResults 
      });
    }

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: `Cập nhật thành công ${successResults.length} đơn hàng`,
      updatedCount: successResults.length,
      failedCount: failedResults.length,
      results: successResults,
      ...(failedResults.length && { failedUpdates: failedResults })
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi cập nhật đơn hàng', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

exports.getOrdersByShipper = async (req, res) => {
  try {
    const shipperId = req.user.userId;
    const shipperOrders = await ShipperOrder.find({ shipperId })
      .populate('orderId')
      .sort({ createdAt: -1 });
    const orders = shipperOrders.map(item => ({
      order: item.orderId,
      status: item.status,
      deliveryStartTime: item.deliveryStartTime,
      deliveryEndTime: item.deliveryEndTime,
      images: item.images,
      note: item.note,
      createdAt: item.createdAt
    }));

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Error getting orders by shipper:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn hàng',
      error: error.message
    });
  }
};

exports.updateShipperOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { orderId, status, note } = req.body;
    const shipperId = req.user.userId;
    
    // Xử lý hình ảnh từ multer
    const images = req.files['images'] 
      ? req.files['images'].map(file => file.path.replace(/\\/g, '/')) 
      : null;

    if (!orderId || !status) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu orderId hoặc status' 
      });
    }

    const allowedStatuses = ['đang giao', 'đã nhận được hàng', 'giao hàng thất bại'];
    if (!allowedStatuses.includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: đang giao, đã nhận được hàng, giao hàng thất bại' 
      });
    }

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy đơn hàng' 
      });
    }

    if (status === 'đang giao' && order.status !== 'đã giao cho bên vận chuyển') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: 'Chỉ có thể bắt đầu giao hàng từ trạng thái "đã giao cho bên vận chuyển"' 
      });
    }

    if (status === 'đã nhận được hàng') {
      if (order.status !== 'đang giao' && order.status !== 'giao hàng thất bại') {
        await session.abortTransaction();
        return res.status(400).json({ 
          success: false, 
          message: 'Chỉ có thể xác nhận giao thành công từ trạng thái "đang giao" hoặc "giao hàng thất bại"' 
        });
      }
      if (!images || images.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({ 
          success: false,
          message: 'Yêu cầu hình ảnh xác nhận giao hàng' 
        });
      }
    }

    if (status === 'giao hàng thất bại') {
      if (order.status !== 'đang giao') {
        await session.abortTransaction();
        return res.status(400).json({ 
          success: false, 
          message: 'Chỉ có thể báo giao thất bại từ trạng thái "đang giao"' 
        });
      }
      if (!note) {
        await session.abortTransaction();
        return res.status(400).json({ 
          success: false, 
          message: 'Yêu cầu lý do giao hàng thất bại' 
        });
      }
    }

    order.status = status;
    if (images) order.images = images;
    if (note) order.note = note;
    await order.save({ session });

    const shipperOrderData = {
      orderId,
      shipperId,
      status,
      images: images || [],
      note: note || '',
      deliveryStartTime: status === 'đang giao' ? new Date() : null,
      deliveryEndTime: ['đã nhận được hàng', 'giao hàng thất bại'].includes(status) ? new Date() : null
    };

    let shipperOrder;
    if (status === 'đang giao') {
      shipperOrder = await new ShipperOrder(shipperOrderData).save({ session });
    } else {
      shipperOrder = await ShipperOrder.findOneAndUpdate(
        { orderId, shipperId },
        shipperOrderData,
        { new: true, session }
      );
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái đơn hàng thành công: ${status}`,
      data: {
        order: {
          _id: order._id,
          status: order.status,
          images: order.images,
          note: order.note,
          updatedAt: order.updatedAt
        },
        shipperOrder: {
          _id: shipperOrder._id,
          status: shipperOrder.status,
          deliveryStartTime: shipperOrder.deliveryStartTime,
          deliveryEndTime: shipperOrder.deliveryEndTime,
          images: shipperOrder.images,
          note: shipperOrder.note
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Lỗi khi cập nhật đơn hàng:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi cập nhật đơn hàng', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};