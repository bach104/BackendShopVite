
const express = require('express');
const {
  editProduct,
  deleteProduct,
  manageUser,
} = require('../controllers/adminController');
const { verifyAdmin } = require('../middleware/authMiddleware');
const router = express.Router();
router.put('/products/:id', verifyAdmin, editProduct);
router.delete('/products/:id', verifyAdmin, deleteProduct);
router.post('/users', verifyAdmin, manageUser);
router.put('/users/:id', verifyAdmin, manageUser); 
router.delete('/users/:id', verifyAdmin, manageUser); 
module.exports = router;
