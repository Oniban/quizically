# Audit Fix Log

Each entry is delivered in a focused commit with regression coverage. Use `git log --oneline -- docs/audit-fixes.md` to locate the changes and `git show <commit>` to inspect their implementation.

## 1. Reject passwords that bcrypt would truncate

- **Finding:** passwords differing after byte 72 authenticated as the same password.
- **Change:** registration, login, model writes, and browser forms enforce a 72-byte UTF-8 maximum. Password values must be strings at the API boundary.
- **Regression coverage:** 72-byte ASCII and multibyte passwords authenticate; longer suffixes fail; direct model writes reject overlong inputs; both browser forms explain the byte limit before making a request.
- **Compatibility:** existing compliant hashes are unchanged. An old hash does not retain the original password length, so overlong legacy credentials require an operator-assisted reset; they are no longer accepted or silently shortened. Password recovery remains separate work.

## 2. Enforce account lockout under concurrent requests

- **Finding:** five simultaneous failed logins could leave the account unlocked because each request used a stale failure count.
- **Change:** a MongoDB update pipeline increments the current count and sets the lock atomically. Active locks are preserved, expired locks restart counting, and a successful password check cannot clear a lock acquired during verification. Error messages use the saved count.
- **Regression coverage:** five concurrent HTTP failures lock the account; correct passwords are rejected while locked; stale model instances cannot reset or extend the lock; expiry and successful-login reset behave correctly.
- **Test isolation:** each API test now gets a fresh app/rate-limit store while retaining the isolated database and its indexes.

## 3. Recover expired sessions without discarding in-memory work

- **Finding:** quiz requests displayed a session-expired error, but stale client state redirected the user away from Login.
- **Change:** quiz API `401` responses mark the session expired. Protected content is hidden and inert while an inline login form allows reauthentication. Same-account login restores the mounted page; a different account remounts it. Failed actions require an explicit retry.
- **Race handling:** requests carry a session generation, so delayed failures from an old session cannot invalidate a newer login. Network errors and non-authentication HTTP errors do not expire the session.
- **Regression coverage:** real client service calls with a test HTTP adapter exercise expiry, inline login, draft preservation, account switching, non-authentication errors, and delayed old-session failures.
- **Scope:** retained work is only in memory on the current page. Reloading or navigating away still discards it; no browser-storage or server-side draft persistence was added.

## 4. Accept valid email addresses consistently

- **Finding:** the User model's older regex rejected valid addresses accepted by the API, including plus-addressing and long top-level domains.
- **Change:** HTTP validation, Google email claims, and the User model use one `validator.isEmail` helper. `validator` is an explicit server dependency. API email values must be strings.
- **Regression coverage:** registration and login succeed for long TLDs, plus-addressing, and hyphenated domains; malformed addresses fail at both API and model boundaries; the Google account lifecycle test uses a plus-address with a long TLD.
- **Compatibility:** no stored addresses are rewritten. Existing local provider-specific email normalization, lowercasing, and the prohibition on automatic Google account linking are preserved.

## 5. Deduplicate publication at the database/API boundary

- **Finding:** retrying a publish request after a lost response created another immutable quiz.
- **Change:** `POST /api/quizzes` requires a UUID `Idempotency-Key`. A unique author/key index and normalized-content hash return the original quiz for identical retries, or a `409` with the original quiz ID for changed content. Startup waits for the index.
- **Regression coverage:** concurrent retries save one quiz and one question set; replay and normalization are stable; changed content conflicts; different authors can use the same key; invalid requests do not reserve keys; legacy keyless quizzes remain valid.
- **Compatibility:** API consumers must send the header. The partial index needs no legacy backfill. A separate editor commit wires retry-key reuse into the browser flow.
- **Write failures:** duplicate losers clean up their own unused questions. Uncertain database outcomes retain questions so a possibly committed quiz stays playable; process-interruption orphan cleanup is not a transaction guarantee.

## 6. Reuse publication IDs in the editor

- **Change:** the editor generates one UUID on its first valid publication and sends it through the quiz service as `Idempotency-Key`. Retries and edits retain that ID. A content conflict keeps the draft visible and links to the quiz that already exists.
- **Regression coverage:** identical retries reuse both payload and key; edits after a lost response retain the key and display the conflict link; a new editor gets a different key; a real Axios test adapter verifies the header on each request.
- **Scope:** operation IDs last for the mounted editor, including same-account inline reauthentication. Reloading or navigating away starts a new operation and does not recover an unsaved draft.

## Verification Snapshot

The complete series through `90f6a8d` was verified with Node **22.23.3**:

| Commit | Change |
| --- | --- |
| `d5cb897` | Password UTF-8 byte limit |
| `716af9d` | Atomic account lockout |
| `7782086` | Inline expired-session recovery |
| `46a6644` | Shared email syntax validation |
| `353b7dc` | Database/API publication idempotency |
| `90f6a8d` | Editor publication-key reuse |

| Check | Result at this revision |
| --- | --- |
| `npm test --prefix server` | 103 passed, including 25 isolated HTTP/MongoDB integration tests |
| `npm test --prefix client` | 48 passed across 10 files |
| `npm run build --prefix client` | Passed |
| `git diff --check 0d502ec..90f6a8d` | Passed |

The npm commands were run under the supported runtime using `npm exec --yes --package=node@22 -c '<command>'`. Tests used temporary MongoDB and mocked client transport/provider boundaries, not the configured application database or real Google sign-in. Browser-level and deployed-host smoke tests remain future work.
