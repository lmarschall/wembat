import 'dotenv/config'
import { defineConfig, env } from '@prisma/config'

const dbUrl = `postgresql://${env('DATABASE_USER')}:${env('DATABASE_PASSWORD')}@${env('DATABASE_HOST')}:${env('DATABASE_PORT')}/${env('DATABASE_DB')}?connect_timeout=300`

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // We use the variable we defined above
    url: dbUrl
  },
})