const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerMiddleware');
const { verifyUser,verifyAdmin } = require('../middleware/authMiddleware');
const {
    sendMessage,
    getConversationList,
    getMessagesWithUser
}= require('../controllers/messagerController');

router.post('/send', verifyUser, upload, sendMessage);
router.get('/conversations', verifyAdmin, getConversationList);
router.get('/messages', verifyUser, getMessagesWithUser); 
module.exports = router;
