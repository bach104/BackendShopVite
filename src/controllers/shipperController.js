const Shipper = require('../models/Shipper');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const TOKEN_EXPIRES_IN = 8 * 60 * 60 * 1000;
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '8h' }
  );
};
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const usernameExists = await Shipper.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Username đã tồn tại',
        code: 'USERNAME_EXISTS'
      });
    }
    const emailExists = await Shipper.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng',
        code: 'EMAIL_EXISTS'
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const shipper = new Shipper({
      username,
      email,
      password: hashedPassword,
      yourname: '',
      address: '',
      phoneNumber: '',
      avatar: '',
      cccd: '',
      licensePlate: '',
      cccdFrontImage: '',
      cccdBackImage: '',
      licensePlateImage: ''
    });
    await shipper.save();
    console.log(shipper);
    res.status(201).json({
      success: true,
      message: 'Đăng ký shipper thành công!',
      shipper: {
        _id: shipper._id,
        username: shipper.username,
        email: shipper.email,
        yourname: shipper.yourname,
        avatar: shipper.avatar,
        address: shipper.address,
        phoneNumber: shipper.phoneNumber,
        cccd: shipper.cccd,
        licensePlate: shipper.licensePlate,
        cccdFrontImage: shipper.cccdFrontImage,
        cccdBackImage: shipper.cccdBackImage,
        licensePlateImage: shipper.licensePlateImage
      }

    });
  } catch (err) {
    console.error('Register Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ',
    });
  }
};
exports.login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const shipper = await Shipper.findOne({
      $or: [
        { username: identifier },
        { email: identifier.toLowerCase() }
      ]
    });
    if (!shipper) {
      return res.status(404).json({
        success: false,
        message: 'Tên đăng nhập hoặc email không tồn tại',
        code: 'IDENTIFIER_NOT_FOUND'
      });
    }
    const isMatch = await bcrypt.compare(password, shipper.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không đúng',
        code: 'INVALID_PASSWORD'
      });
    }
    const token = generateToken(shipper._id);
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: TOKEN_EXPIRES_IN,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      shipper: {
        userId: shipper._id,
        username: shipper.username,
        email: shipper.email,
        yourname: shipper.yourname,
        avatar: shipper.avatar,
        address: shipper.address,
        phoneNumber: shipper.phoneNumber,
        cccd: shipper.cccd,
        licensePlate: shipper.licensePlate,
        cccdFrontImage: shipper.cccdFrontImage,
        cccdBackImage: shipper.cccdBackImage,
        licensePlateImage: shipper.licensePlateImage,
        token: shipper.token
      }
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ',
    });
  }
};
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Đăng xuất thành công',
  });
};
exports.updateInformation = async (req, res) => {
  const userId = req.user.userId;
  if (req.fileValidationError) {
    return res.status(400).json({
      success: false,
      message: req.fileValidationError
    });
  }
  const allowedFields = [
    'password', 'yourname', 'address', 'phoneNumber',
    'cccd', 'licensePlate'
  ];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }
  if (req.files) {
    const fileFields = {
      avatar: 'avatar',
      cccdFrontImage: 'cccdFrontImage',
      cccdBackImage: 'cccdBackImage',
      licensePlateImage: 'licensePlateImage'
    };
    for (const [field, fieldName] of Object.entries(fileFields)) {
      if (req.files[field]?.[0]) {
        updates[fieldName] = req.files[field][0].filename;
      }
    }
  }
  try {
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const updatedShipper = await Shipper.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedShipper) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy shipper',
        code: 'SHIPPER_NOT_FOUND',
      });
    }
    const responseData = {
      _id: updatedShipper._id,
      username: updatedShipper.username,
      email: updatedShipper.email,
      yourname: updatedShipper.yourname,
      address: updatedShipper.address,
      phoneNumber: updatedShipper.phoneNumber,
      cccd: updatedShipper.cccd,
      licensePlate: updatedShipper.licensePlate,
      cccdFrontImage:updatedShipper.cccdFrontImage,
      cccdBackImage:updatedShipper.cccdBackImage,
      licensePlateImage:updatedShipper.licensePlateImage,
      token: updatedShipper.token
    };
    const fileFields = ['avatar', 'cccdFrontImage', 'cccdBackImage', 'licensePlateImage'];
    fileFields.forEach(field => {
      if (updatedShipper[field]) {
        responseData[field] = updatedShipper[field];
      }
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      shipper: responseData
    });
    console.log(updatedShipper);
  } catch (err) {
    console.error('Update Error:', err.message);
    
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        if (fileArray?.[0]?.path) {
          fs.unlink(fileArray[0].path, () => {});
        }
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi máy chủ khi cập nhật thông tin',
    });
  }
};