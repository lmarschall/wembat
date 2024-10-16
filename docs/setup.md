# Setup

This page shows the first steps to install the Wembat Backend and how to use the Wembat Dashboard to create applications and retrieve tokens, which can be used in applications.

## Install with Script

1. Install the backend with the following command, all files needed will be downloaded and a default environment file will be generated

```bash
bash <(curl -s https://raw.githubusercontent.com/lmarschall/wembat/refs/heads/main/setup/install.sh)
```

## Install with Commands

1. Download the Docker Compose file and the template environment file from the ./setup folder

```
curl -o .env.template https://raw.githubusercontent.com/lmarschall/wembat/main/setup/.env.template
curl -o docker-compose.yml https://raw.githubusercontent.com/lmarschall/wembat/main/setup/docker-compose.yml
```

2. Create the key folder and create keys for backend

```
mkdir ./keys
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out ./keys/privateKey.pem -outform PEM
openssl ec -in ./keys/privateKey.pem -pubout -out ./keys/publicKey.pem
```

## Config Environment

1. Edit the environment file for your needs, the following shows an example config for local development

```
# database
DATABASE_POSTGRES_USER=postgresUser
DATABASE_POSTGRES_PASSWORD=postgresPassword 
DATABASE_POSTGRES_DB=postgresDatabase
DATABASE_POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgresUser:postgresPassword@localhost:5432/postgresDatabase

# api
API_SERVER_URL=http://localhost:8080
API_SERVER_PORT=8080
API_DATABASE_URL=postgres://postgresUser:postgresPassword@postgres:5432/postgresDatabase?connect_timeout=300

# dashboard
DASHBOARD_SERVER_URL=http://localhost:9090
DASHBOARD_SERVER_PORT=9090
```

## Start Server

1. Start the wembat backend with the following Docker Compose command and open the logs

```bash
docker compose up -d && docker compose logs -f
```

2. After the backend has been started an dashboard url will be shown in the logs, **open the dashboard url**

## Create Application Token

1. In the dashboard click the **Add Application** button and enter a valid domain and name for the application

2. After creation, the application should appear in the application data table

3. Click on **Action** and **Token** to retrieve an application token

4. Use this token when creating a Wembat client in your applications