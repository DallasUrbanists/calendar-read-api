require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const dn4h = require('./dn4h.js');

// Middleware to parse JSON
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello, world! Your API is running." });
});

app.get("/test", (req, res) => {
  const teamupMainCalendarId = process.env.TEAMUP_DALLAS_URBANISTS_COMMUNITY_CALENDAR_MODIFIABLE_ID;
  const teamupSubcalendarId = '14173954';
  const minWaitSeconds = process.env.MIN_WAIT_SECONDS ?? 2;
  const maxWaitSeconds = process.env.MAX_WAIT_SECONDS ?? 5;
  const teamupApiKey = process.env.TEAMUP_APIKEY;
  res.json({
    teamupMainCalendarId,
    teamupSubcalendarId,
    minWaitSeconds,
    maxWaitSeconds,
    teamupApiKey
  })  
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
