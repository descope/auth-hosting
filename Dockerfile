# syntax=docker/dockerfile:1@sha256:93bfd3b68c109427185cd78b4779fc82b484b0b7618e36d0f104d4d801e66d25
ARG NODE_VERSION=18
ARG HTML_DIR=/usr/share/nginx/html
ARG REACT_APP_DESCOPE_BASE_URL="https://api.descope.com"
ARG REACT_APP_CONTENT_BASE_URL="https://static.descope.com/pages"
ARG REACT_APP_USE_ORIGIN_BASE_URL="false"
ARG REACT_APP_FAVICON_URL="https://imgs.descope.com/auth-hosting/favicon.svg"
ARG DESCOPE_PROJECT_ID=""
ARG DESCOPE_FLOW_ID=""

ARG BUILDPLATFORM
FROM --platform=${BUILDPLATFORM} node:${NODE_VERSION}-alpine as builder
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "yarn.lock*", "./"]

RUN yarn install --production=false
COPY . .

RUN yarn build

FROM ghcr.io/descope/caddy:v0.0.4

WORKDIR /www
COPY --from=builder --chown=1000:1000 /app/build /www
COPY --from=builder --chown=1000:1000 /app/package.json /www

USER 1000:1000

ADD --chown=1000:1000 Caddyfile /etc/caddy/Caddyfile

ENV HTTP_PORT=8080 HTTPS_PORT=8443
ENV WWW_ROOT=/www

ENTRYPOINT ["/usr/bin/caddy"]
CMD ["run", "--config", "/etc/caddy/Caddyfile"]
