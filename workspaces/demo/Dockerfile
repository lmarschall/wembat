# define build stage and create gzipped files
FROM node:20.10 AS build-stage
RUN apt-get update
RUN apt-get install gettext-base
WORKDIR /usr/src/build

# Copy root package.json and all workspace package.json files
COPY package*.json ./
COPY ./workspaces/client/package*.json ./workspaces/client/
COPY ./workspaces/demo/package*.json ./workspaces/demo/

# Copy the client workspace source code (needed for workspace dependency)
COPY ./workspaces/client ./workspaces/client/

# Install all dependencies (including devDependencies for build)
RUN npm ci --ignore-scripts

# Build the client workspace first
WORKDIR /usr/src/build/workspaces/client
RUN npm run build

# Copy demo source and build
WORKDIR /usr/src/build/workspaces/demo
COPY ./workspaces/demo .
RUN npm run build
RUN npx gzipper compress ./dist

# define run stage and serve application
FROM caddy:2-alpine AS run-stage
WORKDIR /usr/src/app
COPY --from=build-stage /usr/src/build/workspaces/demo/dist/ /usr/src/app
COPY ./workspaces/demo/Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080
# COPY . ./workspaces/demo
# WORKDIR /usr/src/build/workspaces/demo
# RUN npm run build
# RUN npx gzipper compress ./dist

# # define run stage and serve application
# FROM caddy:2-alpine AS run-stage
# WORKDIR /usr/src/app

# COPY --from=build-stage /usr/src/build/workspaces/demo/dist/ /usr/src/app
# COPY Caddyfile /etc/caddy/Caddyfile

# EXPOSE 8080
