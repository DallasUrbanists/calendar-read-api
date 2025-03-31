require("dotenv").config();
import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true, // Enforce SSL
      rejectUnauthorized: false, // Allow self-signed certificates (optional, depending on your database setup)
    },
  },
  logging: false, // Disable logging for cleaner output
});