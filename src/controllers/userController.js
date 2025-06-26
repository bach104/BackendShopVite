const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Tên người dùng, email và mật khẩu là bắt buộc.' 
    });
  }
  
  try {
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ 
        success: false,
        message: 'Tên người dùng đã tồn tại.' 
      });
    }
    
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ 
        success: false,
        message: 'Email đã tồn tại.' 
      });
    }
    
    const user = new User({
      username,
      email,
      password,
      yourname: '',
      address: '',
      phoneNumber: '',
      avatar: '',
      role: 'user',
    });

    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      process.env.JWT_SECRET_KEY, 
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60 * 1000,
      sameSite: 'strict'
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        yourname: user.yourname,
        address: user.address,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server' 
    });
  }
};

exports.login = async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Vui lòng cung cấp tên đăng nhập/email và mật khẩu' 
    });
  }

  try {
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Tên đăng nhập hoặc email không tồn tại',
        code: 'USER_NOT_FOUND'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Sai mật khẩu',
        code: 'WRONG_PASSWORD'
      });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      process.env.JWT_SECRET_KEY, 
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60 * 1000, 
      sameSite: 'strict'
    });
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        yourname: user.yourname,
        avatar: user.avatar,
        address: user.address,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      token
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server' 
    });
  }
};
exports.logout = async (req, res) => {
  try {
    res.clearCookie('token');
    res.status(200).json({ 
      success: true,
      message: 'Đăng xuất thành công' 
    });
  } catch (error) {
    console.error('Lỗi đăng xuất:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
exports.checkSession = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Phiên đăng nhập không hợp lệ',
        code: 'INVALID_SESSION'
      });
    }
    res.status(200).json({ 
      success: true,
      user: req.user 
    });
  } catch (error) {
    console.error('Lỗi kiểm tra phiên:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server' 
    });
  }
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Chỉ chấp nhận các file hình ảnh có định dạng jpeg, jpg, png, gif.'));
  },
}).single('avatar');

exports.uploadAvatar = upload;
exports.updateUser = async (req, res) => {
  try {
    const userIdFromToken = req.user.userId; 
    if (userIdFromToken !== req.user.userId) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật thông tin của người khác.' });
    } 
    const updateData = req.body; 
    const phoneNumberRegex = /^[0-9]{10}$/; 
    if (updateData.phoneNumber && !phoneNumberRegex.test(updateData.phoneNumber)) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại gồm 10 chữ số.' });
    }
    let emailExists = false;
    if (updateData.email) {
      const user = await User.findById(userIdFromToken);
      if (user.email !== updateData.email) { 
        const existingUser = await User.findOne({ email: updateData.email });
        if (existingUser) {
          emailExists = true; 
        }
      }
    }
    if (emailExists) {
      return res.status(200).json({
        emailExists: true, 
        message: 'Cập nhật thông tin thành công.',
      });
    }

    if (req.file) {
      const user = await User.findById(userIdFromToken);

      if (user && user.avatar) {
        const oldAvatarPath = path.resolve(user.avatar); 
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath); 
        }
      }
      updateData.avatar = req.file.path; 
    }
    const updatedUser = await User.findByIdAndUpdate(userIdFromToken, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    const newToken = jwt.sign({ userId: updatedUser._id, username: updatedUser.username }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    res.status(200).json({
      message: 'Cập nhật thông tin thành công.',
      user: {
        email: updatedUser.email,
        yourname: updatedUser.yourname,
        avatar: updatedUser.avatar,
        address: updatedUser.address,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
      },
      token: newToken,
      emailExists: false,
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật thông tin người dùng:', error.message);
    res.status(500).json({ error: error.message });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'Bạn xóa tài khoản thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getUsers = async (req, res) => {
  try {
    let { 
      page = 1, 
      limit = 20, 
      username, 
      email, 
      sortBy = 'createdAt', 
      sortOrder = -1 
    } = req.query;
    let filter = {};
    if (username) {
      filter.username = { $regex: new RegExp(username, 'i') };
    }
    if (email) {
      filter.email = { $regex: new RegExp(email, 'i') };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));
    const sort = {};
    if (sortBy) {
      sort[sortBy] = parseInt(sortOrder);
    }
    const users = await User.find(filter)
      .select('-password -token')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort);
      
    res.status(200).json({ 
      users, 
      totalPages, 
      totalUsers,
      currentPage: parseInt(page),
      usersPerPage: parseInt(limit)
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách người dùng:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server khi lấy danh sách người dùng", 
      error: error.message 
    });
  }
};
exports.removeUser = async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Chỉ quản trị viên mới có quyền xóa người dùng" });
    }
    const { userId, userIds } = req.body;
    if (!userId && (!Array.isArray(userIds) || userIds.length === 0)) {
      return res.status(400).json({ message: "Thiếu thông tin người dùng cần xóa" });
    }
    let deleteResult;
    if (userId) {
      if (userId.toString() === req.user.userId.toString()) {
        return res.status(400).json({ message: "Bạn không thể tự xóa tài khoản của chính mình" });
      }
      deleteResult = await User.deleteOne({ _id: userId });
    } else {
      const filteredUserIds = userIds.filter(id => id.toString() !== req.user.userId.toString());
      if (filteredUserIds.length === 0) {
        return res.status(400).json({ message: "Bạn không thể tự xóa tài khoản của chính mình" });
      }
      deleteResult = await User.deleteMany({ _id: { $in: filteredUserIds } });
    }

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng để xóa" });
    }
    res.status(200).json({ message: "Xóa người dùng thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa người dùng:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi, vui lòng thử lại sau" });
  }
};