import dotenv from "dotenv";
import express, { Request, Response } from "express";

dotenv.config();

const app = express();
const PORT: number = parseInt(process.env.PORT ?? "3000", 10);

// Middleware to parse JSON
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "QUACK HONK! You found my calendar event scraper. I built this to keep the Dallas Urbanists Community Calendar updated automatically. Every few hours, a script grabs events from local organizations and adds them to the calendar.",
    links: [
      {
        label: "Dallas Urbanists Community Calendar on Teamup",
        url: "https://teamup.com/kszxfmof4iyibgp1kn",
      },
      {
        label: "Github",
        url: "https://github.com/DallasUrbanists/calendar-read-api",
      },
    ],
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});