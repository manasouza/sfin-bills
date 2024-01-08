FROM node:14-slim

WORKDIR /app

COPY . /app

RUN npm install

CMD node sfin_bills_server.js
