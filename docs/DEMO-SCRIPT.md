# Human-narrated demo: approximately 3 minutes

Record your screen at 1080p or at least 720p with your own voice. Do not use AI narration, music-only explanation, a phone camera, or accelerated footage. Trim waiting periods only. Aim for 2:45–3:15. ETHOnline accepts only 2–4 minutes.

## Before recording

1. Open https://maqam.ajnasnb.com and test the proof viewer.
2. Read the architecture and inspect the actual transaction in the explorer. Be ready to explain each field and limitation.
3. For a live wallet walkthrough, use only Arc Testnet. Obtain faucet USDC, connect your wallet, and use the published executor. Test with 1 USDC or less. Use a recipient you control, or the clearly labeled valueless test recipient in the sample.
4. Run tamper checks before executing, then replay after execution. If your wallet is a different address from the executor, reconnect and import the exported signed packet.
5. Record any issues you find in HUMAN-CONTRIBUTIONS.md; ask for corrections before recording the final demo.

## 0:00–0:25 — The problem

“AI agents can propose useful transactions. The difficult part is making sure they execute only what we authorized. Maqam Protocol takes the exact approval boundary from my existing Maqam library and makes it independently enforceable onchain.”

Show the opening screen and the new repository's continuity disclosure.

## 0:25–0:55 — Agent proposal

Click Inspect agent proposal. Show the real recorded model response and its policy decision.

“This synthetic invoice became a structured proposal for one USDC. The agent receives no owner key and no signing tool. Maqam checks the payment before it reaches a person. This panel is a recorded real model call, and its prompt and output are public.”

## 0:55–1:40 — Exact authority

For a live wallet recording, review and sign your own test payment. Otherwise open the recorded packet and accurately describe the scripted test.

“The signature binds the owner, executor, recipient, token, amount, expiry, nonce and evidence hash. The EIP-712 domain binds the chain and contract. Token allowance is separate and limited to the payment. The contract can execute only this exact authorization.”

## 1:40–2:20 — Adversarial demonstration

Show recipient and amount rejection, successful execution, then replay rejection. Clearly distinguish eth_call rejection checks from mined execution. If using the proof viewer, say these rejection results are recorded.

“Changing the recipient invalidates the signature. Doubling the amount does too. The correct payment succeeds. The same approval cannot pay twice—even if the agent bypasses our application and calls the contract directly.”

## 2:20–2:50 — Arc receipt and continuity

Click Verify testnet payment and the transaction link.

“This is real Arc Testnet USDC settlement, with a separate executor account and a receipt independently checked against the chain. Arc lets both payment and gas use USDC. The existing Maqam package is disclosed. These contracts, wallet flow, adversarial tests and Arc integration are the new event work.”

## 2:50–3:10 — Scope

“An approval should be a precise capability, not unrestricted wallet access. This prototype proves that the executed payment matches its authorization. It does not prove the invoice is genuine, and it is not audited for mainnet. Next we would add audited adapters and production-grade identity and durable operations.”

## Likely judge questions

- Why blockchain? Application logs and policy can be bypassed; the transfer boundary verifies the signature and nonce independently.
- Does EIP-712 prevent replay? No. The contract implements owner-scoped used nonces, domain separation and revocation epochs.
- What does the AI decide? It produces a structured proposal. It cannot authorize itself.
- How is this different from a normal wallet signature? The owner authorizes a specific executor to submit one exact payment, with explicit expiry and evidence linkage; Maqam provides a reusable offchain policy adapter and the contract independently enforces the authorization.
- What existed before? Maqam 0.3.3. See the provenance section in the README.
- Who wrote the code? Codex assisted the implementation; describe your own real contributions accurately.
