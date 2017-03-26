FROM node:6.4

RUN mkdir /app
WORKDIR /app

COPY ./package.json /app/
RUN npm install

ADD . /app

EXPOSE 80

CMD npm start