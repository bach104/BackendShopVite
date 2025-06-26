const express = require('express');
const {
  addComment,
  getComments,
  editComment,
  deleteComment,
} = require('../controllers/commentController');
const router = express.Router();
const { verifyUser } = require('../middleware/authMiddleware');

router.post('/', verifyUser, addComment);

router.put('/:id', verifyUser, editComment);

router.get('/product/:productId', getComments); 

router.delete('/:id', verifyUser, deleteComment);

module.exports = router;
