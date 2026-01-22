FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Simple static frontend that calls the backend
COPY index.html ./index.html
COPY default.conf /etc/nginx/conf.d/default.conf
