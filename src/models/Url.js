const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    urlId: {
        type: String,
        index: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    url: {
        type: String,
        default: ''
    },
    shortUrl: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

mongoose.model('Url', urlSchema);
