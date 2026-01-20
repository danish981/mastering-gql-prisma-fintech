import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  // for prisma 7, this would be commented
  // Optional: only needed if you use a non-standard migrations folder
  /* migrations: {
    path: "./prisma/migrations",
  }, 
  */
  datasource: {
    url: process.env.DATABASE_URL,
  },
});