FROM alpine

RUN apk add --update nodejs npm

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 3000

ENTRYPOINT ["npm", "start"]