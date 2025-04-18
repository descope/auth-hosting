![github-header-image](https://github.com/descope/.github/assets/32936811/d904d37e-e3fa-4331-9f10-2880bb708f64)

# Descope Authentication Hosting App

This is a React web application that runs Descope's login flows according to the project created in your [Descope](https://app.descope.com) account.

### Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdescope%2Fauth-hosting&env=DESCOPE_PROJECT_ID&demo-title=Descope%20Hosted%20Auth%20Page&demo-description=https%3A%2F%2Fgithub.com%2Fdescope%2Fauth-hosting%2F%23readme&demo-url=https%3A%2F%2Fapi.descope.com%2Flogin)

By default, the app is deployed to the Descope hosting page in [https://api.descope.com/login](https://api.descope.com/login).  
The main purpose is to allow easy integration for descopers implementing authentication with Descope (such as OIDC [use case](#open-id-connect-oidc-use-cases-in-descope)).

In case you want to have your own hosted page (customize styling, your own domain, etc.), you can use this repository as a template, do the relevant modification and host it (using Vercel, etc.)

---

#### Open ID Connect (OIDC) use cases in Descope

Descope allows you to integrate with your existing Identity Provider (IdP) via OpenID Connect (OIDC) or with any deployed OIDC client.  
With this implementation, you can seamlessly add Descope authentication to your application utilizing any OIDC provider.

You can refer to either the [main documentation](https://docs.descope.com/customize/auth/oidc) on how to set it up, or you can review a few of the tutorials published that showcase how to use Descope with many major existing identity providers:

- [Auth0](https://docs.descope.com/knowledgebase/sso/auth0oidc)
- [Cognito](https://docs.descope.com/knowledgebase/sso/cognitooidc)
- [Firebase](https://www.descope.com/blog/post/passkeys-firebase-oidc)
- [Salesforce](https://www.descope.com/blog/post/sso-auth-salesforce)

---

### Running locally

- `yarn install`
- `yarn start`
- Go to `http://localhost:3000/<PROJECT_ID>`

**Using URL params**

- Descope's deployment: `https://auth.descope.io/<PROJECT_ID>`
- Locally: `http://localhost:3000/<PROJECT_ID>?flow=sign-in&debug=true`

These are the different query parameters you can use:

1. `<PROJECT_ID>` as part of the URL path is required to use the desired Descope's `PROJECT_ID`

2. `flow` query parameter is optional. If none provided the default flow is `sign-up-or-in`

3. `tenant` query parameter is optional. You can input a **Tenant ID** or **Tenant Domain** to use with this query parameter (e.g. `tenant=descope.com` or `tenant=T2UjlUN1tJsRnrV3jnAkJ3WziaEq`).

> If present, then you will be able to authenticate via SSO, without having to first specify an email with an input screen in your flow.

4. `debug`query parameter is optional. If debug mode is needed use`debug=true`

5. `bg` query parameter is optional. If you wish to use a different background color, you can use this parameter. (ex. `bg=black` or `bg=gray`)

6. `wide` query parameter is optional. If wide mode is nedded use `wide=true`. This will widen the flow component that is rendered, which is used for large forms made with Flow screens.

7. `theme` query parameter is optional. The default value is `light`, but otherwise it will override the theme for your flows rendered with the SDK.

8. `style` query parameter is optional. The default style in your project will be used if not defined, but this allows you to override the `style` for the flows rendered with the SDK.

**Using .env**

In case you don't want to provide the project ID as part of the URL, you can specify it as an environment variable `DESCOPE_PROJECT_ID`.  
You can use `.env` file for that.  
From the project root directory run: `cp .env.example .env`, and set your Descope Project and flow IDs.

**Using docker**

In case you want to use the docker version these are the steps:

1. Build (Official hosted docker image is comming soon)

```(bash)
# Optional build-args: (ex - using custom API host or pinning the project id)
docker build
	--build-arg REACT_APP_DESCOPE_BASE_URL="https://api.descope.com"
	--build-arg REACT_APP_CONTENT_BASE_URL="https://static.descope.com/pages"
	--build-arg REACT_APP_USE_ORIGIN_BASE_URL="false"
	--build-arg REACT_APP_FAVICON_URL="https://imgs.descope.com/auth-hosting/favicon.svg"
	--build-arg DESCOPE_PROJECT_ID=""
	--build-arg DESCOPE_FLOW_ID=""
	--tag my-registry.com/descope/auth-hosting
	--push
	.
```

2. Run

```(bash)
docker run -p 8080:8080 auth-hosting
# (optional) the build-args are available also during run-time as env vars:
docker run -p 8080:8080
	-e REACT_APP_DESCOPE_BASE_URL="https://api.descope.com"
	-e REACT_APP_CONTENT_BASE_URL="https://static.descope.com/pages"
	-e REACT_APP_USE_ORIGIN_BASE_URL="false"
	-e REACT_APP_FAVICON_URL="https://imgs.descope.com/auth-hosting/favicon.svg"
	-e DESCOPE_PROJECT_ID=""
	-e DESCOPE_FLOW_ID=""
	my-registry.com/descope/auth-hosting
```
