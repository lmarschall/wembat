#!/usr/bin/bash

# deploy migrations to database
npx prisma migrate deploy

# start api server
npm run start