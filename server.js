const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   DATABASE (TEMP IN-MEMORY)
========================= */
let users = {};
let sessions = {};

/* =========================
   AUTO ADMIN ACCOUNT
========================= */
users["isaacgoated"] = {
  username: "isaacgoated",
  email: "admin@rewind.local",
  password: bcrypt.hashSync("abc", 10),
  role: "admin",
  online: false,
  mustChangePassword: true,
  avatar: {
    hat: null,
    shirt: null,
    accessory: null
  }
};

/* =========================
   HELPERS
========================= */
function getUserByToken(token) {
  const username = sessions[token];
  if (!username) return null;
  return users[username];
}

/* =========================
   STATUS
========================= */
app.get("/api/status", (req, res) => {
  const onlineUsers = Object.values(users).filter(u => u.online).length;

  res.json({
    status: "online",
    project: "Rewind",
    onlineUsers
  });
});

/* =========================
   SIGNUP (SEPARATE PAGE)
========================= */
app.post("/api/signup", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (users[username]) {
    return res.status(400).json({ error: "User already exists" });
  }

  users[username] = {
    username,
    email,
    password: bcrypt.hashSync(password, 10),
    role: "user",
    online: false,
    mustChangePassword: false,
    avatar: {
      hat: null,
      shirt: null,
      accessory: null
    }
  };

  res.json({ success: true });
});

/* =========================
   LOGIN (SEPARATE PAGE)
========================= */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const user = users[username];
  if (!user) return res.status(400).json({ error: "User not found" });

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: "Wrong password" });
  }

  user.online = true;

  const token = uuidv4();
  sessions[token] = username;

  res.json({
    success: true,
    token,
    username,
    role: user.role,
    mustChangePassword: user.mustChangePassword
  });
});

/* =========================
   LOGOUT
========================= */
app.post("/api/logout", (req, res) => {
  const { token } = req.body;

  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: "Invalid session" });

  user.online = false;

  delete sessions[token];

  res.json({ success: true });
});

/* =========================
   CHANGE PASSWORD
========================= */
app.post("/api/change-password", (req, res) => {
  const { token, newPassword } = req.body;

  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: "Invalid session" });

  user.password = bcrypt.hashSync(newPassword, 10);
  user.mustChangePassword = false;

  res.json({ success: true });
});

/* =========================
   PROFILE (TAB SYSTEM)
========================= */
app.get("/api/profile", (req, res) => {
  const token = req.headers.authorization;

  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  res.json({
    username: user.username,
    email: user.email,
    role: user.role,
    online: user.online,
    avatar: user.avatar
  });
});

/* =========================
   AVATAR SYSTEM
========================= */
app.post("/api/avatar", (req, res) => {
  const token = req.headers.authorization;

  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const { hat, shirt, accessory } = req.body;

  if (hat !== undefined) user.avatar.hat = hat;
  if (shirt !== undefined) user.avatar.shirt = shirt;
  if (accessory !== undefined) user.avatar.accessory = accessory;

  res.json({
    success: true,
    avatar: user.avatar
  });
});

/* =========================
   ONLINE USERS
========================= */
app.get("/api/online", (req, res) => {
  const onlineUsers = Object.values(users)
    .filter(u => u.online)
    .map(u => u.username);

  res.json({ onlineUsers });
});

/* =========================
   NEWS (SHOWS STATUS)
========================= */
app.get("/api/news", (req, res) => {
  const onlineUsers = Object.values(users)
    .filter(u => u.online)
    .map(u => u.username);

  res.json({
    news: [
      {
        title: "Rewind Online",
        message: `${onlineUsers.length} users currently online`
      },
      {
        title: "Active Users",
        message: onlineUsers
      }
    ]
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Rewind running on port " + PORT);
});
