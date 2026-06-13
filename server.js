const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   DATABASE
========================= */
let users = {};
let sessions = {};
let bannedUsers = new Set();
let items = [];
let rooms = [];

/* =========================
   ADMIN ACCOUNT
========================= */
users["isaacgoated"] = {
  username: "isaacgoated",
  email: "admin@rewind.local",
  password: bcrypt.hashSync("abc", 10),
  role: "admin",
  online: false,
  mustChangePassword: true,
  avatar: { hat: null, shirt: null, accessory: null }
};

/* =========================
   HELPERS
========================= */
function getUser(token) {
  const username = sessions[token];
  if (!username) return null;
  return users[username];
}

/* =========================
   SIGNUP
========================= */
app.post("/api/signup", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.json({ error: "Missing fields" });

  if (users[username])
    return res.json({ error: "User already exists" });

  users[username] = {
    username,
    email,
    password: bcrypt.hashSync(password, 10),
    role: "user",
    online: false,
    mustChangePassword: false,
    avatar: { hat: null, shirt: null, accessory: null }
  };

  res.json({ success: true });
});

/* =========================
   LOGIN (BAN CHECK ADDED)
========================= */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (bannedUsers.has(username))
    return res.json({ error: "You are banned" });

  const user = users[username];
  if (!user) return res.json({ error: "User not found" });

  if (!bcrypt.compareSync(password, user.password))
    return res.json({ error: "Wrong password" });

  const token = uuidv4();
  sessions[token] = username;

  user.online = true;

  res.json({
    success: true,
    token,
    username,
    role: user.role
  });
});

/* =========================
   LOGOUT (FIXED PROPERLY)
========================= */
app.post("/api/logout", (req, res) => {
  const { token } = req.body;

  const username = sessions[token];
  if (!username) return res.json({ error: "Invalid session" });

  users[username].online = false;

  delete sessions[token]; // 🔥 THIS FIXES YOUR BUG

  res.json({ success: true });
});

/* =========================
   PROFILE
========================= */
app.get("/api/profile", (req, res) => {
  const token = req.headers.authorization;

  const user = getUser(token);
  if (!user) return res.json({ error: "Not logged in" });

  res.json({
    username: user.username,
    role: user.role,
    avatar: user.avatar,
    online: user.online
  });
});

/* =========================
   ADMIN PANEL
========================= */
app.get("/api/admin", (req, res) => {
  const token = req.headers.authorization;
  const user = getUser(token);

  if (!user || user.role !== "admin")
    return res.json({ error: "No admin access" });

  res.json({
    users: Object.values(users),
    bannedUsers: Array.from(bannedUsers),
    items,
    rooms
  });
});

/* =========================
   BAN USER
========================= */
app.post("/api/admin/ban", (req, res) => {
  const { token, target } = req.body;

  const user = getUser(token);
  if (!user || user.role !== "admin")
    return res.json({ error: "No admin access" });

  bannedUsers.add(target);

  if (users[target]) {
    users[target].online = false;
  }

  res.json({ success: true });
});

/* =========================
   CREATE ITEM (ADMIN)
========================= */
app.post("/api/admin/item", (req, res) => {
  const { token, name } = req.body;

  const user = getUser(token);
  if (!user || user.role !== "admin")
    return res.json({ error: "No admin access" });

  items.push({ name });

  res.json({ success: true, items });
});

/* =========================
   CREATE ROOM (ADMIN)
========================= */
app.post("/api/admin/room", (req, res) => {
  const { token, name } = req.body;

  const user = getUser(token);
  if (!user || user.role !== "admin")
    return res.json({ error: "No admin access" });

  rooms.push({ name, players: 0 });

  res.json({ success: true, rooms });
});

/* =========================
   ONLINE USERS
========================= */
app.get("/api/online", (req, res) => {
  res.json({
    onlineUsers: Object.values(users)
      .filter(u => u.online)
      .map(u => u.username)
  });
});

/* =========================
   NEWS
========================= */
app.get("/api/news", (req, res) => {
  res.json({
    news: [
      {
        title: "Rewind Live",
        message: "System running correctly"
      }
    ]
  });
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Rewind running on " + PORT);
});
