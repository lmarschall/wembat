#!/bin/bash

# Define the template file and output file
TEMPLATE_FILE="docker-compose.template.yml"
OUTPUT_FILE="docker-compose.yml"

# Define the placeholders and their corresponding values
PLACEHOLDERS=(
    "PLACEHOLDER_POSTGRES_USER"
    "PLACEHOLDER_POSTGRES_PASSWORD"
    "PLACEHOLDER_POSTGRES_DB"
    "PLACEHOLDER_PORT"
    "PLACEHOLDER_VOLUME"
)
VALUES=(
    "postgres"
    "postgres"
    "postgres"
    "8080:80"
    "/host/path:/container/path"
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

echo "Docker Compose file generated: $OUTPUT_FILE"
