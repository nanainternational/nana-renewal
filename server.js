import express from "express"; // 'require' 대신 'import'
import cors from "cors"; // 'require' 대신 'import'

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "https://nana-renewal.onrender.com", // 허용할 클라이언트 도메인
    methods: ["GET", "POST"],
    credentials: true, // 쿠키나 세션을 허용하려면 true로 설정
  }),
);

app.get("/", (req, res) => {
  res.send("Backend alive");
});

app.get("/auth/google/callback", (req, res) => {
  res.send("Google login callback works");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
