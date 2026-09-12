# Test and record the real Chrome demo

Open https://ethonline.ajnasnb.com in Chrome. A real silent 02:48 Chrome demo has been exported in Clipchamp; human narration and upload are pending. This guide uses real screen capture, not generated animation, a screenshot slideshow, or synthetic narration.

## What is already verified

Thirty-two automated tests pass; current CI status is tracked separately. A separate scripted executor settled a real Arc Testnet USDC payment. The deployed contract is fully source-verified. The public receipt viewer has verified the mined event and consumed nonce against Arc RPC. These checks do not replace your own wallet walkthrough or prove that every wallet/browser combination works.

## Your hands-on test (about 10–15 minutes)

Use only a test wallet on **Arc Testnet, chain 5042002**. Obtain test USDC from https://faucet.circle.com if needed. Use a recipient address you control for your own payment; leave the executor blank to use the connected wallet for the first walkthrough. Retain a little test USDC for gas as well as the payment.

| Test | Action | Expected result |
|---|---|---|
| Public proof | Click **Verify testnet payment** without a wallet. | Receipt shows **VERIFIED AGAINST LIVE CHAIN**, 1 USDC, and a transaction link. |
| Agent proposal | Click **Inspect agent proposal**, then **Use this sample proposal**. | A clearly labeled recorded model response loads a 1 USDC proposal. This sample recipient is a scripted test account, not your address. |
| Wallet connection | Click **Connect testnet wallet** and approve Arc Testnet in your wallet. | Connected owner is your address. Inspect the wallet network before approving anything. |
| Your proposal | Replace the sample recipient with your own second address. Enter **0.10** USDC and a short test memo, then **Review exact payment**. | Review shows exactly your recipient, amount, token, executor, chain, expiry, nonce and evidence commitment. No signature or allowance is requested merely by reviewing. |
| Changed inputs | Edit the amount after reviewing. | Previous review is invalidated; a fresh review is required. Restore 0.10 and review again. |
| Exact authorization | Click **Approve allowance & sign**. Inspect each wallet request. | Allowance is limited to 0.10 USDC (100000 ERC20 units), followed by a typed signature for the same terms. An existing allowance may first be reset to zero. |
| Tampering BEFORE execution | Click **Change the recipient**, then **Double the amount**. | Both show signature-mismatch rejection. They are eth_call simulations and spend no gas. A network error or WrongExecutor is not a passing tamper test. |
| Correct payment | Click **Execute signed payment** and confirm the testnet transaction. | Receipt confirms the transaction. Explorer shows the correct recipient receiving 0.10 USDC. If both roles use one wallet, say so in the demo. |
| Replay AFTER execution | Click **Use it a second time**. | Nonce-already-consumed rejection; no second payment. |
| Revocation | Create and sign a fresh small proposal, then click **Revoke this approval** before executing it. | Revocation is confirmed; Execute is disabled. Token allowance is separate from signature revocation. |
| Invalid amount | Enter 0 or 26 USDC and review. | No signing request; zero is invalid and 26 exceeds the application policy's 25-token limit. |
| Cancel a wallet prompt | Review a fresh proposal and reject the signing prompt in the wallet. | App displays the cancellation/error and does not claim that it signed or executed. |

Only mark tests passed after you observe them. Record the date, wallet/browser, observed transaction hash, confusing labels and any error in `HUMAN-CONTRIBUTIONS.md`. If something fails, send the exact error text and which step caused it. Never send a private key, recovery phrase or account password.

Optional deeper check: export a signed packet with a different authorized executor, connect that executor wallet, import the packet and execute. The pre-recorded Arc proof already uses separate owner/executor accounts; your first manual walkthrough does not have to.

## Clean recording: app tab + your microphone

1. Open https://app.clipchamp.com in **Chrome**. Create a new video and choose **Record & create → Screen** (labels may say screen and camera; turn the camera off if not wanted).
2. Select your microphone. Record a short test first, play it back, and confirm your voice is audible.
3. In Chrome's capture picker choose **Chrome Tab → Maqam Protocol**. Do **not** choose Entire Screen or the whole Chrome window. Tab capture records page content; the browser toolbar, debugging banner, Codex window and other tabs are outside that capture surface. Confirm this in the short test recording before the final take.
4. Use the app as it is. Keep the required AI-assistance disclosure in the submission and repository. A clean product recording must not be presented as evidence that no AI assisted development.
5. Tab capture does not include wallet extension popups or a newly opened explorer tab. For the simplest recording, personally test the wallet flow beforehand and demonstrate the recorded proof clearly as recorded evidence. If demonstrating a fresh wallet flow, narrate the real confirmation and show the resulting app receipt; do not pretend invisible wallet UI was captured.
6. Speak naturally using `DEMO-SCRIPT.md`. Aim for 2:45–3:15 at normal speed. No music or AI voice. Do not speed up footage.
7. Stop recording, preview the whole video, and export **MP4 at 1080p** (minimum 720p). Check that exported text remains readable and audio is present; export resolution alone does not repair a low-resolution capture.
8. Upload the actual MP4/MOV in ETHGlobal's Video section or provide its local path for upload. The project now uses Building from Scratch with the public-library exception documented in BUILD-PROVENANCE.md. The earlier library is not claimed as new work; the participant track must match.

The browser capture picker and microphone permission require your interaction. Recording has not started simply because the Clipchamp editor is open. If you want an assisted demonstration, tell me when the recording is started and you are ready to narrate; I can operate the app tab while you speak.

Reference: https://support.microsoft.com/en-us/clipchamp/how-to-make-a-screen-recording

## Track and sponsor choices

Building from Scratch. Arc targets Best DeFi/Onchain Finance Application; The Graph targets Best AI Tooling or AI Use Case (From Scratch). See BUILD-PROVENANCE.md and GRAPH-INTEGRATION.md for the factual basis. Hedera is not integrated or claimed.

## Graph checks added

Search treasury at reviewer threshold zero, then five. Inspect the live block/time and the changed decision. Inspect the recorded model reasoning separately. Do not confirm an invoice agreement you have not established. A fresh Graph-selected wallet payment has not been manually verified.

For the current combined recording use NARRATION.txt; the older DEMO-SCRIPT.md also retains a wallet-flow alternative. Capture silent footage if preferred, then add your own narration in Clipchamp. No AI voice is accepted by the event.
