const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
dotenv.config();
const port = process.env.PORT || 5001;
const adminRoutes = require('./src/routes/adminRoutes');
const userRoutes = require('./src/routes/userRoutes');
const productRoutes = require('./src/routes/productRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const cartRouter = require('./src/routes/cartRouter');
const orderRouter = require('./src/routes/orderRoutes');
const shipperRouter = require('./src/routes/shipperRouter');
const bankRouter = require('./src/routes/bankRouter');
const messengerRouter= require ('./src/routes/messengerRouter');
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Kết nối MongoDB thành công');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
};
connectDB();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.CLIENT_URL_SHIP || 'http://localhost:5174'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/admin', adminRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/carts', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/shippers', shipperRouter);
app.use('/api/payment', bankRouter);
app.use('/api/messenger', messengerRouter);


app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Không tìm thấy tài nguyên' 
  });
});

app.use((err, req, res, next) => {
  console.error('Lỗi server:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      success: false,
      message: 'Truy cập bị từ chối bởi CORS' 
    });
  }

  res.status(500).json({ 
    success: false,
    message: 'Đã xảy ra lỗi server' 
  });
});

app.listen(port, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
  console.log(`🌐 Allowed CORS Origins: ${allowedOrigins.join(', ')}`);
});


