const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrdersForShipper,
  createOrderStatusShipper,
  getOrdersByShipper,
  updateShipperOrder
} = require('../controllers/orderController');
const { verifyUser, verifyAdmin, verifyShipper } = require('../middleware/authMiddleware');
const upload = require('../middleware/multerMiddleware');
router.post('/', verifyUser, createOrder);
router.get('/user', verifyUser, getUserOrders);
router.put('/cancel', verifyUser,cancelOrder);
router.get('/admin',verifyAdmin, getAllOrders);
router.put('/admin/status', verifyAdmin, updateOrderStatus);
router.get('/shipper/available-orders', verifyShipper, getOrdersForShipper);
router.put('/shipper/status', verifyShipper, createOrderStatusShipper);
router.put('/shipper/ordersStatus',verifyShipper,upload,updateShipperOrder);
router.get('/shipper/orders', verifyShipper,getOrdersByShipper);
module.exports = router;