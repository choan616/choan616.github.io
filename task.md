# Phase 2: Security & Encryption (E2E)

## Objective
Implement End-to-End Encryption for Google Drive backups to ensure data sovereignty and privacy.

## Checklist
- [x] **E2E Encryption Support**
    - [x] Design Encryption/Decryption Utility (`src/utils/crypto.js`) using Web Crypto API (AES-GCM).
    - [x] Create UI for setting/entering "Sync Password" (if different from login PIN, or derived from it).
        - *Decision*: Will use a separate strong password or robust key derivation from the user's master password/PIN? The plan suggests "Separate Sync Password".
    - [x] Integrate encryption into `GoogleDriveService.uploadFile`.
    - [x] Integrate decryption into `GoogleDriveService.downloadFile`.
    - [ ] Handle "Initial Sync" scenario (detecting encrypted vs unencrypted files).
- [ ] **Verification**
    - [ ] Test backup (verify file on Drive is scrambled).
    - [ ] Test restore (verify data is readable in app).
- [x] **Design System Upgrade**
    - [x] **Global Theme (`index.css`)**: Implement new variable suite (Glassmorphism, Gradients, Typography).
    - [x] **Core Components**: Update Buttons, Cards (`Layout.css`, `App.css`) for premium feel.
    - [x] **Animations**: Add entrance animations and micro-interactions.
    - [x] **Verification**: Visual check of Light/Dark modes and responsiveness.
- [ ] **Settings UX** (Postponed for next sub-phase)
