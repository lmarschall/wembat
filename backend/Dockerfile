FROM node:20.10

# make the 'app' folder the current working directory
WORKDIR /app

# copy both 'package.json' and 'package-lock.json'
COPY package*.json ./

# install project dependencies
RUN npm install

# copy project files and folders to the current working directory
COPY . .

# generate prisma models for prisma client
RUN npx prisma generate

# build app for production with minification
RUN npm run build

# expose api port
EXPOSE 8080

CMD ["/bin/bash", "/app/entrypoint.sh"]