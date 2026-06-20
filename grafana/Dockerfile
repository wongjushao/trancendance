FROM grafana/grafana:latest

USER root

RUN apk add --no-cache bash sudo wget && \
    wget -qO- 'https://artifacts-cli.infisical.com/setup.apk.sh' | sudo sh && \
    apk update && sudo apk add infisical

COPY grafana/docker-entrypoint-infisical.sh /docker-entrypoint-infisical.sh
RUN chmod +x /docker-entrypoint-infisical.sh && chown grafana:root /docker-entrypoint-infisical.sh

USER grafana

# Must wrap the stock /run.sh, not pass "infisical ..." as extra args to `grafana server`
# (see /run.sh: exec grafana server ... "$@").
ENTRYPOINT ["/docker-entrypoint-infisical.sh"]
