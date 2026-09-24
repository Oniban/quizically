# Audit Fix Log

Each entry is delivered in a focused commit with regression coverage. Use `git log --oneline -- docs/audit-fixes.md` to locate the changes and `git show <commit>` to inspect their implementation.

## 1. Reject passwords that bcrypt would truncate

- **Finding:** passwords differing after byte 72 authenticated as the same password.
- **Change:** registration, login, model writes, and browser forms enforce a 72-byte UTF-8 maximum. Password values must be strings at the API boundary.
- **Regression coverage:** 72-byte ASCII and multibyte passwords authenticate; longer suffixes fail; direct model writes reject overlong inputs; both browser forms explain the byte limit before making a request.
- **Compatibility:** existing compliant hashes are unchanged. An old hash does not retain the original password length, so overlong legacy credentials require an operator-assisted reset; they are no longer accepted or silently shortened. Password recovery remains separate work.
