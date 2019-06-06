FROM mhart/alpine-node:8

WORKDIR /app

COPY . /app

RUN npm install

CMD node sfin_bills_server.js
