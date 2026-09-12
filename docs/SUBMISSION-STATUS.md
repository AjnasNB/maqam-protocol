# ETHOnline submission status

Updated September 12, 2026. **Not finally submitted.**

## Current update

- The project track was changed and saved as **Building from Scratch**, with the public-library exception documented in BUILD-PROVENANCE.md. The participant profile still reports Continuity; changing it is blocked by a human-verification challenge on the Dashboard.
- Arc and The Graph are both selected and their integration answers saved. Graph live data, screening, recorded model analysis and evidence commitments are implemented. See GRAPH-INTEGRATION.md.
- 22 automated tests pass across the existing suite and six Graph tests. Cloudflare redirect behavior was caught by public Chrome testing and corrected. Public API checks now pass for exploratory and strict Graph screening.
- Public Worker version: `421df54d-a0f4-4a42-b6a2-b5858c0b89dc`. The primary hostname is the submission target; Graph credentials are configured there, not in the optional Vercel mirror.
- Clipchamp is open with microphone OFF, but native browser permission/capture selection is pending. **No video has been recorded.** Human narration is still required for the eventual submission.

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
2. Record and upload a 2–4 minute screen demo with the participant's own narration at 720p or better. No AI voice, speed-up, phone recording or music-only demo. Follow `DEMO-SCRIPT.md` and describe recorded evidence honestly.
3. Match the participant profile to Building from Scratch, then review the final declaration with the public-library exception and prior dependency disclosure. The checkbox remains unchecked pending the complete entry.
4. Review the complete entry and submit before **September 13, 2026, 16:00 UTC / 21:30 IST**. Verify a final submitted confirmation. Finalist selection also requires participation in live judging.

## Connectivity note

Vercel's default domains timed out from the development connection, so the app was deployed on unused personal Cloudflare subdomains. Public DNS and HTTPS API checks passed. The first hostname, `maqam.ajnasnb.com`, encountered a cached local NXDOMAIN after creation. The event-specific alias `ethonline.ajnasnb.com` loads successfully in the user's Chrome and is the saved submission URL. The same interface runs at http://127.0.0.1:5186 for local testing. No system DNS configuration was changed.

No real ETH or mainnet transaction was used. No prize or finalist outcome is guaranteed.
