const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    importPrice: {
      type: Number,
      required: true,
    },
    oldPrice: {
      type: Number,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    material: {
      type: [String], 
      required: true,
    },
    category: {
      type: [String], 
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    sold: {
      type: Number,
      required: true,
      default: 0,
    },
    season: {
      type: String,
      required: true,
    },
    size: {
      type: [String], 
    },
    color: {
      type: [String], 
    },
    images: {
      type: [String], 
      validate: {
        validator: function (value) {
          return value.length <= 15;  
        },
        message: 'Chỉ có thể thêm tối đa 15 ảnh sản phẩm.',
      },
    },
    video: {
      type: [String],  
      validate: {
        validator: function (value) {
          if (value && value.length > 0) {
            return value.every(video => typeof video === 'string' && video.trim().length > 0);
          }
          return true;
        },
        message: 'Video phải có tên tệp hợp lệ hoặc URL hợp lệ.',
      },
    },
    starRatings: {
      totalStars: {
        type: Number,
        default: 0,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0, 
      },
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre('save', function (next) {
  if (this.starRatings.totalReviews > 0) {
    this.starRatings.averageRating =
      this.starRatings.totalStars / this.starRatings.totalReviews;
  } else {
    this.starRatings.averageRating = 0;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);