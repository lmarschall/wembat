
# define build stage and create gzipped files
FROM node:16 as build-stage
RUN apt-get update
RUN apt-get install gettext-base
WORKDIR /build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npx gzipper compress ./dist

# define run stage and serve application
FROM caddy:2-alpine as run-stage
WORKDIR /app
COPY --from=build-stage /build/dist/ /app
COPY ./Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080