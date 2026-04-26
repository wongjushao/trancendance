FROM node:20.19-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN apk add --no-cache curl ca-certificates bash sudo wget \
  && wget -qO- https://artifacts-cli.infisical.com/setup.apk.sh | sh \
  && apk add infisical

ENV CHOKIDAR_USEPOLLING=true
EXPOSE 3000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]