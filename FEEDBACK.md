# Arc integration feedback

Tested September 12, 2026, on Arc Testnet, chain ID 5042002.

- Circle faucet successfully delivered 20 test USDC to a fresh test account without requiring a mainnet balance.
- Ethers 6 deployed the EIP-712 executor and submitted the USDC approve/transferFrom flow through the public RPC.
- A separate executor account received native test USDC for gas. This cleanly demonstrated owner/executor separation without requiring a second currency.
- The 18-decimal native USDC interface and 6-decimal ERC20 interface are an integration hazard. The contract-address and connection documentation explicitly explain the shared balance and decimals. Our app uses ERC20 units for payments and native units only for gas funding.
- Exact custom-error decoding worked for InvalidSignature and NonceUnavailable in eth_call. Those checks are clearly labeled simulations rather than failed mined transactions.
- Explorer source verification completed successfully with Solidity 0.8.36. The browser remained in a loading state after success; the documented Blockscout API confirmed full verification, no partial match and no changed bytecode. The compiler list did not yet include 0.8.37, so we pinned 0.8.36 and retained the earlier deployment's provenance. See `scripts/verify-arc.mjs` and `public/evidence/source-verification.json`.

This feedback describes real tested behavior. No unimplemented Circle wallet, App Kit, Agent Stack, mainnet, or x402 integration is claimed.
# The Graph integration feedback

Base Sepolia Agent0 queries returned live registrations, explicit agent wallets and feedback in one request. The schema supports a useful discovery boundary; it also exposes why a bare registration must not be treated as trust. We count distinct non-owner reviewers and avoid averaging incompatible feedback tags.

The Ethereum Sepolia deployment failed our 15-minute freshness check during testing, so the UI offers the verified Base Sepolia source. The official SDK's public read-only gateway defaults let us validate the integration while Studio wallet sign-in was pending; a dedicated Studio key is preferable for quota ownership.

Public deployment testing caught Cloudflare's lack of `redirect: "error"` support. We changed the Graph request to manual redirects and explicitly reject non-2xx responses, retaining the boundary that prevents credentials being forwarded to another host. A regression test and HTTPS smoke checks cover this path.

Both reviewer thresholds were tested in the public Chrome app. The exploratory search returned a matching candidate; the five-reviewer threshold held it. This is an app screening decision, not an assessment that the indexed third-party agent is trustworthy or malicious.
