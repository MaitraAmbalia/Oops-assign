const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userTitle: { type: String, default: '' },
    userAvatar: { type: String, default: '' },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const PostSchema = new Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userTitle: { type: String, default: '' },
    userAvatar: { type: String, default: '' },
    content: { type: String, required: true },
    likes: { type: [String], default: [] },
    comments: [CommentSchema],
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);