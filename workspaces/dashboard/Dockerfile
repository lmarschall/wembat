# define build stage and create gzipped files
FROM node:20.10 as build-stage
RUN apt-get update
RUN apt-get install gettext-base
WORKDIR /usr/src/build
COPY package*.json ./
COPY ./workspaces/dashboard/package*.json ./workspaces/dashboard/
RUN npm ci
WORKDIR /usr/src/build/workspaces/dashboard
COPY ./workspaces/dashboard .
RUN npm run build
RUN npx gzipper compress ./dist

# define run stage and serve application
FROM caddy:2-alpine as run-stage
WORKDIR /usr/src/app
COPY --from=build-stage /usr/src/build/workspaces/dashboard/dist/ /usr/src/app
COPY ./workspaces/dashboard/Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080