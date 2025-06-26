const express = require('express');
const router = express.Router();
const {getCartItems,getCartItemById, addToCart,updateCartItem,removeFromCart} = require('../controllers/cartController');
const { verifyUser } = require('../middleware/authMiddleware');

router.get('/', verifyUser, getCartItems);
router.get('/:id', verifyUser, getCartItemById);
router.post('/add', verifyUser, addToCart);
router.put('/update', verifyUser, updateCartItem);
router.delete('/remove', verifyUser, removeFromCart);
module.exports = router;