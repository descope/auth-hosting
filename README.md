![github-header-image (2) (1)](https://github.com/descope/.github/assets/32936811/d904d37e-e3fa-4331-9f10-2880bb708f64)

# Descope Open ID Connect Hosting App

This is a React web application that runs Descope's login flows according to the project created in your [Descope](https://app.descope.com) account.  

Descope allows you to integrate with your existing Identity Provider (IdP) via OpenID Connect (OIDC) or with any deployed OIDC client.  
With this implementation, you can seamlessly add Descope authentication to your application utilizing any OIDC provider.  
For more info see [OIDC in Descope](#oidc-in-descope)


### Deployment

By default, the app is deployed to the Descope hosting page in [https://auth.descope.io](https://auth.descope.io).  
The main purpose is to allow easy integration for descopers implementing OpenID Connect with Descope.

In case you want to have your own hosted OIDC page (customize styling or your own domain), you can use this repository as a template, do the relevant modification and host it (using Vercel, etc.)

  
---

### Running locally

- `yarn install`
- `yarn start`
- Go to `http://localhost:3000/<PROJECT_ID>`

URL explained: `http://localhost:3000/<PROJECT_ID>?flow=sign-in&debug=true`
- `<PROJECT_ID>` as part of the URL path is required to use the desired Descope's `PROJECT_ID` 
- `flow` query parameter is optional. If none provided the default flow is `sign-up-or-in`
- `debug` query parameter is optional. If debug mode is needed use `debug=true`

---

#### OIDC in Descope

You can refer to either the [main documentation](https://docs.descope.com/customize/auth/oidc) on how to set it up, or you can review a few of the tutorials published that showcase how to use Descope with many major existing identity providers:
- [Auth0](https://docs.descope.com/knowledgebase/sso/auth0oidc)
- [Cognito](https://docs.descope.com/knowledgebase/sso/cognitooidc)
- [Firebase](https://www.descope.com/blog/post/passkeys-firebase-oidc)
