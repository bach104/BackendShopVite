const Comment = require('../models/Comment');
const Product = require("../models/Product");

exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      importPrice,
      oldPrice,
      price,
      description,
      material,
      category,
      quantity,
      size,
      color,
      season,
    } = req.body;
    if (!req.files) {
      return res.status(400).json({ message: "Không có file được tải lên." });
    }
    const images = req.files["images"]?.map((file) => file.path) || [];
    const video = req.files["video"]?.[0]?.path || null;
    const requiredFields = {
      name: "Tên sản phẩm",
      importPrice: "Giá nhập",
      price: "Giá bán",
      description: "Mô tả sản phẩm",
      material: "Chất liệu",
      category: "Danh mục",
      size: "Kích thước",
      season: "Mùa",
      color: "Màu sắc",
      quantity: "Số lượng",
    };
    for (const [field, fieldName] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `Vui lòng nhập ${fieldName}.` });
      }
    }
    const removeDuplicates = (arr) => {
      const unique = [];
      const lowerCaseItems = new Set();
      for (const item of arr) {
        const lowerCaseItem = item.toLowerCase();
        if (!lowerCaseItems.has(lowerCaseItem)) {
          lowerCaseItems.add(lowerCaseItem);
          unique.push(item.trim());
        }
      }
      return unique;
    };
    const newProduct = new Product({
      name,
      importPrice: parseFloat(importPrice),
      oldPrice: oldPrice ? parseFloat(oldPrice) : null,
      price: parseFloat(price),
      description,
      material: material.split(",").map((s) => s.trim()),
      category: category.split(",").map((s) => s.trim()),
      quantity: parseInt(quantity),
      size: removeDuplicates(size.split(",")),
      color: removeDuplicates(color.split(",")),
      season,
      images,
      video,
      sold: 0,
      starRatings: {
        totalStars: 0,
        totalReviews: 0,
        averageRating: 0,
      },
    });

    await newProduct.save();
    console.log("Product added successfully:", newProduct);
    res.status(201).json({
      message: "Thêm sản phẩm thành công.",
      product: newProduct,
    });
  } catch (error) {
    console.error("Lỗi thêm sản phẩm:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    let { page = 1, limit = 20, minPrice, maxPrice, category, material, season } = req.query;
    let filter = {};
    if (category) {
      const categories = Array.isArray(category) ? category : category.split(",");
      filter.category = { $in: categories.map(cat => new RegExp(cat, "i")) };
    }
    if (material) {
      const materials = Array.isArray(material) ? material : material.split(",");
      filter.material = { $in: materials.map(mat => new RegExp(mat, "i")) };
    }
    if (season) {
      const seasons = Array.isArray(season) ? season : season.split(",");
      filter.season = { $in: seasons.map(sea => new RegExp(sea, "i")) };
    }
    const min = parseInt(minPrice);
    const max = parseInt(maxPrice) || Infinity;
    if (!isNaN(min) && !isNaN(max) && min <= max) {
      filter.price = { $gte: min, $lte: max };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / parseInt(limit));
    const products = await Product.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    res.status(200).json({ products, totalPages, totalProducts });
  } catch (error) {
    console.error("Lỗi khi tải sản phẩm:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error });
  }
};
exports.getProductById = async (req, res) => {
   try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error });
  }
};
exports.rateProduct = async (req, res) => {
  try {
    const { productId, star } = req.body;

    if (!star || star < 0 || star > 5 || !/^\d+(\.\d{1})?$/.test(star.toString())) {
      return res.status(400).json({
        message: 'Số sao phải nằm trong khoảng từ 0 đến 5 và tối đa 1 chữ số thập phân.',
      });
    }
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }
    const totalStars = product.starRatings.totalStars + parseFloat(star);
    const totalReviews = product.starRatings.totalReviews + 1;
    const averageRating = (totalStars / totalReviews).toFixed(1);

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $inc: {
          "starRatings.totalStars": parseFloat(star),
          "starRatings.totalReviews": 1,
        },
        $set: {
          "starRatings.averageRating": parseFloat(averageRating),
        },
      },
      { new: true }
    );

    res.status(200).json({
      message: 'Đánh giá sao thành công.',
      starRatings: updatedProduct.starRatings,
    });
  } catch (error) {
    console.error('Lỗi đánh giá sao:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getProductRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }
    const { totalStars, totalReviews } = product.starRatings;
    const averageRating = totalReviews ? (totalStars / totalReviews).toFixed(1) : 0;
    res.status(200).json({
      totalStars,
      totalReviews,
      averageRating,
    });
  } catch (error) {
    console.error('Lỗi lấy đánh giá sao:', error.message);
    res.status(500).json({ error: error.message });
  }
};


