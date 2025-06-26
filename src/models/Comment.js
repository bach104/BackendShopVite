const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }, 
    yourname: { 
      type: String, 
      required: true 
    }, 
    avatar: { 
      type: String, 
      default: '' 
    },
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    }, 
    content: { 
      type: String, 
      required: true 
    },
    parentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Comment', 
      default: null 
    }, 
    images: [String],
    videos: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
