# syntax=docker/dockerfile:1
ARG NODE_VERSION=18

FROM node:${NODE_VERSION}-alpine as builder
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "yarn.lock*", "./"]

RUN yarn install --production=false
COPY . .
ARG REACT_APP_DESCOPE_BASE_URL=""
ARG REACT_APP_CONTENT_BASE_URL=""
ARG REACT_APP_USE_ORIGIN_BASE_URL="true"
RUN yarn build

FROM nginx:alpine

RUN apk add openssl && \
    openssl req -x509 -nodes -days 365 -subj "/C=CA/ST=QC/O=Company, Inc./CN=mydomain.com" -addext "subjectAltName=DNS:mydomain.com" -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt;

		RUN printf "server {\n\
    listen       80;\n\
    listen       443 ssl http2 default_server;\n\
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;\n\
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;\n\
    server_name  localhost;\n\n\
    rewrite ^/login/(.*)$ /\$1 last;\n\n\
    location / {\n\
        root   /usr/share/nginx/html;\n\
        index  index.html;\n\
        try_files \$uri \$uri/ /index.html;  # this ensures react routing works\n\
    }\n\
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80 443
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/build ./

ENTRYPOINT ["nginx", "-g", "daemon off;"]
