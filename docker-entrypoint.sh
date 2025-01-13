#!/bin/sh

replace_env() {
  local env_name=$1
  local env_value=$2

  # Use find to locate all .js files and sed to perform the replacement
  local files=$(find ${HTML_DIR:-./build} -type f -name "*.js")
  echo "Replacing $env_name with $env_value"
  for file in $files; do
    # Using '|' as delimiter instead of '/' to handle URLs better
    sed -i "s|${env_name}:\"[^\"]*\"|${env_name}:\"${env_value}\"|g" "$file"
  done
}

for env_var in $(env | grep -v 'PATH\|HOSTNAME\|HOME\|PWD\|SHLVL\|TERM'); do
  var_name=$(echo $env_var | cut -d= -f1)
  var_value=$(echo $env_var | cut -d= -f2)
  replace_env "$var_name" "$var_value"
done

echo "Starting NGINX"
nginx -g "daemon off;"
