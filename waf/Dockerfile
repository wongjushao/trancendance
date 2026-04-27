FROM owasp/modsecurity-crs:nginx

USER root

ENV DOLLAR=$

COPY waf/nginx.conf /etc/nginx/templates/conf.d/default.conf.template
COPY waf/modsecurity-override.conf.template /etc/nginx/templates/modsecurity.d/modsecurity-override.conf.template

EXPOSE 80 443
