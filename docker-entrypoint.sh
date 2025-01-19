#!/bin/sh

IGNORED_ENV_VARS='PATH\|HOSTNAME\|HOME\|PWD\|SHLVL\|TERM'

# Create env.js with environment variables
cat <<EOF >/usr/share/nginx/html/env.js
window.env = {
$(env | grep -v $IGNORED_ENV_VARS | awk -F= '{printf "  \"%s\": \"%s\",\n", $1, $2}' | sed '$ s/,$//')
}
EOF

echo "Starting NGINX"
nginx -g "daemon off;"
