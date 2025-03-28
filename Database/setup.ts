require("dotenv").config();
import { sequelize } from '../Database/sequelize';
import { initEventModel } from '../Models/Event';
import { initSavedScrap } from '../Models/Scrap';

initEventModel();
initSavedScrap();

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync the model with the database
    await sequelize.sync({ alter: true }); // Use `alter: true` to update the schema without dropping data
    console.log('Event model synchronized with the database.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
})();