# ETHOnline submission status

Updated September 12, 2026. **Not finally submitted.**

## Completed

- Public GitHub repository with incremental event commits.
- Solidity executor fully verified on Arc; separate scripted owner and executor; mined test USDC settlement and replay/tamper evidence.
- Sixteen automated tests, including the Cloudflare endpoint; GitHub CI configured.
- Primary Cloudflare app: https://maqam.ajnasnb.com. Same-code Vercel mirror also deployed.
- Public policy API tested against its HTTPS endpoint using public DNS; evidence in `evidence/live-api.json`.
- Desktop interface and live-chain receipt verifier tested locally. An injected-wallet walkthrough by the participant is pending. Mobile layout has not been independently verified.
- ETHGlobal project draft created as Maqam Protocol; Continuity Track chosen.
- Logo, 16:9 architecture cover, and three screenshots uploaded and saved in ETHGlobal.
- Project descriptions preserved in `submission-fields.json`; Arc integration answer in `PRIZE-SUBMISSION.md`; narration guide in `DEMO-SCRIPT.md`.

## Required before final submission

1. Complete GitHub's **Confirm access** re-authentication in Chrome. ETHGlobal app access was requested for only `AjnasNB/maqam-protocol`, read-only code and metadata. The installation is waiting on the account holder's passkey, GitHub Mobile or password. Do not assume installation succeeded.
2. Return to the ETHGlobal project details. Select the repository after GitHub authorization, restore the saved text if necessary, use `https://maqam.ajnasnb.com`, and Save & Continue. Until this succeeds, the site disables tech-stack and prize submission fields.
3. Fill tech stack accurately: Solidity, JavaScript, ethers, OpenZeppelin, Vite, Maqam, Arc Testnet, Cloudflare Workers; Vercel mirror; local Azure OpenAI recorded model adapter; no database. Disclose Codex assistance. Select Top 10 Finalist & Partner Prizes if participating in live judging, and Arc as the implemented continuity partner. See the prize draft for rationale.
4. Participant personally tests the app and records actual findings in `HUMAN-CONTRIBUTIONS.md`. Automated fixture signing is not a human test.
5. Record and upload a 2–4 minute screen demo with the participant's own narration at 720p or better. No AI voice, speed-up, phone recording or music-only demo. Follow `DEMO-SCRIPT.md` and describe recorded evidence honestly.
6. Complete remaining required questions, review the complete entry, and submit before **September 13, 2026, 16:00 UTC / 21:30 IST**. Verify a final submitted confirmation.

## Connectivity note

Vercel's default domains timed out from the development connection, so the primary app was deployed on an unused personal Cloudflare subdomain. Public DNS and HTTPS API checks passed. The local default DNS resolver still returned cached NXDOMAIN immediately after creation. Use the primary public URL once propagation reaches the connection; the same interface runs at http://127.0.0.1:5186 for local testing. No system DNS configuration was changed.

No real ETH or mainnet transaction was used. No prize or finalist outcome is guaranteed.
