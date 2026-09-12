// Deterministic vector artwork, matching the implemented interface.
import fs from "node:fs";
fs.writeFileSync(
  "public/logo.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="72" fill="#10271e"/><path d="M116 368V144h56l84 112 84-112h56v224h-56V238l-84 110-84-110v130z" fill="#d8eea9"/></svg>`,
);
fs.writeFileSync(
  "public/architecture.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#f6f7f2"/>
<g font-family="Arial, sans-serif" fill="#10271e">
<text x="64" y="80" font-size="18" letter-spacing="3">MAQAM PROTOCOL / ETHONLINE 2026</text>
<text x="64" y="163" font-size="56" font-weight="bold">Your intent. Enforced.</text>
<text x="64" y="208" font-size="23">Exact, single-use authority for agent payments on Arc.</text>
<path d="M298 372H362M578 372H642M858 372H922" stroke="#719b63" stroke-width="3"/>
<g stroke="#c5cfc0" fill="#ffffff"><rect x="64" y="286" width="234" height="176" rx="12"/><rect x="362" y="286" width="216" height="176" rx="12"/><rect x="642" y="286" width="216" height="176" rx="12"/><rect x="922" y="286" width="294" height="176" rx="12" fill="#10271e"/></g>
<g font-size="16" fill="#66805d"><text x="88" y="322">01 / PROPOSE</text><text x="386" y="322">02 / REVIEW</text><text x="666" y="322">03 / SIGN</text></g>
<g font-size="26" font-weight="bold"><text x="88" y="370">Agent + Maqam</text><text x="386" y="370">Exact terms</text><text x="666" y="370">Owner wallet</text></g>
<g font-size="17"><text x="88" y="409">Policy, no signing key</text><text x="386" y="409">Recipient · amount</text><text x="666" y="409">EIP-712 capability</text></g>
<g fill="#d8eea9"><text x="946" y="322" font-size="16">04 / ENFORCE ON ARC</text><text x="946" y="370" font-size="26" font-weight="bold">MaqamExecutor</text><text x="946" y="409" font-size="17">One transfer. Consumed nonce.</text></g>
<text x="64" y="538" font-size="24" font-weight="bold">Change the recipient? Rejected. Double the amount? Rejected.</text>
<text x="64" y="578" font-size="24" font-weight="bold">Execute correctly? Settled in USDC. Replay? Rejected.</text>
<path d="M64 624H1216" stroke="#c5cfc0"/>
<text x="64" y="666" font-size="16">Continuity build · Real Arc testnet settlement · Open source · AI assistance disclosed</text>
<text x="1080" y="666" font-size="16">TESTNET ONLY</text>
</g></svg>`,
);
