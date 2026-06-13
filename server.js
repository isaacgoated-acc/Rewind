const express = require("express");
const path = require("path");

const app = express();

// serve website files
app.use(express.static(path.join(__dirname, "public")));

// homepage route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Rewind running on port " + PORT);
});
