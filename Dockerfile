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

FROM ghcr.io/descope/caddy:v0.1.40

ENV PORT=8080
ENV WWW_ROOT=/www
ENV XDG_DATA_HOME=/tmp
ENV XDG_CONFIG_HOME=/tmp
ENV XDG_CACHE_HOME=/tmp

WORKDIR ${WWW_ROOT}

COPY --from=builder --chown=1000:1000 /app/build ${WWW_ROOT}
COPY --from=builder --chown=1000:1000 /app/package.json ${WWW_ROOT}

ADD --chown=nonroot:nonroot Caddyfile /etc/caddy/Caddyfile

RUN caddy validate --config /etc/caddy/Caddyfile

CMD ["run", "--config", "/etc/caddy/Caddyfile"]
