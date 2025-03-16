const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Hello, world! Your API is running." });
});

app.get("/api/data", (req, res) => {
    res.json({ data: "Here is some sample data!" });
});

app.get("/api/duck", (req, res) => {
  res.json({
    bird: "Duck",
    message: "Quack quack! I'm just a friendly duck!"
  });
});

app.get("/api/goose", (req, res) => {
  res.json({
    bird: "Goose",
    message: "Honk honk! I'm a goose!"
  });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
