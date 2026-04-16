# E2E Encryption Implementation Plan

## Goal
Implement client-side End-to-End Encryption (E2E) for Google Drive backups. Data should be encrypted before upload and decrypted after download, ensuring "Zero Knowledge" privacy.

## Proposed Changes

### 1. New Utility: `src/utils/crypto.js`
Create a new file to handle cryptographic operations using the Web Crypto API.
- **`deriveKey(password, salt)`**: Derives an AES-GCM key from the user's password using PBKDF2.
- **`encryptData(data, password)`**: Encrypts ArrayBuffer/Blob.
    - Generates a random Salt (16 bytes) and IV (12 bytes).
    - Derives key.
    - Encrypts data.
    - Returns format: `[Salt (16)][IV (12)][Ciphertext]`
- **`decryptData(encryptedData, password)`**: Decrypts data.
    - Extracts Salt and IV.
    - Derives key.
    - Decrypts and returns original ArrayBuffer.

### 2. Service Update: `src/services/cloudStorage/GoogleDriveService.js`
- Add `encryptionPassword` property to the class.
- Add `setEncryptionPassword(password)` method.
- **Modify `syncToGoogleDrive`**:
    - If `encryptionPassword` is set, call `encryptData` on the ZIP blob.
    - Update filename extension or metadata to indicate encryption (e.g., `.enc` or keep `.zip` but verify magic bytes). Let's use `.enc` or metadata property `isEncrypted: true` in `appProperties`.
- **Modify `getSyncData`**:
    - Check file metadata `appProperties.isEncrypted`.
    - If true, check if `encryptionPassword` is available.
        - If not, throw "Password Required" error (handle in UI).
        - If yes, `decryptData` the downloaded blob.

### 3. UI Update: `src/components/Settings.jsx` & `src/contexts/SyncContext`?
- Add "Data Encryption" section in `Settings.jsx`.
- Toggle: "Enable Encryption".
- Input: "Encryption Password" (separate from Login PIN).
- Save preference locally `enableEncryption`.
- When enabling, prompt for password and save it to `GoogleDriveService` memory (not persistent storage for max security, or sessionStorage).
- *UX Decision*: Since `GoogleDriveService` is a singleton, we can keep the password in memory. But on reload it is lost.
- **Session Restoration**: When app loads, if `enableEncryption` is true, we must ask user for the password before Sync can happen.
- **Simplification for MVP**:
    - Use `sessionStorage` to store the Sync Password temporarily? Or just ask user once per session.
    - Add `encryptionPassword` state to `Settings`.

## Verification Plan

### Automated/Manual Tests
1.  **Encryption Flow**:
    - Enable encryption in Settings with password "test1234".
    - Trigger "Backup Now".
    - Inspect Network tab: Check the upload payload. It should be opaque binary, not a valid PKZip (first bytes shouldn't be `PK`).
2.  **Decryption Flow**:
    - Clear local data (or use Incognito).
    - Login with Google.
    - Configure Encryption Password "test1234".
    - Trigger "Restore".
    - Verify data looks correct.
3.  **Wrong Password Test**:
    - Try to restore with "wrongpass".
    - Should fail with a clear error message.

## User Review Required
- **UX**: Where to prompt for the password on fresh install?
    - If the user restores from a fresh device, the app doesn't know if the backup is encrypted until it checks the file metadata.
    - `GoogleDriveService` should detect `isEncrypted` file and throw a specific error code.
    - UI (`BackupPanel` or `SyncProvider`) should catch this and show a "Enter Sync Password" modal.
- **Current Scope**: I will implement the *infrastructure* and the *Settings UI*. Handling the "Fresh Restore Prompt" might need a new Modal component.
