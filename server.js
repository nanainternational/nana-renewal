const express = require("express");
const axios = require("axios"); // Kakao API 호출을 위한 axios 추가
const app = express();
const PORT = process.env.PORT || 3000;

// Kakao API 키 및 Redirect URI 설정
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_REDIRECT_URI =
  "https://nana-renewal.onrender.com/auth/kakao/callback";

app.get("/", (req, res) => {
  res.send("Backend alive");
});

// Kakao 로그인 콜백 처리
app.get("/auth/kakao/callback", async (req, res) => {
  const code = req.query.code; // Kakao에서 전달된 인증 코드

  // 인증 코드로 액세스 토큰 요청
  try {
    const tokenResponse = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: KAKAO_REST_API_KEY,
          redirect_uri: KAKAO_REDIRECT_URI,
          code: code,
        },
      },
    );

    const accessToken = tokenResponse.data.access_token; // 액세스 토큰

    // 액세스 토큰으로 사용자 정보 요청
    const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = userResponse.data; // 사용자 정보

    // 사용자 정보를 클라이언트에 응답
    res.json({
      message: "Kakao login successful",
      user: userData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Kakao login failed");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
