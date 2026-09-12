# ETHOnline implementation specification

## User brief

Build and submit a working ETHOnline 2026 project, considering existing Maqam/Fikeya work. Create a dedicated GitHub repository and incremental, truthful commits. Use only testnets; no real ETH. Optimize for the event criteria without promising an award.

## Product

Maqam Protocol makes a person's exact approval enforceable outside an agent and outside the application server. The initial workflow is a test-token payment. The person can revoke an unused authorization; a failed token transfer must not consume it. The agent never obtains the owner's key.

## Contract requirements

- EIP-712 domain binds chain ID and verifying contract.
- Signed fields: owner, executor, token, recipient, amount, nonce, deadline, evidenceHash.
- Owner-scoped nonces, consumed before an external token transfer; transaction rollback restores the nonce when a transfer fails.
- Explicit owner cancellation and bulk epoch invalidation to revoke signed pending requests.
- OpenZeppelin signature validation and safe token operations; reject zero addresses, zero amount, expired requests and wrong executors.
- Event includes digest, parties, token, amount, nonce and evidence commitment.
- Contract holds no user deposits; exact ERC20 allowance is managed separately by the owner.

## Interface

Create proposal -> inspect exact details -> wallet approval/signature -> execute -> inspect receipt. Dedicated attack lab tries a changed recipient, a changed amount and replay against the same signed request. Never display a simulation as a mined transaction. Network allowlist rejects mainnet writes. Distinguish browser wallet owner from relayer executor.

## Verification

Deploy compiled contracts on a local EVM and exercise real transactions: successful payment, recipient and amount tampering, replay, expiry, cancellation, epoch invalidation, wrong executor, wrong chain/contract signature, insufficient allowance, rollback, and reentrancy. Run an end-to-end public testnet transaction before claiming deployment. Preserve transaction hashes and source verification evidence.

## Sponsor selection

Choose at most three partners only after demonstrating qualifying integration. Evaluate Arc stablecoin settlement, Privy wallet controls and World AgentKit against onboarding and meaningful use requirements. Do not select tracks based solely on imported packages. Arc's advertised continuity award includes a conditional mainnet portion; this task does not authorize mainnet deployment.

## Event requirements verified September 12

Source: https://ethglobal.com/events/ethonline2026/info/details

Deadline: September 13, 2026, 16:00 UTC / 21:30 IST. Required demo: 2–4 minutes, at least 720p, human narration, no AI voiceover. AI assistance must be disclosed; meaningful team contribution is required. Preserve prompts/specs and incremental version history. Document pre-existing work and use the appropriate continuity track.

Judging: technicality, originality, practicality, usability and memorable demonstration. Human testing, product feedback, and narration remain user/team deliverables and must be recorded truthfully.
