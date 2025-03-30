require("dotenv").config();
import { sequelize } from "./sequelize";
import Event, { initEventModel } from "../models/Event";
import { SavedScrap, initSavedScrap } from "../models/Scrap";

const exportData = require("./export.json");

initEventModel();
initSavedScrap();

const sync = new Map();

// ADD A LINE FOR EACH MODEL TO BE SYNCED
sync.set("events", Event);
sync.set("scraps", SavedScrap);

async function main() {
  await sequelize.authenticate();

  // Sync database structure
  await sequelize.sync({ force: true });

  for (let [key, m] of sync) {
    const data = exportData[key];

    // Extract the Event IDs stored in the database
    const storedIds = (await m.findAll({ attributes: ["id"] })).map(
      (e: entity) => e.id
    );
    const imports = data.filter((d: any) => !storedIds.includes(d.id));

    console.log(`Importing ${imports.length} ${key}`);

    // Import events to database
    await m.bulkCreate(imports);
  }
}

type entity = { id: number; };

main();
