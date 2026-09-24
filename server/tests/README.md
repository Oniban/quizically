# Server Tests

From `server/`, run both suites using the Node.js built-in runner:

```sh
node --test tests/*.test.js
```

Plain `node --test` from `server/` also discovers the suites. From the repository root, use `node --test server/tests/*.test.js`.

The integration suite requires the installed `mongodb-memory-server` devDependency. It downloads a MongoDB binary on first use, starts an isolated local MongoDB and an HTTP server on an ephemeral port, initializes real indexes, and cleans both up afterward. Each test clears only that isolated database, preserving indexes, and creates a fresh Express app so rate-limit buckets cannot leak between tests. API requests use native `fetch` and real authentication cookies, with no mocked controllers, services, or database calls.

The tests import `createApp()` directly, never `server.js`, never load `.env`, and never use a configured database URI. A test-only JWT secret and `NODE_ENV=test` are set before importing the app. One sequential test temporarily sets `NODE_ENV=production` to inspect login/logout cookie headers, then restores it. MongoDB is the only service needed; no Google credentials or external application services are used.

If the MongoDB download fails because a proxy omits `Content-Length`, retry with:

```sh
MONGOMS_DOWNLOAD_IGNORE_MISSING_HEADER=true node --test tests/*.test.js
```

If downloads are unavailable, point `MONGOMS_SYSTEM_BINARY` at an already installed compatible `mongod`. This still starts a fresh isolated instance, not an existing database. Startup failures fail the suite rather than silently skipping integration coverage.

The pure validation, scoring, and UTC streak tests can run without MongoDB or network access:

```sh
node --test tests/quizRules.test.js
```
