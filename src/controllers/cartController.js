const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

exports.addToCart = async (req, res) => { 
  try {
    const { productId, quantity = 1, size, color } = req.body;
    const userId = req.user.userId; 
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }
    const selectedSize = size || (Array.isArray(product.size) && product.size.length > 0 ? product.size[0] : "Default");
    const selectedColor = color || (Array.isArray(product.color) && product.color.length > 0 ? product.color[0] : "Default");
    const productImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : "";

    let cartItem = await Cart.findOne({ userId, productId, size: selectedSize, color: selectedColor });

    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      cartItem = new Cart({
        userId,
        productId,
        name: product.name,
        price: product.price,
        oldPrice: product.oldPrice,
        quantity,
        size: selectedSize,
        color: selectedColor,
        image: productImage,
      });
      await cartItem.save();
    }

    res.status(200).json({
      message: "Sản phẩm đã được thêm vào giỏ hàng",
      cartItem,
    });
  } catch (error) {
    console.error("Lỗi khi thêm vào giỏ hàng:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi, vui lòng thử lại sau" });
  }
};

exports.getCartItems = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Hãy đăng nhập để xem giỏ hàng' });
    }
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1; 
    const limit = 20;
    const skip = (page - 1) * limit;
    const cartItems = await Cart.find({ userId }).skip(skip).limit(limit);
    const pageQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
    const allCartItems = await Cart.find({ userId });
    const totalQuantity = allCartItems.reduce((total, item) => total + item.quantity, 0);
    const totalItems = await Cart.countDocuments({ userId });
    res.status(200).json({
      message: 'Lấy danh sách giỏ hàng thành công',
      cartItems,
      pageQuantity,  
      totalQuantity,
      totalItems,
      totalPages: Math.ceil(totalItems / limit), 
      currentPage: page,
    });
  } catch (error) {
    console.error('Lỗi khi lấy giỏ hàng:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi, vui lòng thử lại sau' });
  }
};

exports.getCartItemById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Hãy đăng nhập để xem chi tiết sản phẩm trong giỏ hàng" });
    }

    const { id: cartItemId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
      return res.status(400).json({ message: "ID sản phẩm trong giỏ hàng không hợp lệ" });
    }

    const cartItem = await Cart.findOne({ _id: cartItemId, userId });

    if (!cartItem) {
      return res.status(404).json({ message: "Sản phẩm trong giỏ hàng không tồn tại" });
    }

    res.status(200).json({
      message: "Lấy thông tin sản phẩm trong giỏ hàng thành công",
      cartItem,
    });
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm trong giỏ hàng:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi, vui lòng thử lại sau" });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Hãy đăng nhập để cập nhật sản phẩm trong giỏ hàng" });
    }
    const { cartItemId, size, color, quantity } = req.body;
    const userId = req.user.userId;
    if (!cartItemId || (quantity !== undefined && quantity <= 0)) {
      return res.status(400).json({ message: "Dữ liệu đầu vào không hợp lệ" });
    }
    const updateFields = {};
    if (size) updateFields.size = size;
    if (color) updateFields.color = color;
    if (quantity) updateFields.quantity = quantity;
    const updatedCartItem = await Cart.findOneAndUpdate(
      { _id: cartItemId, userId },
      updateFields,
      { new: true }
    );
    if (!updatedCartItem) {
      return res.status(404).json({ message: "Sản phẩm trong giỏ hàng không tồn tại" });
    }
    res.status(200).json({
      message: "Cập nhật sản phẩm trong giỏ hàng thành công",
      cartItem: updatedCartItem,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật giỏ hàng:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi, vui lòng thử lại sau" });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Hãy đăng nhập để xóa sản phẩm khỏi giỏ hàng" });
    }

    const { cartItemId, cartItemIds } = req.body;
    const userId = req.user.userId;

    if (!cartItemId && (!Array.isArray(cartItemIds) || cartItemIds.length === 0)) {
      return res.status(400).json({ message: "Thiếu sản phẩm cần xóa" });
    }

    let deleteResult;

    if (cartItemId) {
      deleteResult = await Cart.deleteOne({ _id: cartItemId, userId });
    } else {
      deleteResult = await Cart.deleteMany({ _id: { $in: cartItemIds }, userId });
    }

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm để xóa hoặc bạn không có quyền xóa" });
    }

    res.status(200).json({
      message: `Đã xóa ${deleteResult.deletedCount} sản phẩm khỏi giỏ hàng`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm khỏi giỏ hàng:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi, vui lòng thử lại sau" });
  }
};
