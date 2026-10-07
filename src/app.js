const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { engine } = require('express-handlebars');
const path = require('path');
const multer = require('multer'); // <--- THÊM DÒNG NÀY ĐỂ XỬ LÝ UPLOAD ẢNH
const { readConn, writeConn } = require('./db');
const { getBookModel } = require('./models/Book');
require('dotenv').config();
const fs = require('fs');

const app = express();

// ==========================================
// CẤU HÌNH UPLOAD ẢNH (MULTER)
// ==========================================

// Tự động tạo thư mục nếu chưa tồn tại
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Đã tạo thư mục public/uploads');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Lưu ảnh vào thư mục public/uploads (nằm ngoài src)
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: function (req, file, cb) {
        // Đặt tên file để không bị trùng: timestamp + tên gốc
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Cấu hình Handlebars
app.engine('hbs', engine({
    extname: '.hbs',
    layoutsDir: path.join(__dirname, '../views/layouts'),
    defaultLayout: 'main',
    partialsDir: path.join(__dirname, '../views/partials')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../views'));

// Middleware parse body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cấu hình thư mục public để chứa ảnh (BẮT BUỘC)
app.use(express.static(path.join(__dirname, '../public')));

// Cấu hình Stateless Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_WRITE_URI,
        dbName: 'DB_23IT202',
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60
    }),
    cookie: { maxAge: 14 * 24 * 60 * 60 * 1000, secure: false }
}));

// Khởi tạo Model cho từng kết nối
const BookRead = getBookModel(readConn);
const BookWrite = getBookModel(writeConn);

// ==========================================
// THUẬT TOÁN CÁ NHÂN HÓA (MSSV & VAT)
// ==========================================
const MSSV = '23IT202'; // Thay bằng MSSV của bạn
const HO_TEN = 'Trần Quang Như'; // Thay bằng họ tên của bạn

const PREFIX_3_SO_CUOI = MSSV.slice(-3);
const CHU_SO_CUOI = parseInt(MSSV.slice(-1));
const VAT_RATE = CHU_SO_CUOI + 5;

// Middleware truyền dữ liệu cá nhân hóa ra View
app.use((req, res, next) => {
    res.locals.hoTen = HO_TEN;
    res.locals.mssv = MSSV;
    res.locals.vatRate = VAT_RATE;
    next();
});

// ==========================================
// ROUTES
// ==========================================

// 1. Route hiển thị danh sách (Dùng Read Connection)
app.get('/', async (req, res) => {
    try {
        const books = await BookRead.find().lean();
        res.render('index', { books });
    } catch (error) {
        res.status(500).send('Lỗi đọc dữ liệu: ' + error.message);
    }
});

// 2. Route thêm mới sách (Dùng Write Connection & Upload ảnh)
// Thêm middleware upload.single('image') vào giữa route và hàm xử lý
app.post('/add', upload.single('image'), async (req, res) => {
    try {
        const { maSach, tenSach, giaGoc } = req.body;

        // --- BỘ LỌC DỮ LIỆU ---
        if (!maSach.startsWith(PREFIX_3_SO_CUOI)) {
            return res.status(400).send(`Lỗi: Mã sản phẩm phải bắt đầu bằng "${PREFIX_3_SO_CUOI}"`);
        }

        // --- TÍNH THUẾ ĐỘNG ---
        const giaSauThue = giaGoc * (1 + VAT_RATE / 100);

        // --- XỬ LÝ ĐƯỜNG DẪN ẢNH ---
        let imagePath = '';
        if (req.file) {
            // Đường dẫn tương đối để hiển thị trên web (ví dụ: /uploads/12345-anh.jpg)
            imagePath = '/uploads/' + req.file.filename;
        }

        // Lưu xuống Cloud bằng Write Connection
        const newBook = new BookWrite({
            maSach,
            tenSach,
            giaGoc,
            giaSauThue,
            image: imagePath // Lưu đường dẫn ảnh vào database
        });

        await newBook.save();
        res.redirect('/');
    } catch (error) {
        res.status(500).send('Lỗi ghi dữ liệu: ' + error.message);
    }
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});