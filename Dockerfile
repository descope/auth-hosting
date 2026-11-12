# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
ARG NODE_VERSION=18
ARG HTML_DIR=/usr/share/nginx/html
ARG REACT_APP_DESCOPE_BASE_URL="https://api.descope.com"
ARG REACT_APP_CONTENT_BASE_URL="https://static.descope.com/pages"
ARG REACT_APP_USE_ORIGIN_BASE_URL="false"
ARG REACT_APP_FAVICON_URL="https://imgs.descope.com/auth-hosting/favicon.svg"
ARG DESCOPE_PROJECT_ID=""
ARG DESCOPE_FLOW_ID=""
ARG BUILDPLATFORM

FROM --platform=${BUILDPLATFORM} node:${NODE_VERSION}-alpine AS builder
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "yarn.lock*", "./"]

RUN yarn install --production=false
COPY . .

RUN yarn build

# Step 2 Validate Caddyfile before copying to distroless
FROM alpine:latest AS validator
RUN apk add --no-cache caddy
COPY Caddyfile /etc/caddy/Caddyfile
RUN caddy validate --config /etc/caddy/Caddyfile && \
    caddy fmt --overwrite /etc/caddy/Caddyfile

# build the final image with the correct target architecture (dont specify target)
FROM verity.supply/caddy:2.11.7-fips@sha256:002018ed94915576e433eef8c1cdab40ebdb77ee7d3f5b95b63f9d4447c0afa2 AS production

ENV PORT=8080
ENV WWW_ROOT=/www
ENV XDG_DATA_HOME=/tmp
ENV XDG_CONFIG_HOME=/tmp
ENV XDG_CACHE_HOME=/tmp

WORKDIR ${WWW_ROOT}

COPY --from=builder --chown=1000:1000 /app/build ${WWW_ROOT}
COPY --from=builder --chown=1000:1000 /app/package.json ${WWW_ROOT}
ADD --chown=nonroot:nonroot Caddyfile /etc/caddy/Caddyfile
ENTRYPOINT ["caddy"]
CMD ["run", "--config", "/etc/caddy/Caddyfile"]
