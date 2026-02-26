FROM node:20.19-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist/ ./
COPY default.conf /etc/nginx/conf.d/default.conf
