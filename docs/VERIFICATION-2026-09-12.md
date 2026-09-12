# Verification — September 12, 2026

Implementation: `66fcfb3`; Linux lockfile correction: `dab6fe1`.
Live app: https://ethonline.ajnasnb.com
Cloudflare version: `c04cb99f-08f4-4f6e-8312-3aaf492e17eb`.

## Results

- **32/32 automated tests passed**, none skipped. Production build passed.
- Clean Linux CI passed: https://github.com/AjnasNB/maqam-protocol/actions/runs/34705068739
- Post-deployment HTTPS checks passed for normal policy approval, over-budget rejection, mainnet rejection, unsupported methods, live Graph discovery and stricter reviewer screening. Evidence: `evidence/live-api.json` and `evidence/live-graph-api.json`.
- Chrome verified treasury discovery: one qualifying candidate at threshold zero, zero at threshold five. Editing filters immediately cleared stale results.
- Chrome's public proof viewer verified the existing Arc payment at block **61706316**, including the signed digest and consumed nonce. This was not a new payment.
- Chrome loaded the recorded model proposal with amount 1.0 and the disclosed test-fixture recipient.
- A 390 × 844 viewport check showed the hero, discovery and sample/payment form without horizontal overflow. This is a responsive layout check, not a physical mobile-wallet test.
- No browser console errors were returned during the checked live flows.

## Additional integration tests

`test/app.test.mjs` loads the actual HTML and application handlers into jsdom and runs real contracts on an ephemeral Ganache EVM. Its EIP-1193 adapter signs with generated local accounts, not the participant's wallet. The local EVM uses a testnet chain ID to exercise the network gate; it does not submit public transactions.

Ten additional tests cover review without authorization; exact allowance and typed signing; tamper rejection, settlement and replay; input invalidation; zero/over-budget rejection; rejected signature and retry; nonce and bulk epoch revocation; account changes during pending review; separate-executor export/import; malformed, tampered and already-used packets; Graph filter changes and stale query responses; pending input changes; deployment and faucet-token minting.

The existing 22 tests cover contract authority, cross-domain replay, expiry, zero values, owner-scoped cancellation, transfer rollback, ERC-1271, reentrancy, runtime bytecode verification, proposal policy and Graph/Worker failure handling.

## Fixes

- Account/network changes clear the connected label and authorization state. Wallet checks read the currently exposed account rather than relying only on a cached signer.
- Pending operations make the main interface inert; stale review/signature results are rejected if inputs or wallet change.
- Packet imports check evidence, amount policy, executor bytecode, token decimals and onchain signature/nonce/epoch validity before enabling execution.
- Deployment invalidates an existing review.
- Graph filter edits clear selections/results; old responses cannot overwrite newer screening conditions.
- npm removed an optional marker on Ganache's macOS-only `fsevents` dependency. Restoring it fixed clean Linux installation, verified by CI.

## Limits

The participant confirmed MetaMask prompts while Codex operated the public Chrome app. A real 0.10 test-USDC self-payment settled on Arc at block 61761093, transaction `0x916fa842aafebf1caf3b0aee628601755f16acf9223c509bd0b975a7fb52d678`. Recipient/amount tampering and replay were blocked in eth_call simulations. Read-only RPC verification checked the receipt, event roles, amount and consumed nonce; see `evidence/participant-wallet-test.json` and `scripts/verify-wallet-test.mjs`. This used the same owner, executor and recipient. The earlier 1-USDC fixture remains the separate-executor proof.

A second 0.01-USDC authorization was prepared for cancellation testing, but allowance confirmation is pending; public-wallet cancellation is not claimed complete. Automated cancellation tests pass. Human narration remains outstanding. The discovered third-party agent was not hired or paid. External Graph/RPC/wallet availability can fail independently. Only the primary Cloudflare deployment is the verified submission target; the optional Vercel mirror was not updated during this pass. This is not a guarantee of flawless behavior or a professional security audit.

The dependency audit reports **35 findings** in development tooling: Ganache and its bundled packages, plus the pinned Solidity compiler's `tmp` dependency. No finding listed a package outside those tool chains. These tools are not imported into the frontend or Worker runtime. The compiler remains pinned to preserve correspondence with the already-verified deployed bytecode. The repository does not have a clean dependency audit; use these tools locally with trusted inputs pending a separately verified toolchain upgrade. Full output: `evidence/dependency-audit.json`.

The silent real Chrome recording was exported in Clipchamp as `Maqam-ETHOnline-2026-Silent-Demo.mp4`, 02:48, 1080p, 38.10 MB. The failed first take and setup segment were removed and browser toolbar cropped out. Download location was not confirmed. Human narration and final submission are not claimed complete.
