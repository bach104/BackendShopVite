const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shipper = require('../models/Shipper');
const verifyToken = async (token) => {
  if (!token) {
    return { 
      error: { 
        message: 'Cần có mã thông báo xác thực.', 
        status: 401,
        code: 'MISSING_TOKEN'
      } 
    };
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (decoded.exp * 1000 < Date.now()) {
      return { 
        error: { 
          message: 'Thời gian đăng nhập hết hạn.', 
          status: 401,
          code: 'TOKEN_EXPIRED'
        } 
      };
    }
    const user = await User.findById(decoded.userId);
    if (!user) {
      return { 
        error: { 
          message: 'Người dùng không tồn tại.', 
          status: 401,
          code: 'USER_NOT_FOUND'
        } 
      };
    }
    return { user };
  } catch (error) {
    console.error('Lỗi xác minh token:', error.message);
    if (error.name === 'TokenExpiredError') {
      return { 
        error: { 
          message: 'Thời gian đăng nhập hết hạn.', 
          status: 401,
          code: 'TOKEN_EXPIRED'
        } 
      };
    }
    return { 
      error: { 
        message: 'Mã thông báo không hợp lệ.', 
        status: 401,
        code: 'INVALID_TOKEN'
      } 
    };
  }
};

exports.verifyUser = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) token = req.cookies?.token;

  const result = await verifyToken(token);
  
  if (result.error) {
    // Xóa cookie token nếu có
    if (req.cookies?.token) {
      res.clearCookie('token');
    }
    return res.status(result.error.status).json({ 
      success: false,
      message: result.error.message,
      code: result.error.code
    });
  }

  req.user = {
    userId: result.user._id,
    username: result.user.username,
    email: result.user.email,
    role: result.user.role,
    isAdmin: result.user.role === 'admin',
    address: result.user.address,
    phoneNumber: result.user.phoneNumber,
    avatar: result.user.avatar
  };
  
  next();
};

exports.verifyAdmin = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) token = req.cookies?.token;

  const result = await verifyToken(token);
  
  if (result.error) {
    if (req.cookies?.token) {
      res.clearCookie('token');
    }
    return res.status(result.error.status).json({ 
      success: false,
      message: result.error.message,
      code: result.error.code
    });
  }

  if (result.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Truy cập bị từ chối. Chỉ quản trị viên được phép truy cập.',
      code: 'ACCESS_DENIED'
    });
  }

  req.user = {
    userId: result.user._id,
    username: result.user.username,
    email: result.user.email,
    role: result.user.role,
    isAdmin: true,
    address: result.user.address,
    phoneNumber: result.user.phoneNumber,
    avatar: result.user.avatar
  };

  next();
};

exports.verifyShipper = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Cần có mã thông báo xác thực.',
      code: 'MISSING_TOKEN',
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({
        success: false,
        message: 'Thời gian đăng nhập hết hạn.',
        code: 'TOKEN_EXPIRED',
      });
    }

    const shipper = await Shipper.findById(decoded.userId);
    if (!shipper) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản shipper không tồn tại.',
        code: 'SHIPPER_NOT_FOUND',
      });
    }

    req.user = {
      userId: shipper._id,
      username: shipper.username,
      email: shipper.email,
      yourname: shipper.yourname,
      address: shipper.address,
      phoneNumber: shipper.phoneNumber,
      avatar: shipper.avatar,
      role: 'shipper',
    };

    next();
  } catch (error) {
    console.error('Lỗi xác minh token (shipper):', error.message);
    return res.status(401).json({
      success: false,
      message: 'Mã thông báo không hợp lệ.',
      code: 'INVALID_TOKEN',
    });
  }
};