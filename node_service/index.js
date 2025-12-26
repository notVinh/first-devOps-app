import express from 'express';
import mongoose from 'mongoose';
import redis from 'redis';

const app = express();
app.use(express.json());

// Kết nối các dịch vụ bằng tên định nghĩa trong docker-compose
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
mongoose.connect(process.env.MONGO_URL);

const User = mongoose.model('User', { name: String, email: String });

// 1. API THÊM NGƯỜI DÙNG
app.post('/users', async (req, res) => {
  const newUser = new User(req.body);
  await newUser.save();
  res.send({ message: "Đã lưu vào MongoDB", user: newUser });
});

// 2. API LẤY THÔNG TIN (CÓ DÙNG CACHED)
app.get('/users/:email', async (req, res) => {
  const email = req.params.email;

  // Bước A: Kiểm tra trong Redis (Cache)
  const cachedUser = await redisClient.get(email);
  if (cachedUser) {
    console.log("🚀 Lấy từ Redis (Tốc độ ánh sáng)");
    return res.send({ source: "Cache", data: JSON.parse(cachedUser) });
  }

  // Bước B: Nếu không có, tìm trong MongoDB
  console.log("🐢 Không có trong Redis, đang tìm trong MongoDB...");
  const user = await User.findOne({ email });

  if (user) {
    // Bước C: Lưu vào Redis để lần sau load nhanh (hết hạn sau 60s)
    await redisClient.setEx(email, 60, JSON.stringify(user));
    return res.send({ source: "Database", data: user });
  }

  res.status(404).send("Không tìm thấy người dùng");
});

app.get('/', (req, res) => {
    res.send("Vinh dep trai!");
});

app.listen(5000, () => console.log("Server đang chạy tại cổng 5000"));
redisClient.connect();