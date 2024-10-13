#!/bin/bash

# download env template and docker compose
curl -o .env.template https://raw.githubusercontent.com/lmarschall/wembat/main/setup/.env.template
curl -o docker-compose.yml https://raw.githubusercontent.com/lmarschall/wembat/main/setup/docker-compose.yml

# create keys for api server
mkdir ./keys
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out ./keys/privateKey.pem -outform PEM
openssl ec -in ./keys/privateKey.pem -pubout -out ./keys/publicKey.pem

# define the template file and output file
TEMPLATE_FILE=".env.template"
OUTPUT_FILE=".env"

# generate random password
postgresPassword=$(openssl rand -base64 12)

# define the placeholders and their corresponding values
PLACEHOLDERS=(
    "PLACEHOLDER_DATABASE_POSTGRES_USER"
    "PLACEHOLDER_DATABASE_POSTGRES_PASSWORD"
    "PLACEHOLDER_DATABASE_POSTGRES_DB"
    "PLACEHOLDER_DATABASE_POSTGRES_PORT"
    "PLACEHOLDER_DATABASE_URL"
    "PLACEHOLDER_API_SERVER_URL"
    "PLACEHOLDER_API_SERVER_PORT"
    "PLACEHOLDER_API_DATABASE_URL"
    "PLACEHOLDER_DASHBOARD_SERVER_URL"
    "PLACEHOLDER_DASHBOARD_SERVER_PORT"
)
VALUES=(
    "postgresUser"
    "$postgresPassword"
    "postgresDatabase"
    "5432"
    "postgresql://postgresUser:$postgresPassword@localhost:5432/postgresDatabase"
    "http://localhost:8080"
    "8080"
    "postgres://postgresUser:$postgresPassword@postgres:5432/postgresDatabase?connect_timeout=300"
    "http://localhost:9090"
    "9090"
)

# check if template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Template file $TEMPLATE_FILE does not exist."
    exit 1
fi

# create a copy of the template to the output file
cp "$TEMPLATE_FILE" "$OUTPUT_FILE"

# loop through placeholders and replace them with values in the output file
for i in "${!PLACEHOLDERS[@]}"; do
    echo "Replacing ${PLACEHOLDERS[$i]} with ${VALUES[$i]}"
    sed -i -e "s|${PLACEHOLDERS[$i]}|${VALUES[$i]}|g" "$OUTPUT_FILE"
done

echo "Environment file generated: $OUTPUT_FILE"
