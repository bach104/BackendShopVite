const express = require('express');
const userController = require('../controllers/userController');
const {
  register,
  login,
  logout,
  updateUser,
  deleteUser,
  uploadAvatar,
  getUsers,
  removeUser 
} = userController;
const { verifyUser,verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.post('/logout', verifyUser, logout);
router.put('/update-info', verifyUser, uploadAvatar, updateUser);
router.delete('/delete', verifyUser, deleteUser);
router.get('/', verifyAdmin, getUsers);
router.delete('/remove-users', verifyAdmin, removeUser);
module.exports = router;