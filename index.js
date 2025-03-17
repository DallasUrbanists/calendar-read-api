const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const dn4h = require('./dn4h.js');

// Middleware to parse JSON
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello, world! Your API is running." });
});

app.get("/api/dn4h/sync", (req, res) => {
  dn4h().then(result => {
    console.log('API results:', result);
    res.json(result);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
