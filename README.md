# Descope Open ID Connect Hosting App

This is a React web application that runs a flow according to the provided `project` and `flow`.
This app is deployed to the Descope hosting page in `https://oidc-descope.com`.
The main purpose is to allow easy first integration for descopers implementing OpenID Connect with Descope

## Requirements

-   A `project` query parameter is required to use the desired Descope `PROJECT_ID`
-   A `flow` query parameter is optional. If none provided the he default flow is `sign-up-or-in`
-   A `debug` query parameter is optional. If debug mode is needed use `debug=true`

## Getting Started

### Preparation

-   `yarn install`
-   `yarn start`

Go to `http://localhost:3000?project=<PROJECT_ID>&flow=sign-up-or-in&debug=true`
