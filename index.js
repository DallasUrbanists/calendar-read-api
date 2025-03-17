require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const dn4h = require('./dn4h.js');

// Middleware to parse JSON
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Hello! You found my calendar event scraper. I builts this web service toHey there! You’ve found my calendar event scraper. I built this to keep the Dallas Urbanists Community Calendar updated automatically. Every few hours, a script grabs events from local organizations and adds them to the calendar.",
    links: [
      {
        label: 'Dallas Urbanists Community Calendar on Teamup',
        url: 'https://teamup.com/kszxfmof4iyibgp1kn'
      },
      {
        label: 'Github',
        url: 'https://github.com/DallasUrbanists/calendar-read-api'
      },
    ]
  });
});

app.get("/api/dn4h/sync", (req, res) => {
  dn4h().then(result => {
    res.json(result);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
