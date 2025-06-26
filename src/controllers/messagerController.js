const Message = require('../models/messager');
require('dotenv').config();
const User = require('../models/User');
const moment = require('moment');
require('moment/locale/vi')
exports.sendMessage = async (req, res) => {
  const senderId = req.user.userId;
  const senderRole = req.user.role;
  const { text } = req.body;
  const images = req.files?.images?.map(file => file.filename) || [];
  try {
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }
    if (!sender.yourname || sender.yourname.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cập nhật tên của bạn trước khi gửi tin nhắn',
        requiresNameUpdate: true
      });
    }
    let receiverId;
    if (senderRole === 'user') {
      receiverId = process.env.DEFAULT_ADMIN_ID;
    } else if (senderRole === 'admin') {
      receiverId = req.body.receiverId;
      if (!receiverId) {
        return res.status(400).json({
          success: false,
          message: 'Admin cần chỉ định người nhận.'
        });
      }
    }
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      text,
      images, 
    });
    await message.save();
    res.status(200).json({
      success: true,
      message: 'Gửi tin nhắn thành công',
      data: message
    });
    console.log(message);
  } catch (error) {
    console.error('Lỗi khi gửi tin nhắn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi gửi tin nhắn',
      error: error.message
    });
  }
};
exports.getMessagesWithUser = async (req, res) => {
  const currentUserId = req.user.userId;
  const currentUserRole = req.user.role;
  let targetUserId;
  if (currentUserRole === 'user') {
    targetUserId = process.env.DEFAULT_ADMIN_ID;
  } else if (currentUserRole === 'admin') {
    targetUserId = req.query.userId;
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Admin cần chỉ định userId để lấy tin nhắn.'
      });
    }
  }

  try {
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 }); 

    res.status(200).json({
      success: true,
      data: messages
    });
    console.log('--------------v----------------');
    console.log(messages)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tin nhắn.'
    });
  }
};

exports.getConversationList = async (req, res) => {
  const adminId = req.user.userId;
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ quản trị viên mới có quyền truy cập.',
    });
  }
  try {
    const messages = await Message.find({
      $or: [
        { sender: adminId },
        { receiver: adminId }
      ]
    }).sort({ createdAt: -1 });

    const conversations = {};
    
    messages.forEach(msg => {
      const userId = msg.sender.toString() === adminId.toString() 
        ? msg.receiver.toString() 
        : msg.sender.toString();
      
      if (!conversations[userId]) {
        conversations[userId] = {
          message: msg.text || '[Hình ảnh]',
          createdAt: msg.createdAt,
          sender: msg.sender
        };
      }
    });

    const senderIds = Object.keys(conversations);
    const users = await User.find({ _id: { $in: senderIds } });
    
    moment.locale('vi');
    const result = users.map(user => {
      const msg = conversations[user._id.toString()];
      return {
        userId: user._id,
        yourname: user.yourname,
        avatar: user.avatar,
        latestMessage: msg.message,
        timeAgo: moment(msg.createdAt).fromNow(),
        lastSenderIsAdmin: msg.sender.toString() === adminId.toString(),
        createdAt: msg.createdAt // Thêm trường này để sắp xếp
      };
    });

    // Sắp xếp kết quả theo thời gian tin nhắn gần nhất (createdAt giảm dần)
    result.sort((a, b) => b.createdAt - a.createdAt);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Lỗi lấy danh sách hội thoại:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách người dùng nhắn tin.'
    });
  }
};
