const User = require('../models/User');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const BAD_WORDS = ['mẹ mày', 'con chó', 'badword1', 'badword2'];

const containsBadWords = (text) => {
  return BAD_WORDS.some(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
};
exports.addComment = async (req, res) => {
  try {
    const { content, parentId, images, videos, productId, replyTo } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại.' });
    if (!user.yourname) return res.status(400).json({ message: 'Vui lòng cập nhật tên của bạn trước khi bình luận.' });

    if (!content || containsBadWords(content)) {
      return res.status(400).json({ message: 'Bình luận chứa nội dung không phù hợp hoặc trống.' });
    }

    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: 'parentId không hợp lệ.' });
    }

    let finalContent = content;
    if (parentId && replyTo) {
      finalContent = `@${replyTo} ${content}`;
    }

    const comment = new Comment({
      content: finalContent,
      userId,
      yourname: user.yourname,
      avatar: user.avatar,
      parentId: parentId || null,
      productId,
      images,
      videos,
      replyTo: replyTo || null,
    });

    await comment.save();
    res.status(201).json({ message: 'Bình luận đã được thêm.', comment });
  } catch (error) {
    console.error('Lỗi thêm bình luận:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 20; 
    const totalRootComments = await Comment.countDocuments({ productId, parentId: null });

    const rootComments = await Comment.find({ productId, parentId: null })
      .populate('userId', 'yourname avatar')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const childComments = await Comment.find({
      productId,
      parentId: { $in: rootComments.map(comment => comment._id) }
    }).populate('userId', 'yourname avatar');

    const commentMap = {};
    rootComments.forEach(comment => {
      commentMap[comment._id] = { ...comment.toObject(), replies: [] };
    });
    
    childComments.forEach(comment => {
      if (commentMap[comment.parentId]) {
        commentMap[comment.parentId].replies.push(comment.toObject());
      }
    });
    
    const result = Object.values(commentMap);

    res.status(200).json({
      comments: result,
      totalRootComments,
      totalPages: Math.ceil(totalRootComments / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Lỗi khi tải bình luận:', error.message);
    res.status(500).json({ error: error.message });
  }
};
exports.editComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID bình luận không hợp lệ.' });
    }

    if (!content || containsBadWords(content)) {
      return res.status(400).json({ message: 'Bình luận chứa nội dung không phù hợp hoặc trống.' });
    }

    const updatedComment = await Comment.findOneAndUpdate(
      { _id: id, userId },
      { content },
      { new: true }
    );
    if (!updatedComment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận hoặc không có quyền sửa.' });
    }

    res.status(200).json({ message: 'Bình luận đã được cập nhật.', updatedComment });
    console.log('Bình luận cập nhật:', updatedComment);
  } catch (error) {
    console.error('Lỗi sửa bình luận:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID bình luận không hợp lệ.' });
    }

    const comment = await Comment.findOne({ _id: id, userId });
    if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận hoặc không có quyền xóa.' });

    await Comment.deleteMany({ parentId: id });
    await Comment.findByIdAndDelete(id);

    res.status(200).json({ message: 'Xóa bình luận thành công.' });
  } catch (error) {
    console.error('Lỗi xóa bình luận:', error);
    res.status(500).json({ error: error.message });
  }
};