import fs from "fs";
import path from "path";
import Event, { initEventModel } from "../models/Event"; // Adjust the path if necessary
import { initSavedScrap, SavedScrap } from "../models/Scrap";
import { sequelize } from "./sequelize";
import { Model } from "sequelize";

initEventModel();
initSavedScrap();

(async () => {
  try {
    await sequelize.authenticate();

    const json = (e: Model[]) => e.map((i) => i.toJSON());
    const exportData = {
      events: json(await Event.findAll()),
      scraps: json(await SavedScrap.findAll()),
    };

    fs.writeFileSync(
      path.join(__dirname, "export.json"),
      JSON.stringify(exportData, null, 2)
    );
  } catch (error) {
    console.error("Error exporting data:", error);
  } finally {
    await sequelize.close();
  }
})();
