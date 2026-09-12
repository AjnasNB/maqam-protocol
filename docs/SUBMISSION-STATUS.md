# ETHOnline submission status

Updated September 12, 2026. **Not finally submitted.**

## Current update

- The project track was changed and saved as **Building from Scratch**, with the public-library exception documented in BUILD-PROVENANCE.md. The participant profile was also changed to Building from Scratch after the Dashboard became available; the mismatch warning disappeared. The Dashboard now shows both Arc and The Graph and the updated tagline.
- Arc and The Graph are both selected and their integration answers saved. Graph live data, screening, recorded model analysis and evidence commitments are implemented. See GRAPH-INTEGRATION.md.
- 32 automated tests pass, including ten DOM/EVM integration tests. GitHub CI passed for `dab6fe1` (run 34705068739). Wallet state, packet import and Graph filter handling were hardened. See VERIFICATION-2026-09-12.md for evidence and limits.
- Public Worker version: `c04cb99f-08f4-4f6e-8312-3aaf492e17eb`. The primary hostname is the submission target; Graph credentials are configured there, not in the optional Vercel mirror.
- A real silent Chrome demo was exported in Clipchamp: **02:48, 1080p, 38.10 MB**, `Maqam-ETHOnline-2026-Silent-Demo.mp4`. The corrected take shows Maqam; setup and browser toolbar were removed. Download location was not confirmed. Human narration and upload remain pending.

## Earlier completed work (history)

- Public GitHub repository with incremental event commits.
- Solidity executor fully verified on Arc; separate scripted owner and executor; mined test USDC settlement and replay/tamper evidence.
- Sixteen automated tests, including the Cloudflare endpoint; GitHub CI passed for implementation revision `92d8d55`.
- Primary Cloudflare app: https://ethonline.ajnasnb.com. Alias: https://maqam.ajnasnb.com. Same-code Vercel mirror also deployed.
- Public policy API tested against its HTTPS endpoint using public DNS; evidence in `evidence/live-api.json`.
- Desktop interface and live-chain receipt verifier tested locally and on the public `ethonline.ajnasnb.com` deployment in Chrome. Public proof verified the real receipt at block 61706316; see `evidence/live-receipt.png`. An injected-wallet walkthrough by the participant is pending. Mobile layout has not been independently verified.
- ETHGlobal project draft created as Maqam Protocol; Continuity Track chosen; repository attached and full project details saved.
- Logo, 16:9 architecture cover, and three screenshots uploaded and saved in ETHGlobal.
- Tech stack and explicit AI-assistance disclosure saved. Top 10 Finalist & Partner Prizes selected; Arc selected with integration explanation, source line, ease-of-use rating 8/10 and tested feedback. Optional future-outreach field left blank.
- Project descriptions preserved in `submission-fields.json`; Arc integration answer in `PRIZE-SUBMISSION.md`; narration guide in `DEMO-SCRIPT.md`.
- ETHGlobal's final page says the repository passed all automated checks. Its only listed missing form item is the demo video. See `evidence/submission-checklist.txt`.

## Required before final submission

1. Participant personally tests the app and records actual findings in `HUMAN-CONTRIBUTIONS.md`. Automated fixture signing is not a human test.
2. Add the participant's own narration to the exported screen demo and upload the finished 2–4 minute video at 720p or better. No AI voice, speed-up, phone recording or music-only demo. Follow `NARRATION.txt` and describe recorded evidence honestly.
3. The participant and project tracks now both match Building from Scratch. Review the final declaration with the public-library exception and prior dependency disclosure. The checkbox remains unchecked pending the complete entry.
4. Review the complete entry and submit before **September 13, 2026, 16:00 UTC / 21:30 IST**. Verify a final submitted confirmation. Finalist selection also requires participation in live judging.

## Connectivity note

Vercel's default domains timed out from the development connection, so the app was deployed on unused personal Cloudflare subdomains. Public DNS and HTTPS API checks passed. The first hostname, `maqam.ajnasnb.com`, encountered a cached local NXDOMAIN after creation. The event-specific alias `ethonline.ajnasnb.com` loads successfully in the user's Chrome and is the saved submission URL. The same interface runs at http://127.0.0.1:5186 for local testing. No system DNS configuration was changed.

No real ETH or mainnet transaction was used. No prize or finalist outcome is guaranteed.
