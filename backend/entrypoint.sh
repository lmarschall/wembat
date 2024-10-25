#!/usr/bin/bash

DB_HOST=postgres
DB_PORT=5432
DB_USER=$DATABASE_USER

echo "Database Host: $DB_HOST"
echo "Database Port: $DB_PORT"
echo "Database User: $DB_USER"

# Function to check if PostgreSQL is ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Waiting for PostgreSQL to initialize..."
  sleep 1
done

echo "Postgres is ready!"

# deploy migrations to database
echo "Apply Primsa migrations..."
npx prisma migrate deploy

KEYS_DIR="/opt/data/keys"

echo "Checking for key directory..."
# Check if the directory exists
if [ -d "$KEYS_DIR" ]; then
  echo "Directory exists."
else
  mkdir -p $KEYS_DIR
  echo "Directory created."
fi

echo "Key directory: $KEYS_DIR/privateKey.pem"
echo "Key directory: $KEYS_DIR/publicKey.pem"

echo "Checking for keys..."
# Check if the directory contains any files
if [ "$(ls -A $KEYS_DIR)" ]; then
  echo "Keys exist in the directory."
else
  openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out $KEYS_DIR/privateKey.pem -outform PEM
  openssl ec -in $KEYS_DIR/privateKey.pem -pubout -out $KEYS_DIR/publicKey.pem
  echo "Keys created."
fi

# start api server
echo "Starting API server..."
npm run start