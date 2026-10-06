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

5. `bg` query parameter is optional. If you wish to use a different background color or URL, you can use this parameter.
   - **Color name**: You can use a [web color](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value), e.g. `bg=red`, `bg=%23ff0000`. Note that some symbols such as `#` will have to be URL encoded.
   - **Image URL**: You can specify a URL to an image such as `https://example.com/background.png`. This image will be sized to cover the screen.

6. `wide` query parameter is optional. If wide mode is nedded use `wide=true`. This will widen the flow component that is rendered, which is used for large forms made with Flow screens.

7. `theme` query parameter is optional. The default value is `light`, but otherwise it will override the theme for your flows rendered with the SDK.

8. `style` query parameter is optional. The default style in your project will be used if not defined, but this allows you to override the `style` for the flows rendered with the SDK.

9. `store_last_auth_user` query parameter is optional. Pass this parameter to ensure the last authenticated user is not saved when the flow ends. For example, append `store_last_auth_user=false` to the URL to disable saving the last user.

10. Additional query parameters prefixed with `client.` are passed to the `Descope` component as its `client` prop. For example: `client.k1=v1&client.k2=v2` becomes `{ k1: 'v1', k2: 'v2' }`.

11. `width` & `height` are optional query parameters, controlling the sizing of the flow screen in either pixels or a percentage of the viewport (e.g. `50%`, `1200px`). Any value larger than the screen is clamped down.

12. `title` query parameter is optional. If provided, it sets the browser tab/document title (e.g. `title=Sign%20in`).

**Agent sign-in with CIBA (POC)**

`/login/agent/<PROJECT_ID>?agent=<AGENT_NAME>&returnTo=<PATH>` lets a known AI agent sign in to a customer account through CIBA:

1. The page shows which agent is asking and collects the customer's email.
2. The `api/agent-ciba` Vercel function calls `bc-authorize` with that agent's inbound app credentials. The email is trimmed and lower-cased and sent as `login_hint`. Descope emails the customer an approval link.
3. The page polls the function at the interval Descope returns. On approval it auto-submits a `POST` form with `token` (the access token) and `returnTo` to the project's `callbackUrl`. `returnTo` must be a relative path without whitespace or backslashes, anything else becomes `/`.

Where it runs: the function needs a Vercel deployment. The Docker image serves static files only and cannot run `api/`. Deploy the POC as its own Vercel project and point the shop's redirect (or the customer's CNAME) at that project's domain. Never add `AGENT_CIBA_CONFIG` to a shared production deployment, since it holds per-customer inbound app secrets. Without `AGENT_CIBA_CONFIG` the function answers `500 misconfigured`.

Server-side environment variables (never exposed to the browser):

- `DESCOPE_BASE_URL`: Descope API base URL, default `https://api.descope.com`. The shop must require the access token `iss` to equal `https://<DESCOPE_BASE_URL host>/v1/apps/<PROJECT_ID>` exactly (`https://<host>/v1/apps/agentic/<PROJECT_ID>/<MCP_SERVER_ID>` if the inbound app is linked to an MCP server). A host-only check accepts tokens from any project on the shared host. The shop also checks `exp` and maps `azp` to a known agent client.
- `AGENT_CIBA_CONFIG`: JSON keyed by project ID. `callbackUrl` must be `https` (`http` is allowed for localhost only). `scope` is optional.

```json
{
	"<PROJECT_ID>": {
		"callbackUrl": "https://shop.example.com/agent/callback",
		"agents": {
			"grok": {
				"clientId": "<INBOUND_APP_CLIENT_ID>",
				"clientSecret": "<INBOUND_APP_CLIENT_SECRET>",
				"scope": "email"
			}
		}
	}
}
```

The page calls `/login/api/agent-ciba` on its own origin only. The function sends no CORS headers.

To run the POC project locally with the function:

- `vercel link` (to the separate POC project, never the shared production one)
- `vercel env add AGENT_CIBA_CONFIG development` (and `DESCOPE_BASE_URL` if needed)
- `vercel pull`
- `vercel dev`
- Go to `http://localhost:3000/login/agent/<PROJECT_ID>?agent=grok&returnTo=/cart`

