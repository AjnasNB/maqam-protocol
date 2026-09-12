import { matchesRuntimeBytecode } from "./bytecode.mjs";
import { initGraphView, refreshGraphSelection } from "./graph-view.mjs";
import { validateGraphEvidence } from "./graph-evidence.mjs";
import { showPublicProof, showAgentProposal } from "./proof-viewer.mjs";
import {
  BrowserProvider,
  Contract,
  ContractFactory,
  JsonRpcProvider,
  parseUnits,
  formatUnits,
  getAddress,
  isAddress,
  hexlify,
  randomBytes,
  ZeroAddress,
} from "ethers";
import {
  types,
  domain,
  digest,
  evidenceHash,
  networks,
  requireTestnet,
  assessProposal,
} from "./protocol.mjs";

const $ = (id) => document.getElementById(id);
let provider,
  signer,
  owner,
  chainId,
  packet,
  executed = false,
  busy = false,
  revision = 0;
const erc20 = [
  "function approve(address spender,uint256 amount) returns(bool)",
  "function allowance(address owner,address spender) view returns(uint256)",
  "function decimals() view returns(uint8)",
  "function balanceOf(address owner) view returns(uint256)",
  "function mint(address to,uint256 amount)",
];
const artifacts = {};
async function artifact(name) {
  if (!artifacts[name]) {
    const r = await fetch(`/artifacts/${name}.json`);
    if (!r.ok) throw new Error("Contract artifact unavailable");
    artifacts[name] = await r.json();
  }
  return artifacts[name];
}
const json = (value) =>
  JSON.stringify(
    value,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
function status(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}
function readable(error) {
  return (
    error.revert?.name ||
    error.info?.error?.message ||
    error.shortMessage ||
    error.message ||
    "Unexpected error"
  );
}
async function action(fn) {
  if (busy) return;
  busy = true;
  document.body.setAttribute("aria-busy", "true");
  document.querySelector("main").inert = true;
  try {
    await fn();
  } catch (error) {
    status(readable(error), true);
  } finally {
    busy = false;
    document.body.removeAttribute("aria-busy");
    document.querySelector("main").inert = false;
  }
}
function invalidate() {
  revision++;
  packet = undefined;
  executed = false;
  $("review-empty").hidden = false;
  $("review-details").hidden = true;
  $("sign").disabled = true;
  $("attack-result").textContent =
    "Sign a payment to unlock the attack lab. Replay is tested after execution.";
  for (const id of [
    "execute",
    "cancel",
    "export",
    "attack-recipient",
    "attack-amount",
    "attack-replay",
  ])
    $(id).disabled = true;
}
async function ensureWallet() {
  if (!signer) throw new Error("Connect a testnet wallet first.");
  const expectedSigner = signer,
    expectedOwner = owner;
  const current = Number(await provider.send("eth_chainId", []));
  requireTestnet(current);
  if (current !== Number($("network").value))
    throw new Error(
      "Switch the wallet to the selected test network by reconnecting.",
    );
  const accounts = await provider.send("eth_accounts", []);
  if (
    signer !== expectedSigner ||
    owner !== expectedOwner ||
    !accounts[0] ||
    getAddress(accounts[0]) !== expectedOwner
  )
    throw new Error("Wallet account changed. Reconnect before continuing.");
  return current;
}
async function ensureCurrent(expected) {
  await ensureWallet();
  if (!expected || packet !== expected)
    throw new Error("Proposal changed. Review and sign a fresh proposal.");
}
function disconnect(message) {
  signer = undefined;
  owner = undefined;
  invalidate();
  $("owner").textContent = "Not connected";
  $("connect").textContent = "Connect testnet wallet ↗";
  status(message);
}
async function connect() {
  if (!window.ethereum)
    throw new Error(
      "No browser wallet detected. Open this page in your wallet-enabled Chrome profile.",
    );
  const selected = Number($("network").value);
  const n = requireTestnet(selected);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + selected.toString(16) }],
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x" + selected.toString(16),
          chainName: n.name,
          nativeCurrency: {
            name: n.currency,
            symbol: n.currency,
            decimals: 18,
          },
          rpcUrls: [n.rpc],
          blockExplorerUrls: [n.explorer],
        },
      ],
    });
  }
  provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  owner = getAddress(await signer.getAddress());
  chainId = await ensureWallet();
  $("owner").textContent = owner;
  $("connect").textContent =
    owner.slice(0, 6) + "…" + owner.slice(-4) + " · Connected";
  invalidate();
  status(`Connected to ${n.name}. Only valueless test assets are supported.`);
}
async function executorContract(address = $("contract").value.trim()) {
  const current = await ensureWallet();
  if (!isAddress(address))
    throw new Error(
      "Deploy a Maqam executor contract or enter its verified address in advanced settings.",
    );
  const a = await artifact("MaqamExecutor");
  const code = await provider.getCode(address);
  if (!matchesRuntimeBytecode(code, a))
    throw new Error(
      "Contract bytecode does not match the published Maqam executor. Refusing authorization.",
    );
  const c = new Contract(address, a.abi, signer);
  const d = await c.eip712Domain();
  if (
    d.name !== "Maqam Protocol" ||
    d.version !== "1" ||
    Number(d.chainId) !== current ||
    getAddress(d.verifyingContract) !== getAddress(address)
  )
    throw new Error("Contract has an unexpected signing domain.");
  return c;
}
function saveConfig() {
  localStorage.setItem(
    `maqam:${$("network").value}`,
    json({ contract: $("contract").value, token: $("token").value }),
  );
}
async function setNetwork() {
  invalidate();
  signer = undefined;
  owner = undefined;
  $("owner").textContent = "Not connected";
  $("connect").textContent = "Connect testnet wallet ↗";
  const n = networks[$("network").value];
  $("token-label").textContent = n.token ? "USDC" : "mUSD";
  let saved = {};
  try {
    saved = JSON.parse(
      localStorage.getItem(`maqam:${$("network").value}`) || "{}",
    );
  } catch {}
  $("contract").value = saved.contract || "";
  $("token").value = n.token || saved.token || "";
  try {
    const r = await fetch("/deployments.json");
    if (r.ok) {
      const known = (await r.json())[$("network").value];
      if (known && !$("contract").value) {
        $("contract").value = known.contract;
        $("token").value = known.token;
      }
    }
  } catch {}
  status(`Selected ${n.name}. Connect your wallet to continue.`);
}
async function deploy() {
  await ensureWallet();
  invalidate();
  const n = requireTestnet(chainId);
  status("Confirm executor contract deployment in your wallet.");
  const a = await artifact("MaqamExecutor");
  const c = await new ContractFactory(a.abi, a.bytecode, signer).deploy();
  await c.waitForDeployment();
  $("contract").value = await c.getAddress();
  saveConfig();
  if (!n.token) {
    status(
      "Executor deployed. Confirm deployment of the valueless faucet token.",
    );
    const t = await artifact("TestToken");
    const token = await new ContractFactory(t.abi, t.bytecode, signer).deploy();
    await token.waitForDeployment();
    $("token").value = await token.getAddress();
  } else $("token").value = n.token;
  saveConfig();
  status(`Contracts deployed on ${n.name}. Executor: ${$("contract").value}`);
}
function addRow(dl, key, value) {
  const div = document.createElement("div"),
    dt = document.createElement("dt"),
    dd = document.createElement("dd");
  dt.textContent = key;
  dd.textContent = value;
  div.append(dt, dd);
  dl.append(div);
}
function renderPacket() {
  const a = packet.authorization;
  $("review-empty").hidden = true;
  $("review-details").hidden = false;
  $("summary-amount").textContent =
    formatUnits(a.amount, 6) +
    " " +
    (Number(packet.chainId) === 5042002 ? "USDC" : "mUSD");
  $("summary").replaceChildren();
  for (const [k, v] of Object.entries({
    Recipient: a.recipient,
    Owner: a.owner,
    Executor: a.executor,
    Network: networks[packet.chainId].name,
    Contract: packet.contract,
    Token: a.token,
    Expires: new Date(Number(a.deadline) * 1000).toLocaleString(),
    Nonce: String(a.nonce),
    Epoch: String(a.epoch),
    Evidence: a.evidenceHash,
    Purpose: packet.note || "Imported authorization",
    ...(packet.graphEvidence
      ? {
          "Graph agent": packet.graphEvidence.agentId,
          "Graph snapshot": packet.graphEvidence.snapshotHash,
        }
      : {}),
    Digest: digest(packet.chainId, packet.contract, a),
  }))
    addRow($("summary"), k, v);
  $("sign").disabled = Boolean(packet.signature);
  $("execute").disabled = !packet.signature || executed;
  $("cancel").disabled = !packet.signature || executed;
  $("export").disabled = !packet.signature;
  for (const id of ["attack-recipient", "attack-amount"])
    $(id).disabled = !packet.signature;
  $("attack-replay").disabled = !executed;
}
async function review() {
  invalidate();
  const startingRevision = revision;
  await ensureWallet();
  const c = await executorContract();
  const recipient = getAddress($("recipient").value.trim());
  const value = $("amount").value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(value))
    throw new Error("Enter a positive amount with at most six decimal places.");
  const amount = parseUnits(value, 6);
  const assessment = assessProposal({ recipient, amount: amount.toString() });
  if (!assessment.allowed) throw new Error(assessment.reason);
  const policyResponse = await fetch("/api/proposal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chainId, recipient, amount: amount.toString() }),
  });
  const policy = await policyResponse.json();
  if (!policyResponse.ok || !policy.assessment?.allowed)
    throw new Error(
      policy.error ||
        policy.assessment?.reason ||
        "Maqam proposal policy rejected the request.",
    );
  const token = getAddress($("token").value.trim());
  const t = new Contract(token, erc20, provider);
  if ((await t.decimals()) !== 6n)
    throw new Error("This prototype supports only six-decimal test tokens.");
  const executor = $("executor").value.trim()
    ? getAddress($("executor").value.trim())
    : owner;
  if (executor === ZeroAddress || recipient === ZeroAddress)
    throw new Error("Recipient and executor must not be the zero address.");
  const memo = $("note").value.trim();
  if (!memo) throw new Error("Describe what this payment is for.");
  const graphEvidence = await refreshGraphSelection(recipient);
  const note = graphEvidence
    ? `${memo}\nGraph agent: ${graphEvidence.agentId}\nGraph snapshot: ${graphEvidence.snapshotHash}`
    : memo;
  const block = await provider.getBlock("latest");
  const epoch = (await c.epochs(owner)).toString();
  await ensureWallet();
  if (revision !== startingRevision)
    throw new Error("Inputs or wallet changed. Review the proposal again.");
  packet = {
    version: 1,
    chainId,
    contract: await c.getAddress(),
    note,
    ...(graphEvidence ? { graphEvidence } : {}),
    authorization: {
      owner,
      executor,
      token,
      recipient,
      amount: amount.toString(),
      nonce: BigInt(hexlify(randomBytes(16))).toString(),
      deadline: block.timestamp + Number($("expiry").value),
      epoch,
      evidenceHash: evidenceHash(note),
    },
  };
  executed = false;
  renderPacket();
  status(
    "Review every field. No signature or token allowance has been requested yet.",
  );
}
async function sign() {
  const reviewed = packet;
  await ensureCurrent(reviewed);
  if (packet.authorization.owner !== owner)
    throw new Error("Only the payment owner may sign.");
  const a = packet.authorization;
  if (Number(a.deadline) <= Date.now() / 1000)
    throw new Error("Proposal expired. Create a fresh proposal.");
  const token = new Contract(a.token, erc20, signer);
  const balance = await token.balanceOf(owner);
  if (balance < BigInt(a.amount))
    throw new Error(
      "Insufficient test token balance. Use the Circle faucet for Arc or mint demo tokens in advanced settings.",
    );
  const allowance = await token.allowance(owner, packet.contract);
  await ensureCurrent(reviewed);
  if (allowance !== BigInt(a.amount)) {
    if (allowance > 0n) {
      status(
        "Resetting the previous token allowance to zero. Confirm in your wallet.",
      );
      await (await token.approve(packet.contract, 0)).wait();
      await ensureCurrent(reviewed);
    }
    status(
      "Approve an allowance limited to this exact payment in your wallet.",
    );
    await (await token.approve(packet.contract, a.amount)).wait();
  }
  await ensureCurrent(reviewed);
  status("Now inspect and sign the exact EIP-712 payment in your wallet.");
  const signature = await signer.signTypedData(
    domain(packet.chainId, packet.contract),
    types,
    a,
  );
  await ensureCurrent(reviewed);
  packet.signature = signature;
  renderPacket();
  status(
    "Signed. This authorization can execute once before expiry. Test tampering before executing.",
  );
}
async function execution() {
  const reviewed = packet;
  await ensureCurrent(reviewed);
  await executorContract();
  if (!packet?.signature) throw new Error("Sign a proposal first.");
  if (getAddress(packet.authorization.executor) !== owner)
    throw new Error(
      "Connect the authorized executor wallet, then import the signed packet.",
    );
  const a = await artifact("MaqamExecutor");
  const c = new Contract(packet.contract, a.abi, signer);
  await c.execute.staticCall(packet.authorization, packet.signature);
  await ensureCurrent(reviewed);
  status(
    "Simulation passed. Confirm the exact testnet execution transaction in your wallet.",
  );
  const tx = await c.execute(packet.authorization, packet.signature);
  status(`Submitted ${tx.hash}. Waiting for confirmation…`);
  const receipt = await tx.wait();
  // A confirmed transaction stays onchain if the user changes account while waiting.
  // Do not attach its result to a different or cleared authorization.
  if (packet !== reviewed) {
    status(
      `Transaction ${tx.hash} confirmed with status ${receipt.status}. Reconnect and inspect the explorer; the wallet session changed.`,
    );
    return;
  }
  if (receipt.status !== 1) throw new Error("Transaction reverted.");
  const event = receipt.logs
    .map((log) => {
      try {
        return c.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((x) => x?.name === "Executed");
  if (!event)
    throw new Error(
      "Transaction confirmed without the expected execution event. Inspect the explorer.",
    );
  executed = true;
  packet.receipt = {
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    digest: event.args.digest,
    status: receipt.status,
  };
  renderPacket();
  $("receipt").replaceChildren();
  const heading = document.createElement("p");
  heading.textContent = "Confirmed on " + networks[packet.chainId].name;
  $("receipt").append(heading);
  const link = document.createElement("a");
  link.href = networks[packet.chainId].explorer + "/tx/" + tx.hash;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Inspect transaction ↗";
  $("receipt").append(link);
  const dl = document.createElement("dl");
  for (const [k, v] of Object.entries(packet.receipt)) addRow(dl, k, String(v));
  $("receipt").append(dl);
  status("Payment confirmed. Now try replaying the same authorization.");
}
async function attack(kind) {
  await ensureWallet();
  if (!packet?.signature) throw new Error("Sign a payment first.");
  if (kind !== "replay" && executed)
    throw new Error(
      "This nonce is already used. Sign a fresh proposal to isolate tampering rejection before execution.",
    );
  const a = { ...packet.authorization };
  if (kind === "recipient")
    a.recipient =
      a.recipient.toLowerCase() === "0x000000000000000000000000000000000000dead"
        ? "0x000000000000000000000000000000000000bEEF"
        : "0x000000000000000000000000000000000000dEaD";
  if (kind === "amount") a.amount = (BigInt(a.amount) * 2n).toString();
  const c = new Contract(
    packet.contract,
    (await artifact("MaqamExecutor")).abi,
    signer,
  );
  try {
    await c.execute.staticCall(a, packet.signature);
    $("attack-result").textContent =
      "Simulation accepted. " +
      (kind === "replay"
        ? "Execute the original payment first, then test replay."
        : "Unexpected result; do not execute.");
  } catch (error) {
    const expected =
      kind === "replay" ? "NonceUnavailable" : "InvalidSignature";
    const name = error.revert?.name;
    const text =
      name === expected
        ? `BLOCKED — ${kind === "replay" ? "Nonce already consumed. The same approval cannot pay twice." : "Signature does not match the changed payment."}`
        : `Simulation failed: ${readable(error)}. This is not proof of the expected ${expected} rejection.`;
    $("attack-result").textContent =
      text + " [eth_call simulation · no gas spent]";
  }
}
async function cancel() {
  const reviewed = packet;
  await ensureCurrent(reviewed);
  if (!packet) throw new Error("No proposal to revoke.");
  if (getAddress(packet.authorization.owner) !== owner)
    throw new Error("Only the owner can revoke this approval.");
  const c = new Contract(
    packet.contract,
    (await artifact("MaqamExecutor")).abi,
    signer,
  );
  await (await c.cancel(packet.authorization.nonce)).wait();
  $("execute").disabled = true;
  $("cancel").disabled = true;
  status(
    "Approval revoked onchain. The token allowance is separate; revoke it in your wallet if no longer needed.",
  );
}
function download() {
  if (!packet?.signature) return;
  const blob = new Blob([json(packet)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "maqam-signed-authorization.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importPacket(file) {
  await ensureWallet();
  if (!file) return;
  invalidate();
  const startingRevision = revision;
  if (file.size > 2100000) throw new Error("Packet exceeds 2.1 MB.");
  const p = JSON.parse(await file.text());
  if (
    p.version !== 1 ||
    Number(p.chainId) !== chainId ||
    !p.signature ||
    !p.authorization
  )
    throw new Error("Invalid packet or wrong test network.");
  requireTestnet(p.chainId);
  if (!isAddress(p.contract) || !isAddress(p.authorization.token))
    throw new Error("Invalid contract or token address.");
  digest(p.chainId, p.contract, p.authorization);
  if (
    typeof p.note !== "string" ||
    !p.note.trim() ||
    evidenceHash(p.note) !== p.authorization.evidenceHash
  )
    throw new Error("Evidence text does not match signed commitment.");
  validateGraphEvidence(p);
  const assessment = assessProposal(p.authorization);
  if (!assessment.allowed) throw new Error(assessment.reason);
  const c = await executorContract(p.contract);
  const t = new Contract(p.authorization.token, erc20, provider);
  if ((await t.decimals()) !== 6n)
    throw new Error("This prototype supports only six-decimal test tokens.");
  await c
    .connect(provider)
    .validate(p.authorization, p.signature, { from: p.authorization.executor });
  await ensureWallet();
  if (revision !== startingRevision)
    throw new Error("Inputs or wallet changed. Import the packet again.");
  packet = p;
  executed = false;
  $("contract").value = p.contract;
  $("token").value = p.authorization.token;
  renderPacket();
  status("Packet imported. Inspect its complete terms before execution.");
}
$("connect").onclick = () => action(connect);
$("network").onchange = () => action(setNetwork);
$("deploy").onclick = () => action(deploy);
$("proposal-form").onsubmit = (e) => {
  e.preventDefault();
  action(review);
};
$("sign").onclick = () => action(sign);
$("execute").onclick = () => action(execution);
$("cancel").onclick = () => action(cancel);
$("export").onclick = download;
for (const kind of ["recipient", "amount", "replay"])
  $("attack-" + kind).onclick = () => action(() => attack(kind));
$("mint").onclick = () =>
  action(async () => {
    await ensureWallet();
    if (chainId === 5042002)
      throw new Error(
        "Arc uses Circle faucet USDC. Visit faucet.circle.com and select Arc Testnet.",
      );
    const t = new Contract($("token").value, erc20, signer);
    await (await t.mint(owner, parseUnits("25", 6))).wait();
    status("25 valueless mUSD minted to your wallet.");
  });
$("revoke-all").onclick = () =>
  action(async () => {
    const c = await executorContract();
    await (await c.invalidateAll()).wait();
    invalidate();
    status(
      "All approvals from earlier epochs are now invalid. Token allowances are separate.",
    );
  });
$("import").onchange = (e) => action(() => importPacket(e.target.files[0]));
$("load-evidence").onclick = () =>
  action(async () => {
    const r = await fetch("/evidence/local-proof.json");
    if (!r.ok)
      throw new Error("Recorded execution evidence is not available yet.");
    $("evidence").textContent = json(await r.json());
    $("evidence").hidden = false;
    status(
      "Showing recorded local EVM proof, not a new public-testnet transaction.",
    );
  });
for (const id of [
  "recipient",
  "amount",
  "expiry",
  "note",
  "executor",
  "contract",
  "token",
])
  $(id).addEventListener("input", () => {
    const hadProposal = Boolean(packet) || busy;
    invalidate();
    if (hadProposal) {
      status("Inputs changed. Review and sign a fresh proposal.");
    }
  });
if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", () => {
    disconnect("Wallet account changed. Reconnect to continue.");
  });
  window.ethereum.on("chainChanged", () => {
    disconnect("Wallet network changed. Reconnect to continue.");
  });
}
setNetwork();

$("public-proof").onclick = () => action(showPublicProof);
$("agent-proposal").onclick = () => action(showAgentProposal);
initGraphView((candidate) => {
  invalidate();
  if (candidate) {
    $("recipient").value = candidate.wallet;
    $("note").value = `Reviewed testnet service payment · ${candidate.id}`;
    status(
      "Agent wallet selected. Verify your invoice and payment network, then review the exact payment.",
    );
  }
});
