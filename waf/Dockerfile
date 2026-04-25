FROM owasp/modsecurity-crs:nginx

USER root

ENV DOLLAR=$

COPY waf/nginx.conf /etc/nginx/templates/conf.d/default.conf.template

EXPOSE 80 443