exports.getProductsBySeason = async (req, res) => {
  try {
    const { season } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments({
      season: { $regex: `^${season}$`, $options: "i" },
    });

    const products = await Product.find({
      season: { $regex: `^${season}$`, $options: "i" },
    })
      .skip(skip)
      .limit(limit);

    if (!products.length) {
      return res.status(404).json({ message: "Không có sản phẩm nào cho mùa này." });
    }

    res.status(200).json({ products, totalProducts });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getTopFeaturedProducts = async (req, res) => {
  try {
    const productsWithComments = await Product.aggregate([
      {
        $lookup: {
          from: 'comments', 
          localField: '_id', 
          foreignField: 'productId', 
          as: 'comments', 
        },
      },
      {
        $addFields: {
          commentCount: { $size: '$comments' }, 
        },
      },
      {
        $sort: { 'starRatings.averageRating': -1, commentCount: -1 }, 
      },
      {
        $limit: 10, 
      },
      {
        $project: {
          name: 1,
          price: 1,
          images: 1,
          'starRatings.averageRating': 1,
          commentCount: 1,
        },
      },
    ]);

    res.status(200).json({
      message: 'Top 10 sản phẩm nổi bật.',
      products: productsWithComments,
    });
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm nổi bật:', error.message);
    res.status(500).json({ error: error.message });
  }
};
exports.getRandomProducts = async (req, res) => {
  try {
    console.log("Fetching random products...");
    
    const products = await Product.aggregate([{ $sample: { size: 10 } }]);

    console.log("Random products:", products);

    res.status(200).json({ products });
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm ngẫu nhiên:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error });
  }
};
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      importPrice,
      oldPrice,
      price,
      description,
      material,
      category,
      quantity,
      size,
      color,
      season,
      video,
      existingImages,
    } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
    }
    if (name) product.name = name;
    if (importPrice) product.importPrice = parseFloat(importPrice);
    if (oldPrice) product.oldPrice = parseFloat(oldPrice);
    if (price) product.price = parseFloat(price);
    if (description) product.description = description;
    if (material) product.material = material;
    if (category) product.category = category;
    if (quantity) product.quantity = parseInt(quantity);
    if (season) product.season = season;
    if (size) {
      const sizeArray = size.split(",")
        .map(s => s.trim().toLowerCase())
        .filter(s => s !== ""); 
      product.size = [...new Set(sizeArray)]; 
    }

    if (color) {
      const colorArray = color.split(",")
        .map(c => c.trim().toLowerCase())
        .filter(c => c !== "");
      product.color = [...new Set(colorArray)];
    }

    if (!product.video || product.video.length === 0) {
      if (req.files?.["video"]?.[0]) {
        product.video = req.files["video"][0].path;
      }
    } else if (video === "") {
      product.video = "";
    } else if (req.files?.["video"]?.[0]) {
      product.video = req.files["video"][0].path;
    }

    if (existingImages) {
      try {
        const parsedImages = typeof existingImages === 'string' 
          ? JSON.parse(existingImages) 
          : existingImages;
        product.images = Array.isArray(parsedImages) ? parsedImages : [];
      } catch (error) {
        console.error("Lỗi khi xử lý existingImages:", error);
        product.images = [];
      }
    }

    if (req.files?.["images"]) {
      const newImages = req.files["images"].map(file => file.path);
      product.images = [...product.images, ...newImages];
    }

    await product.save();
    
    console.log("Product updated successfully:", product);
    res.status(200).json({
      message: "Cập nhật sản phẩm thành công.",
      product,
    });
  } catch (error) {
    console.error("Lỗi cập nhật sản phẩm:", error.message);
    res.status(500).json({ 
      message: "Đã xảy ra lỗi khi cập nhật sản phẩm",
      error: error.message 
    });
  }
};

exports.deleteProducts = async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Chỉ quản trị viên mới có quyền xóa sản phẩm" });
    }
    const { productId, productIds } = req.body;
    if (!productId && (!Array.isArray(productIds) || productIds.length === 0)) {
      return res.status(400).json({ message: "Thiếu sản phẩm cần xóa" });
    }
    let deleteResult;

    if (productId) {
      deleteResult = await Product.deleteOne({ _id: productId });
    } else {
      deleteResult = await Product.deleteMany({ _id: { $in: productIds } });
    }
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm để xóa" });
    }
    res.status(200).json({ message: "Xoá sản phẩm thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi xóa sản phẩm, vui lòng thử lại sau" });
  }
};


