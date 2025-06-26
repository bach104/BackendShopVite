

const User = require('../models/User');
const Product = require('../models/Product');

const checkExistingUser = async (username, email) => {
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    throw new Error('Tên người dùng đã tồn tại');
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new Error('Email đã tồn tại.');
  }
};

const addUser = async (userData) => {
  const { username, email, password, role = 'user', phoneNumber = '', address = '', avatar = '' } = userData;
  await checkExistingUser(username, email);

  const user = new User({ username, email, password, role, phoneNumber, address, avatar });
  console.log(user);
  return await user.save();
};

const updateUser = async (userId, userData) => {
  const updatedUser = await User.findByIdAndUpdate(userId, userData, { new: true });
  if (!updatedUser) {
    throw new Error('User not found.');
  }
  return updatedUser;
};

const deleteUser = async (userId) => {
  const deletedUser = await User.findByIdAndDelete(userId);
  if (!deletedUser) {
    throw new Error('User not found for deletion.');
  }
};


exports.editProduct = async (req, res) => {
  try {
    const { name,oldPrice, price, description, category, quantity, size, images, video } = req.body;

    if (images && images.length > 8) {
      return res.status(400).json({ message: 'Tối đa được phép 8 hình ảnh.' });
    }
    if (video && video.length > 1) {
      return res.status(400).json({ message: 'chỉ có thể thêm 1 video cho sản phẩm.' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { name,oldPrice, price, description, category, quantity, size, images, video },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }

    res.status(200).json({
      message: 'Sản phẩm đã được cập nhật thành công.',
      updatedProduct,
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật sản phẩm:', error.message);
    res.status(500).json({ error: error.message });
  }
};


exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại.' });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Sản phẩm đã được xóa thành công.' });
  } catch (error) {
    console.error('Error deleting product:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.manageUser = async (req, res) => {
  try {
    const { action, userId, userData } = req.body;
    if (action === 'add') {
      const user = await addUser(userData);
      res.status(201).json({ message: 'Người dùng đã được thêm thành công.', user });
    } else if (action === 'edit') {
      const updatedUser = await updateUser(userId, userData);
      res.status(200).json({ message: 'Cập nhật người dùng thành công.', updatedUser });
    } else if (action === 'delete') {
      await deleteUser(userId);
      res.status(200).json({ message: 'Người dùng đã bị xóa thành công.' });
    } else {
      res.status(400).json({ message: 'Hành động không hợp lệ.' });
    }
  } catch (error) {
    console.error('Lỗi quản lý người dùng:', error.message);
    res.status(500).json({ error: error.message });
  }
};


