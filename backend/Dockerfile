# build stage
FROM node:20.10 AS build

# make the 'build' folder the current working directory
WORKDIR /usr/src/build

# copy both 'package.json' and 'package-lock.json'
COPY package*.json ./

# install project dependencies
RUN npm ci

# copy source files
COPY . .

# generate prisma models for prisma client
RUN npx prisma generate

# build app with typescript
RUN npm run build


# run stage
FROM node:20.10

# set environment variables
ENV NODE_ENV production

# create node user
USER node

# make the 'app' folder the current working directory
WORKDIR /usr/src/app

# copy both 'package.json' and 'package-lock.json'
COPY package*.json /usr/src/app/

# install project dependencies
RUN npm ci --omit=dev

# copy build files from build stage
COPY --chown=node:node --from=build /usr/src/build/dist /usr/src/app/dist
COPY --chown=node:node --from=build /usr/src/build/prisma /usr/src/app/prisma
COPY --chown=node:node --from=build /usr/src/build/node_modules/.prisma /usr/src/app/node_modules/.prisma
COPY --chown=node:node --from=build /usr/src/build/entrypoint.sh /usr/src/app/entrypoint.sh

# expose api port
EXPOSE 8080

CMD ["/bin/bash", "/usr/src/app/entrypoint.sh"]