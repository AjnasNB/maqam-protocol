import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ganache from "ganache";
import {
  BrowserProvider,
  ContractFactory,
  Wallet,
  ZeroAddress,
  parseUnits,
} from "ethers";
import {
  types,
  domain,
  digest,
  evidenceHash,
  requireTestnet,
  assessProposal,
} from "../src/protocol.mjs";
import { matchesRuntimeBytecode } from "../src/bytecode.mjs";

let rpc, provider, owner, executor, recipient, attacker, contract, token;
let nonce = 1;
const artifact = (name) =>
  JSON.parse(fs.readFileSync(`artifacts/${name}.json`));
before(async () => {
  rpc = ganache.provider({
    logging: { quiet: true },
    chain: { chainId: 31337 },
    wallet: { totalAccounts: 5 },
  });
  provider = new BrowserProvider(rpc);
  provider.pollingInterval = 20;
  const keys = Object.values(rpc.getInitialAccounts()).map((x) => x.secretKey);
  owner = new Wallet(keys[0], provider);
  executor = await provider.getSigner(1);
  recipient = await provider.getSigner(2);
  attacker = await provider.getSigner(3);
  const deployer = await provider.getSigner(0);
  const c = artifact("MaqamExecutor"),
    t = artifact("TestToken");
  contract = await new ContractFactory(c.abi, c.bytecode, deployer).deploy();
  await contract.waitForDeployment();
  token = await new ContractFactory(t.abi, t.bytecode, deployer).deploy();
  await token.waitForDeployment();
  await (await token.mint(owner.address, parseUnits("1000", 6))).wait();
  await (
    await token.approve(await contract.getAddress(), parseUnits("1000", 6))
  ).wait();
});
after(async () => {
  await provider.destroy();
  await rpc.disconnect();
});
async function request(overrides = {}) {
  const block = await provider.getBlock("latest");
  const a = {
    owner: owner.address,
    executor: await executor.getAddress(),
    token: await token.getAddress(),
    recipient: await recipient.getAddress(),
    amount: 1000000n,
    nonce: nonce++,
    deadline: block.timestamp + 3600,
    epoch: await contract.epochs(owner.address),
    evidenceHash: evidenceHash("invoice INV-2048"),
    ...overrides,
  };
  const signature = await owner.signTypedData(
    domain(31337, await contract.getAddress()),
    types,
    a,
  );
  return { a, signature };
}
async function rejected(a, signature, code, signer = executor) {
  await assert.rejects(
    () => contract.connect(signer).execute.staticCall(a, signature),
    (error) => {
      assert.equal(
        error.revert?.name,
        code,
        `Expected ${code}, received ${error.shortMessage}`,
      );
      return true;
    },
  );
}
test("exact payment transfers tokens and emits matching cryptographic receipt", async () => {
  const { a, signature } = await request();
  const before = await token.balanceOf(a.recipient);
  const tx = await contract.connect(executor).execute(a, signature);
  const receipt = await tx.wait();
  assert.equal(await token.balanceOf(a.recipient), before + a.amount);
  assert.equal(await contract.usedNonces(a.owner, a.nonce), true);
  const event = receipt.logs
    .map((x) => {
      try {
        return contract.interface.parseLog(x);
      } catch {
        return null;
      }
    })
    .find((x) => x?.name === "Executed");
  assert.equal(
    event.args.digest,
    digest(31337, await contract.getAddress(), a),
  );
  assert.equal(event.args.evidenceHash, a.evidenceHash);
  await rejected(a, signature, "NonceUnavailable");
});
test("all signed payment fields reject tampering", async () => {
  const { a, signature } = await request();
  for (const changed of [
    { recipient: await attacker.getAddress() },
    { amount: 2000000n },
    { nonce: 999999 },
    { deadline: a.deadline + 1 },
    { evidenceHash: evidenceHash("different invoice") },
    { token: await contract.getAddress() },
  ]) {
    await rejected({ ...a, ...changed }, signature, "InvalidSignature");
  }
  assert.equal(await contract.usedNonces(a.owner, a.nonce), false);
});
test("executor cannot be substituted", async () => {
  const { a, signature } = await request();
  await rejected(a, signature, "WrongExecutor", attacker);
});
test("chain and verifying contract prevent cross-domain replay", async () => {
  const { a } = await request();
  for (const d of [
    domain(84532, await contract.getAddress()),
    domain(31337, await token.getAddress()),
  ]) {
    await rejected(
      a,
      await owner.signTypedData(d, types, a),
      "InvalidSignature",
    );
  }
});
test("expired authorization fails", async () => {
  const { a, signature } = await request({ deadline: 1 });
  await rejected(a, signature, "Expired");
});
test("zero amount and zero recipient are invalid", async () => {
  for (const [overrides, code] of [
    [{ amount: 0n }, "InvalidAmount"],
    [{ recipient: ZeroAddress }, "InvalidAddress"],
  ]) {
    const { a, signature } = await request(overrides);
    await rejected(a, signature, code);
  }
});
test("owner can cancel an unused nonce; attacker cancellation is owner-scoped", async () => {
  const { a, signature } = await request();
  await (await contract.connect(attacker).cancel(a.nonce)).wait();
  await contract.connect(executor).validate(a, signature);
  await (await contract.cancel(a.nonce)).wait();
  await rejected(a, signature, "NonceUnavailable");
});
test("bulk revocation invalidates previous epoch and permits fresh approval", async () => {
  const { a, signature } = await request();
  await (await contract.invalidateAll()).wait();
  await rejected(a, signature, "EpochInvalidated");
  const fresh = await request();
  await (
    await contract.connect(executor).execute(fresh.a, fresh.signature)
  ).wait();
});
test("failed transfer rolls nonce back and authorization can be retried", async () => {
  const { a, signature } = await request({ amount: parseUnits("2000", 6) });
  const tx = await contract
    .connect(executor)
    .execute(a, signature, { gasLimit: 300000 });
  await assert.rejects(() => tx.wait());
  assert.equal(await contract.usedNonces(a.owner, a.nonce), false);
  await (await token.mint(owner.address, a.amount)).wait();
  await (await token.approve(await contract.getAddress(), a.amount)).wait();
  await (
    await contract.connect(executor).execute(a, signature, { gasLimit: 300000 })
  ).wait();
  assert.equal(await contract.usedNonces(a.owner, a.nonce), true);
});
test("mainnet transactions are refused by application network gate", () => {
  for (const id of [1, 8453, 137, 42161, 480])
    assert.throws(() => requireTestnet(id), /only permits testnets/);
  assert.equal(requireTestnet(5042002).name, "Arc Testnet");
});
test("contract wallet owner works through ERC-1271 signature checking", async () => {
  const art = artifact("TestSmartOwner"),
    deployer = await provider.getSigner(0);
  const smart = await new ContractFactory(
    art.abi,
    art.bytecode,
    deployer,
  ).deploy(owner.address);
  await smart.waitForDeployment();
  await (await token.mint(await smart.getAddress(), 1000000)).wait();
  await (
    await smart.approveToken(
      await token.getAddress(),
      await contract.getAddress(),
      1000000,
    )
  ).wait();
  const { a, signature } = await request({
    owner: await smart.getAddress(),
    epoch: 0,
  });
  await (await contract.connect(executor).execute(a, signature)).wait();
  assert.equal(await contract.usedNonces(a.owner, a.nonce), true);
});
test("reentrant token cannot execute the authorization twice", async () => {
  const art = artifact("TestReentrantToken"),
    deployer = await provider.getSigner(0);
  const evil = await new ContractFactory(
    art.abi,
    art.bytecode,
    deployer,
  ).deploy();
  await evil.waitForDeployment();
  await (await evil.mint(owner.address, 1000000)).wait();
  await (await evil.approve(await contract.getAddress(), 1000000)).wait();
  const { a, signature } = await request({
    token: await evil.getAddress(),
    executor: await evil.getAddress(),
  });
  await (await evil.launch(await contract.getAddress(), a, signature)).wait();
  assert.equal(await evil.reentryBlocked(), true);
  assert.equal(await evil.balanceOf(a.recipient), 1000000n);
});
test("runtime verification rejects changed code and permits compiler immutable slots", async () => {
  const art = artifact("MaqamExecutor"),
    code = await provider.getCode(await contract.getAddress());
  assert.equal(matchesRuntimeBytecode(code, art), true);
  assert.equal(matchesRuntimeBytecode("0x00" + code.slice(4), art), false);
  assert.equal(
    matchesRuntimeBytecode(
      await provider.getCode(await token.getAddress()),
      art,
    ),
    false,
  );
});
test("proposal policy blocks overspending and recipient replacement", async () => {
  const addr = await recipient.getAddress();
  assert.equal(
    assessProposal({ recipient: addr, amount: "25000001" }).code,
    "BUDGET_EXCEEDED",
  );
  assert.equal(
    assessProposal({
      recipient: addr,
      amount: "1000000",
      approvedRecipient: await attacker.getAddress(),
    }).code,
    "RECIPIENT_CHANGED",
  );
  assert.equal(
    assessProposal({ recipient: addr, amount: "1000000" }).code,
    "REVIEW_REQUIRED",
  );
});
