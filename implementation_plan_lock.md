# App Lock UI Implementation & Rebranding

## Goal
Ensure the App Lock UI is fully branded as "Mmtm" and functions correctly with WebAuthn (Passkeys).

## Proposed Changes

### `src/utils/webauthn.js`

1.  **Update RP Name**:
    - Change `rp.name` from "My Diary" to "Mmtm" in `registerPasskey`.

### Verification Step
1.  **Manual Verification**:
    - Log in to the app.
    - Go to Settings -> Security.
    - Setup PIN (if not set).
    - Register Passkey ("간편 로그인 등록").
    - Enable Screen Lock ("화면 잠금 사용").
    - Switch tabs and wait (or manually trigger lock by reloading if testing grace period) -> verification is hard due to grace period.
    - Refresh page -> `SessionContext` resets state, so it should lock immediately if session is cleared? No, `currentUserId` might persist in `localStorage` but `isLocked` state resets to false?
    - Wait, `SessionProvider` initializes `isLocked` to `false`. If I refresh, `currentUserId` is null (unless restored).
    - `App.jsx` likely restores session.
    - If session is restored, does it check if it should be locked? `SessionContext` logic for `requireUnlock` is event-based.
    - Ideally, on *startup* (restore), if user has PIN, it should be locked.
    - I need to check `src/App.jsx` or wherever session restoration happens (`GoogleDriveService.restoreSession` calls).

## Additional Check
- Ensure that when the app reloads, if a user was logged in, they are prompted for a PIN/Biometric if the lock is enabled.
- Currently `SessionProvider` state `isLocked` starts as `false`.
- If `App` restores user, does it set `isLocked = true` initially?
- `SessionLockModal` checks `if (!isLocked) return null`.
- If I reload, `isLocked` is false. User enters directly. **This is a security hole.**
- I should add logic in `SessionProvider` or `App` to default to `isLocked = true` if a user is restored, OR check settings on load.

## Refined Plan
1.  Update `webauthn.js`.
2.  Review/Fix Session Restoration logic to ensure Lock Screen appears on app reload/launch if enabled.
