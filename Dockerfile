FROM mhart/alpine-node:6.14.3

WORKDIR /app

COPY . /app

RUN npm install

CMD node sfin_bills_server.js