# The Graph: agent discovery and payment evidence

The Graph supplies the live blockchain data for the agent-selection workflow. `/api/agents` queries the official Agent0 ERC-8004 Subgraph on Base Sepolia, screens the latest 50 registrations and returns an explainable REVIEW or HOLD decision. The UI shows the indexed block, retrieval time and decision reasons. There is no static fallback. The deterministic screening engine is separate from the model: `scripts/graph-agent-propose.mjs` queries fresh Graph data, supplies eligible candidates to a real model and validates the selected ID. Its recorded prompt, output and entire input snapshot are preserved in `public/evidence/graph-agent-analysis.json`.

## What the data changes

- Missing/inactive registration, missing agent wallet, or no requested keyword match prevents selection.
- A configurable minimum distinct non-owner reviewer count can hold an otherwise matching candidate. Duplicate reviewer addresses do not increase the count. Feedback is sampled from 20 recent non-revoked entries; it is not a Sybil-resistant reputation score.
- No fresh Graph response means no agent recommendation. Indexing errors or an index more than 15 minutes behind cause a closed failure.
- For a selected agent, payment review queries Graph again. A wallet or eligibility change stops review. The exact snapshot hash and agent ID enter the note committed by the EIP-712 evidence hash. Exported packets include the snapshot; imports validate it against that commitment and recipient.
- A person must independently establish the invoice, recipient and Arc payment agreement. A registry entry on Base Sepolia is not evidence of a service on Arc. The app never calls advertised external endpoints or substitutes the NFT owner for the payment wallet.

This makes The Graph essential to discovery, screening and the model's candidate recommendation. Arc remains the settlement backend. The separate manual-payment flow remains usable without discovery; it does not claim Graph backing.

## Configuration and reproduction

Set `GRAPH_API_KEY` server-side from your Graph Studio account. For local work put it in ignored `.env.local`; on Cloudflare use `wrangler secret put GRAPH_API_KEY`. Never use a `VITE_` variable. The optional `GRAPH_SEPOLIA_API_KEY` allows an independently configured Ethereum Sepolia query; that deployment failed the freshness check during our test and is not offered in the UI.

The initial live verification and demo use the public read-only gateway access distributed as defaults by the official Agent0 SDK. This is shared demo access, not a key created in the participant's Graph Studio account. A dedicated key is preferable for quota ownership. The gateway credential is held server-side, is not committed, and is not included in evidence. The app does not attempt alternate providers on an authorization failure.

Run `npm test`, `npm run dev`, then open **Find an agent**, search `treasury` and compare minimum reviewers 0 and 5. The observed candidate passed exploratory screening and was held by the stricter policy. Live registrations can change; inspect current evidence rather than expecting a fixed result. Use **Inspect model reasoning from Graph evidence** for the clearly marked recorded model analysis.

For a fresh model analysis, configure `AGENT_API_URL`, `AGENT_MODEL`, `AGENT_API_KEY`, and `GRAPH_API_KEY`, then run `node scripts/graph-agent-propose.mjs`. The local Azure option is only for the previously configured development account.

## Evidence and limits

Live query verified on September 12, 2026: Base Sepolia block 46719673; 50 registrations scanned; one candidate matched `treasury` with the exploratory threshold; real model analysis selected `84532:9201` for human review. This third-party test agent was not hired or paid. Its description is untrusted registry data, not our work or our claim.

The existing mined Arc payment is a separate protocol fixture with controlled owner, executor and recipient accounts. Do not describe it as payment to the Graph-discovered agent. Graph snapshot commitment is covered by automated tests; a participant's fresh Graph-selected wallet payment remains a separate manual verification step. The contract enforces the signed commitment, not registry freshness or truth by itself.

Sources: [The Graph Agent0 documentation](https://thegraph.com/docs/en/subgraphs/existing-subgraphs/agent0/), [Agent0 SDK configuration](https://github.com/agent0lab/agent0-ts/blob/main/src/core/contracts.ts), [Agent0 schema](https://github.com/agent0lab/subgraph/blob/main/schema.graphql).
