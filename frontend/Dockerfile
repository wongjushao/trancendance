FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build || true
RUN if [ ! -d /app/build ] || [ -z "$(ls -A /app/build 2>/dev/null)" ]; then mkdir -p /app/build && cp /app/index.html /app/build/index.html; fi

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

COPY --from=build /app/build/ ./
COPY default.conf /etc/nginx/conf.d/default.conf
