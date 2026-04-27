FROM grafana/grafana:latest

USER root

RUN apk add --no-cache bash sudo wget && \
    wget -qO- 'https://artifacts-cli.infisical.com/setup.apk.sh' | sudo sh && \
    apk update && sudo apk add infisical

USER grafana

CMD ["infisical", "run", "--", "grafana-server"]
