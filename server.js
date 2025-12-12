const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Backend alive');
});

app.get('/auth/kakao/callback', (req, res) => {
  res.send('Kakao callback OK');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
