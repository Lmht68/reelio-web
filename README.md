# Reelio Web

Reelio Web is a Vite single-page application.
Its browser requests use relative `/api/` paths so the development server and production Nginx image can select the backend independently.

## Local development

Install the locked dependency set:

```sh
npm ci
```

Start the Vite development server:

```sh
npm run dev
```

Vite proxies relative `/api/` requests to `http://127.0.0.1:8181` during development.
Start the backend API on that address before exercising frontend API flows.

Create the production browser bundle with:

```sh
npm run build
```

## Production image

The production image builds the Vite bundle in a Node build stage and serves only the static bundle plus Nginx at runtime.
`BACKEND_UPSTREAM` is a Docker-reachable `host:port` value, not a URL.
Nginx adds the `http://` scheme when proxying `/api/` requests.

Build and run the image directly against the backend's Docker network:

```sh
docker build --tag reelio-frontend:local .
docker network inspect reelio_default
docker run --detach \
  --name reelio-frontend \
  --restart unless-stopped \
  --network reelio_default \
  --publish 4174:80 \
  reelio-frontend:local
```

The image defaults `BACKEND_UPSTREAM` to `api:8181`.
For a backend reachable through a different Docker alias, set the value when starting the container:

```sh
docker run --detach \
  --name reelio-frontend \
  --restart unless-stopped \
  --network custom-backend \
  --publish 4174:80 \
  --env BACKEND_UPSTREAM=custom-api:8181 \
  reelio-frontend:local
```

Check host and container health:

```sh
curl --fail http://127.0.0.1:4174/healthz
docker inspect --format '{{.State.Health.Status}}' reelio-frontend
docker exec reelio-frontend wget -qO- http://127.0.0.1/healthz
```

Remove a direct-run container with `docker rm --force reelio-frontend`.

## Compose deployment

Start the backend first.
The backend Compose project is named `reelio`, so its default Docker network is `reelio_default` and its API service is reachable on that network as `api:8181`.
Confirm that the network exists before starting the frontend:

```sh
cd ../backend
docker compose up -d --wait

docker network inspect reelio_default
```

Return to this repository and create the non-secret deployment configuration:

```sh
cd ../frontend
cp .env.example .env
```

`.env.example` documents every supported override:

```dotenv
REELIO_FRONTEND_IMAGE_TAG=local
REELIO_FRONTEND_HOST_PORT=4174
REELIO_BACKEND_UPSTREAM=api:8181
REELIO_BACKEND_NETWORK=reelio_default
```

`REELIO_FRONTEND_IMAGE_TAG` selects the local image tag.
`REELIO_FRONTEND_HOST_PORT` publishes Nginx's port 80 on the host.
`REELIO_BACKEND_UPSTREAM` selects the backend alias and container port.
`REELIO_BACKEND_NETWORK` selects the externally managed Docker network shared with the backend.
Do not put provider credentials or `VITE_` secrets in this frontend configuration.

Validate configuration, then build and start the frontend:

```sh
docker compose config --quiet
docker compose up --build --detach --wait
```

Check the published and in-container health endpoints:

```sh
curl --fail http://127.0.0.1:4174/healthz
docker compose exec frontend wget -qO- http://127.0.0.1/healthz
```

Validate real proxying through the frontend without invoking external providers:

```sh
curl --include \
  --request POST http://127.0.0.1:4174/api/extractions \
  --header 'Content-Type: application/json' \
  --data '{}'
```

The response must be the backend's JSON validation error status and body, never `index.html`.

### Separately managed backend

A separately managed backend needs a shared bridge network and an `api` network alias.
For an existing backend container, create the bridge network and attach the container with that alias:

```sh
docker network create custom-backend
docker network connect --alias api custom-backend <backend-container>
```

Set `REELIO_BACKEND_NETWORK=custom-backend` before starting the frontend.
Leave `REELIO_BACKEND_UPSTREAM=api:8181` unchanged unless the backend uses a different alias or container port.

## Updating and rollback

Build each release under a new image tag, then replace only the frontend service:

```sh
REELIO_FRONTEND_IMAGE_TAG=2026-10-25.1 docker compose build frontend
REELIO_FRONTEND_IMAGE_TAG=2026-10-25.1 docker compose up --detach --no-deps --wait frontend
```

Keep the prior tag available for rollback.
A rollback does not rebuild the image:

```sh
REELIO_FRONTEND_IMAGE_TAG=<previous-tag> docker compose up --detach --no-deps --no-build --wait frontend
```

Normal frontend shutdown removes only the frontend Compose project resources.
It must not remove the external backend network or backend services:

```sh
docker compose down
```

## Production smoke test

Run the deterministic image-level smoke test after Docker changes:

```sh
npm run smoke:production
```

The harness builds the production image once, verifies the default and runtime-overridden backend upstreams, waits for Docker health, checks SPA fallback and cache headers, preserves proxied request and error details, confirms the 65-second upstream response, and removes only its uniquely named test resources.
