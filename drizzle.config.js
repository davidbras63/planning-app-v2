require('dotenv').config({ path: '.env.local' });

/** @type { import("drizzle-kit").Config } */
module.exports = {
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};