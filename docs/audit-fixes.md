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