POC limitations: the function does not authenticate or rate limit its caller. Anyone can start an approval email to any address as a configured agent, and anyone holding an `auth_req_id` can collect the token once it is approved. The `agent` value comes from the URL, and no `binding_message` is sent. The callback carries no `state` tied to the shop session that started the redirect, so any page can auto-POST a token for the attacker's own account to `callbackUrl` and sign the victim's browser in to that account (login CSRF). The fix is a shop-issued `state` that is also set as a SameSite cookie and required back on the callback. `bc-authorize` sends the approval email before it responds and the function gives up after 5 seconds, so a slow send shows an error even though the email went out, and a retry sends a second one. A single failed poll ends the wait and the customer has to start over.

**Agent approval service (POC)**

When a shop detects an AI agent trying an action that needs the customer's approval (for example checkout), it redirects the agent to `/approve/<PROJECT_ID>`. The `api/agent-approval` function (routed by the rewrites in `vercel.json`) asks for the customer's email, starts CIBA, waits for the customer to approve the emailed request, and hands the access token back to the shop. Server-rendered HTML and form posts only, no SPA.

- `GET /approve/<PROJECT_ID>?client_id=<APP_CLIENT_ID>&ref=<REF>&summary=<TEXT>&return_to=<SHOP_CALLBACK_URL>`: shows "`<app name>` wants to: `<summary>`" and an email field.
- `POST /approve/<PROJECT_ID>`: calls `bc-authorize` with the binding message `<summary>. Approve only if you asked for this. Code: <4 digits>` (printable ASCII, URLs removed, at most 256 characters), keeps the pending request in an HttpOnly `agent_approval` cookie scoped to `/approve/<PROJECT_ID>`, and redirects to `/wait`.
- `GET /approve/<PROJECT_ID>/wait`: polls the CIBA token endpoint once per load and reloads at the interval Descope returns, showing the same code as the email. On approval it auto-submits a `POST` with `token` and `ref` to `return_to`, with a visible "Continue" button as fallback. A denial, an expiry or any other token endpoint answer clears the pending cookie; a 5xx or an unreachable endpoint shows a retryable error and keeps it.

Everything is configured in Descope, and every request is checked before an app secret is read: the project ID must be in `AGENT_APPROVAL_MANAGEMENT_KEYS` (else 404), `client_id` must belong to an app with CIBA enabled whose `cibaSettings.loginPageURL` (written by the console Agent Login section) points at this host, and `return_to` must be one of the app's approved callback URLs. The scope sent is the app's permission scopes plus its scope claim mapping scopes.

Server-side environment variables:

- `DESCOPE_BASE_URL`: Descope API base URL, default `https://api.descope.com`.
- `AGENT_APPROVAL_MANAGEMENT_KEYS`: JSON `{ "<PROJECT_ID>": "<MANAGEMENT_KEY>" }`. The key is used for two calls only: loading the project's apps (`POST /v2/mgmt/thirdparty/apps/load`, cached 60 seconds) and reading an app's client secret (`GET /v1/mgmt/thirdparty/app/secret`, cached 5 minutes). It never writes an app.

The handler uses only `req.method`, `req.url`, `req.headers`, `req.body`, `res.statusCode`, `res.setHeader` and `res.end`, and imports nothing local, so a plain Node `http` server can host it for local runs (read the urlencoded body into `req.body` as a string). The deployment notes for `api/agent-ciba` above apply here too.

A failed Descope call logs its method, path (without the query), HTTP status, `errorCode` and OAuth `error` fields with `console.error`, and a thrown failure logs the error name and cause code. Bodies, keys, secrets, tokens and the login ID are never logged.

Known limits:

- An approval is not bound to a specific `ref`. An agent holding two pending refs can spend the approval of a cheap basket on the expensive one. The shop's single-use token and ref checks stop replay and cross-agent use, not this. Closing it needs RAR (`authorization_details`) or a signed action request.
- The summary passes through the agent's browser, so the agent can change the text the customer sees. The shop must place only the basket it stored for the `ref`.
- A project-wide management key sits in a public-facing function. This is the production blocker, and it stays one per-customer env var until registered apps can authenticate with `private_key_jwt`.
- The function does not authenticate or rate limit its caller, so anyone who reaches the page can send approval emails to any address as a configured agent. The pending cookie is not signed; its client ID and return URL are checked again on every poll.
- `bc-authorize` sends the email before it responds, so a call that times out after 10 seconds can show an error even though the email went out.

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
