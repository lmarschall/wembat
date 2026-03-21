import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// Use a fallback string if DATABASE_URL is missing 
// This allows 'prisma generate' to run without a real .env file
const dbUrl = process.env.DATABASE_URL || "postgresql://placeholder:5432"

console.log("Using Database URL: " + dbUrl);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // We use the variable we defined above
    url: dbUrl,
  },
})