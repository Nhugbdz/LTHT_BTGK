const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    maSach: { type: String, required: true, unique: true },
    tenSach: { type: String, required: true },
    giaGoc: { type: Number, required: true },
    giaSauThue: { type: Number, required: true },
    image: { type: String, default: '' }, // <-- THÊM DÒNG NÀY
    createdAt: { type: Date, default: Date.now }
});

// Hàm tạo Model từ một kết nối bất kỳ
const getBookModel = (connection) => {
    return connection.model('Book', bookSchema);
};

module.exports = { getBookModel };