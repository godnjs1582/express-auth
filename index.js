const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 4000;

const posts = [
  { username: "John", title: "Post1" },
  { username: "Han", title: "Post2" },
];

let refreshTokens = [];
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("hi");
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const user = { name: username };
  //jwt 이용해서 토큰 생성하기 payload+secretKey
  const accessToken = jwt.sign(user, process.env.REACT_PUBLIC_ACCESS_KEY, {
    expiresIn: "30s",
  });
  const refreshToken = jwt.sign(user, process.env.REACT_PUBLIC_REFRESH_KEY, {
    expiresIn: "1d",
  });
  //원래는 refreshToken을 데이터베이스에 넣어둠
  refreshTokens.push(refreshToken);

  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 1000,
  });

  res.json({ accessToken: accessToken });
});

app.get("/posts", authMiddleware, (req, res) => {
  res.json(posts);
});

function authMiddleware(req, res, next) {
  //token을 request header에서 가져오기
  const authHeader = req.headers["authorization"];
  const token = authHeader && req.headers.authorization.split(" ")[1];
  if (token === null) return res.sendStatus(401);
  //토큰이 유효한지 확인하기
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      req.decoded = user;
      next();
    }
  });
}

app.get("/refresh", (req, res) => {
  const cookies = req.cookies;
  const refreshToken = cookies.jwt;
  if (!refreshToken) {
    return res.sendStatus(401);
  }

  if (!refreshTokens.includes(refreshToken)) {
    return res.sendStatus(403);
  }

  jwt.verify(
    refreshToken,
    process.env.REACT_PUBLIC_REFRESH_KEY,
    (err, user) => {
      if (err) {
        return res.sendStatus(403);
      } else {
        //accessToken 생성
        const accessToken = jwt.sign({ name: user.name }, process.env.REACT_PUBLIC_ACCESS_KEY, {
          expiresIn: "30s",
        });
        res.json({ accessToken });
      }
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
