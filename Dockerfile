# syntax=docker/dockerfile:1
ARG NODE_VERSION=18

FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine as builder
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "yarn.lock*", "./"]

RUN yarn install --production=false --frozen-lockfile
COPY . .
ARG REACT_APP_DESCOPE_BASE_URL=""
ARG REACT_APP_CONTENT_BASE_URL=""
ARG REACT_APP_USE_ORIGIN_BASE_URL="true"
RUN yarn build

FROM --platform=$TARGETPLATFORM nginx:alpine

RUN apk add openssl && \
    openssl req -x509 -nodes -days 365 -subj "/C=CA/ST=QC/O=Company, Inc./CN=mydomain.com" -addext "subjectAltName=DNS:mydomain.com" -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt;

RUN cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen       80;
    listen       443 ssl http2 default_server;
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    server_name  localhost;

		rewrite ^/login(.*)$ $1 last;

    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        try_files \$uri \$uri/ /index.html;  # this ensures react routing works
    }
}
EOF

EXPOSE 80 443
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/build ./

ENTRYPOINT ["nginx", "-g", "daemon off;"]
