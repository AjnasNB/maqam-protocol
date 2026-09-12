# Arc continuity prize draft

Target: Arc — Best DeFi or Agentic Application, Continuity. Only claim this integration. The advertised $3,000 includes a $2,000 mainnet milestone component; this prototype does not promise or perform a mainnet deployment.

## Integration description

Maqam Protocol is an agent payment authorization system that settles real test USDC on Arc. An agent proposes an invoice payment. The owner authorizes exact EIP-712 terms, and a separately funded executor calls MaqamExecutor. Arc enforces the signature, owner nonce, expiry and revocation epoch, then transfers the native USDC token through its ERC20 interface. Changing the recipient or amount is rejected, and replay is rejected even when bypassing the application gateway.

Arc is the execution and evidence layer, not a decorative wallet connection: the working proof transferred 1 test USDC using its ERC20 contract at 0x3600000000000000000000000000000000000000. The executor also pays gas in USDC. Our code treats ERC20 payment amounts as six decimals and native gas amounts as eighteen decimals without double-counting the shared balance.

The frontend supports review, exact allowance approval, typed signing, packet handoff, execution, revocation and adversarial checks. A Vercel function invokes Maqam's policy gateway. A wallet-free receipt viewer verifies the mined event and consumed nonce against Arc's live RPC. The recorded real model proposal is explicitly labeled, with its synthetic prompt and output preserved.

## Evidence

- App: https://maqam-protocol.vercel.app
- Repository: https://github.com/AjnasNB/maqam-protocol
- Fully verified contract: https://testnet.arcscan.app/address/0x8267D3D996e4884BBc7E88307a46A957AC95ea2b?tab=contract
- Payment: https://testnet.arcscan.app/tx/0x29df2d8d76cc95eca476461b45de397d4ca0cc565640edf8d86f80b609d4826e
- Architecture: docs/ARCHITECTURE.md and public/architecture.svg
- Integration feedback: FEEDBACK.md
- Automated validation: 15 passing tests and 7 recorded Arc proof checks.
- Human-narrated demo video: pending; do not claim completed.

## Continuity and AI assistance

The existing MIT Maqam 0.3.3 library supplies offchain policy and exact approval semantics. The onchain executor, wallet interface, Arc integration, server endpoint, adversarial tests, real model adapter and independently verified receipts were built during ETHOnline. Codex assisted implementation, research, tests and documentation. The repository explicitly distinguishes automated fixture signing from human testing. Human hands-on testing and narration must be recorded before final submission.
