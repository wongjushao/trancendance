FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

COPY --from=build /app/build/ ./
COPY default.conf /etc/nginx/conf.d/default.conf
