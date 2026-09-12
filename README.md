# Maqam Protocol

Exact, single-use authorization for agent payments. ETHOnline 2026 continuity project.

An agent proposes a payment. A person reviews and signs its exact terms. A smart contract verifies the signature and executes that payment once. Changing the recipient, amount, chain, contract, executor, evidence commitment, or expiry invalidates the authorization. Replay and revoked authorizations fail.

This repository is being developed during ETHOnline, beginning September 12, 2026. It is a testnet prototype, not audited financial infrastructure.

## Provenance

The earlier [Maqam](https://github.com/AjnasNB/maqam) TypeScript library implements application-side policy, exact approvals, and receipts. This project's new contribution is contract-enforced authorization, typed wallet signing, a payment interface, adversarial demonstrations, and independently inspectable chain receipts. We will identify every reused dependency and every completed integration; no prior project code is represented as new event work.

See [the implementation specification](docs/SPEC.md) and [AI assistance disclosure](docs/AI-ASSISTANCE.md).
