# build stage
FROM node:20 AS build

# make the 'build' folder the current working directory
WORKDIR /usr/src/build

# copy both 'package.json' and 'package-lock.json'
COPY ./package*.json ./
COPY ./workspaces/server/package*.json ./workspaces/server/

# install project dependencies
RUN npm ci

# move to the server workspace
WORKDIR /usr/src/build/workspaces/server

# copy source files
COPY ./workspaces/server/ .

# generate prisma models for prisma client
RUN npx prisma generate

# build app with typescript
RUN npm run build

# run stage
FROM node:20-bullseye-slim AS run

# install postgresql client
RUN apt-get update && apt-get install -y \
    postgresql-client \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /opt/data \
    && chown -R node:node /opt/data

# create data volume
VOLUME /opt/data

# set environment variables
ENV NODE_ENV=production

# create node user
USER node

# make the 'app' folder the current working directory
WORKDIR /usr/src/app

# copy both 'package.json' and 'package-lock.json'
COPY ./workspaces/server/package*.json /usr/src/app/

# install project dependencies
RUN npm ci --omit=dev

# copy build files from build stage
COPY --chown=node:node --from=build /usr/src/build/workspaces/server/dist /usr/src/app/dist
COPY --chown=node:node --from=build /usr/src/build/workspaces/server/prisma /usr/src/app/prisma
COPY --chown=node:node --from=build /usr/src/build/workspaces/server/node_modules/.prisma /usr/src/app/node_modules/.prisma
COPY --chown=node:node --from=build /usr/src/build//workspaces/server/entrypoint.sh /usr/src/app/entrypoint.sh

# expose api port
EXPOSE 8080

CMD ["/bin/bash", "/usr/src/app/entrypoint.sh"]