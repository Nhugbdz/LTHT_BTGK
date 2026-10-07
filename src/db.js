const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Sử dụng DNS của Google

const mongoose = require('mongoose');
require('dotenv').config();

// Tạo kết nối Read-only
const readConn = mongoose.createConnection(process.env.MONGO_READ_URI, {
    dbName: 'DB_23IT202'
});

// Tạo kết nối Write-only
const writeConn = mongoose.createConnection(process.env.MONGO_WRITE_URI, {
    dbName: 'DB_23IT202'
});

// Bắt sự kiện kết nối thành công
readConn.on('connected', () => {
    console.log('✅ Đã kết nối thành công tới DB (Quyền READ)');
});

writeConn.on('connected', () => {
    console.log('✅ Đã kết nối thành công tới DB (Quyền WRITE)');
});

// Bắt sự kiện lỗi (nếu có)
readConn.on('error', (err) => console.error('❌ Lỗi kết nối READ:', err.message));
writeConn.on('error', (err) => console.error('❌ Lỗi kết nối WRITE:', err.message));

// Thêm dòng này vào cuối file db.js
module.exports = { readConn, writeConn };