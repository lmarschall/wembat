#!/bin/bash

# download env template and docker compose
curl -o .env.template https://raw.githubusercontent.com/lmarschall/wembat/main/backend/.env.template
curl -o docker-compose.yml https://raw.githubusercontent.com/lmarschall/wembat/main/backend/docker-compose.yml

# Define the template file and output file
TEMPLATE_FILE=".env.template"
OUTPUT_FILE=".env"

# generate random password
postgresPassword=$(openssl rand -base64 12)

# Define the placeholders and their corresponding values
PLACEHOLDERS=(
    "PLACEHOLDER_DATABASE_POSTGRES_USER"
    "PLACEHOLDER_DATABASE_POSTGRES_PASSWORD"
    "PLACEHOLDER_DATABASE_POSTGRES_DB"
    "PLACEHOLDER_DATABASE_POSTGRES_PORT"
    "PLACEHOLDER_DATABASE_URL"
    "PLACEHOLDER_API_SERVER_URL"
    "PLACEHOLDER_API_APP_DOMAINS"
    "PLACEHOLDER_API_DATABASE_URL"
)
VALUES=(
    "postgresUser"
    "$postgresPassword"
    "postgresDatabase"
    "5432"
    "postgresql://postgresUser:postgres@localhost:5432/postgresDatabase"
    "http://localhost:8080"
    "localhost:3000, localhost:3001, localhost:3002"
    "postgres://postgresUser:postgres@postgres:5432/postgresDatabase?connect_timeout=300"
)

# Check if template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Template file $TEMPLATE_FILE does not exist."
    exit 1
fi

# Create a copy of the template to the output file
cp "$TEMPLATE_FILE" "$OUTPUT_FILE"

# Loop through placeholders and replace them with values in the output file
for i in "${!PLACEHOLDERS[@]}"; do
    sed -i "s/${PLACEHOLDERS[$i]}/${VALUES[$i]}/g" "$OUTPUT_FILE"
done

echo "Environment file generated: $OUTPUT_FILE"
