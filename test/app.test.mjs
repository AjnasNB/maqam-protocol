import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import ganache from "ganache";
import { BrowserProvider, ContractFactory, Wallet } from "ethers";
import worker from "../worker.mjs";
import { discoverAgents } from "../src/graph-agents.mjs";

// Exercise the real page handlers and contracts, without a funded external wallet.
let dom, rpc, provider, contract, token, addresses, keys, selected, pausePolicy;
let rejectSignature = false,
  signedCalls = 0;
let pauseGraph, capturedBlob;
let policyStarted;
const listeners = {};
const originalFetch = globalThis.fetch;
const originalCreateURL = URL.createObjectURL;
const $ = (id) => document.getElementById(id);
const art = (name) => JSON.parse(fs.readFileSync(`artifacts/${name}.json`));
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
async function idle() {
  const end = Date.now() + 20000;
  while (document.body.hasAttribute("aria-busy")) {
    assert.ok(
      Date.now() < end,
      "UI action timed out: " + $("status").textContent,
    );
    await tick();
  }
}
async function click(id) {
  $(id).click();
  await idle();
}
function input(id, value) {
  $(id).value = value;
  $(id).dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}
async function review() {
  $("proposal-form").dispatchEvent(
    new dom.window.Event("submit", { cancelable: true }),
  );
  await idle();
}
async function fresh() {
  selected = addresses[0];
  await click("connect");
  input("recipient", addresses[2]);
  input("amount", "0.10");
  input("executor", "");
  input("note", "DOM integration test invoice");
  await review();
  assert.equal($("review-details").hidden, false, $("status").textContent);
}
before(async () => {
  rpc = ganache.provider({
    logging: { quiet: true },
    chain: { chainId: 84532 },
    wallet: { totalAccounts: 4 },
  });
  provider = new BrowserProvider(rpc);
  provider.pollingInterval = 20;
  keys = rpc.getInitialAccounts();
  addresses = Object.keys(keys);
  const deployer = await provider.getSigner(0);
  contract = await new ContractFactory(
    art("MaqamExecutor").abi,
    art("MaqamExecutor").bytecode,
    deployer,
  ).deploy();
  token = await new ContractFactory(
    art("TestToken").abi,
    art("TestToken").bytecode,
    deployer,
  ).deploy();
  await Promise.all([contract.waitForDeployment(), token.waitForDeployment()]);
  await (await token.mint(addresses[0], 25000000)).wait();
  selected = addresses[0];
  dom = new JSDOM(fs.readFileSync("index.html", "utf8"), {
    url: "https://test.invalid",
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.matchMedia = () => ({ matches: true });
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.HTMLAnchorElement.prototype.click = () => {};
  URL.createObjectURL = (blob) => {
    capturedBlob = blob;
    return "blob:test";
  };
  window.ethereum = {
    on(name, fn) {
      (listeners[name] ||= []).push(fn);
    },
    async request({ method, params = [] }) {
      if (method === "wallet_switchEthereumChain") return null;
      if (method === "eth_accounts" || method === "eth_requestAccounts")
        return [selected];
      if (method === "eth_signTypedData_v4") {
        signedCalls++;
        if (rejectSignature)
          throw Object.assign(new Error("User rejected signature"), {
            code: 4001,
          });
        const value = JSON.parse(params[1]);
        delete value.types.EIP712Domain;
        return new Wallet(keys[selected].secretKey).signTypedData(
          value.domain,
          value.types,
          value.message,
        );
      }
      return rpc.request({ method, params });
    },
  };
  globalThis.fetch = async (url, options = {}) => {
    if (url === "/api/proposal") {
      policyStarted?.();
      if (pausePolicy) await pausePolicy;
      return worker.fetch(
        new Request("https://test.invalid/api/proposal", options),
        {},
      );
    }
    if (url === "/deployments.json")
      return Response.json({
        84532: {
          contract: await contract.getAddress(),
          token: await token.getAddress(),
        },
      });
    if (url === "/api/agents") {
      const body = JSON.parse(options.body);
      if (pauseGraph) await pauseGraph;
      return Response.json(
        await discoverAgents(body, {
          apiKey: "fixture-only",
          fetcher: async () =>
            Response.json({
              data: {
                _meta: {
                  block: {
                    number: 123,
                    timestamp: Math.floor(Date.now() / 1000),
                  },
                  hasIndexingErrors: false,
                },
                agents: [
                  {
                    id: "84532:1",
                    agentId: "1",
                    chainId: "84532",
                    owner: addresses[0],
                    agentWallet: addresses[2],
                    registrationFile: {
                      name: "Research fixture",
                      description: "Research",
                      active: true,
                    },
                    feedback: [],
                  },
                ],
              },
            }),
        }),
      );
    }
    if (url.startsWith("/artifacts/"))
      return Response.json(art(url.split("/").pop().replace(".json", "")));
    throw new Error("Unexpected test fetch: " + url);
  };
  await import("../src/app.mjs");
  await tick();
  $("network").value = "84532";
  $("network").dispatchEvent(new dom.window.Event("change"));
  await idle();
});
after(async () => {
  globalThis.fetch = originalFetch;
  URL.createObjectURL = originalCreateURL;
  dom?.window.close();
  await provider?.destroy();
  await rpc?.disconnect();
});

test("UI reviews without signing, signs exact allowance, blocks tampering, executes and blocks replay", async () => {
  await fresh();
  assert.equal(signedCalls, 0);
  assert.equal(
    await token.allowance(addresses[0], await contract.getAddress()),
    0n,
  );
  await click("sign");
  assert.equal($("execute").disabled, false, $("status").textContent);
  assert.equal(
    await token.allowance(addresses[0], await contract.getAddress()),
    100000n,
  );
  await click("attack-recipient");
  assert.match($("attack-result").textContent, /BLOCKED/);
  await click("attack-amount");
  assert.match($("attack-result").textContent, /BLOCKED/);
  const before = await token.balanceOf(addresses[2]);
  await click("execute");
  assert.match($("receipt").textContent, /Confirmed on Base Sepolia/);
  assert.equal(await token.balanceOf(addresses[2]), before + 100000n);
  await click("attack-replay");
  assert.match($("attack-result").textContent, /Nonce already consumed/);
});
test("UI invalidates a reviewed proposal when its amount changes", async () => {
  await fresh();
  input("amount", "0.20");
  assert.equal($("review-details").hidden, true);
  assert.equal($("execute").disabled, true);
});
test("UI rejects zero and over-budget values before requesting a signature", async () => {
  await fresh();
  const count = signedCalls;
  for (const amount of ["0", "26"]) {
    input("amount", amount);
    await review();
    assert.equal($("review-details").hidden, true);
    assert.equal(signedCalls, count);
  }
});
test("UI handles a rejected signature and permits retry", async () => {
  await fresh();
  rejectSignature = true;
  await click("sign");
  rejectSignature = false;
  assert.equal($("execute").disabled, true);
  assert.equal($("sign").disabled, false);
  await click("sign");
  assert.equal($("execute").disabled, false, $("status").textContent);
  await click("cancel");
  assert.equal($("execute").disabled, true);
  assert.match($("status").textContent, /revoked onchain/);
});
test("UI account change during an outstanding review never restores stale authorization", async () => {
  await fresh();
  let release;
  pausePolicy = new Promise((resolve) => {
    release = resolve;
  });
  input("amount", "0.15");
  $("proposal-form").dispatchEvent(
    new dom.window.Event("submit", { cancelable: true }),
  );
  await tick();
  selected = addresses[1];
  for (const fn of listeners.accountsChanged) fn([selected]);
  release();
  pausePolicy = null;
  await idle();
  assert.equal(
    $("review-details").hidden,
    true,
    "stale async review must not become signable",
  );
  assert.doesNotMatch($("connect").textContent, /Connected/);
});
test("UI bulk revocation clears the current authorization and advances its epoch", async () => {
  await fresh();
  await click("sign");
  const before = await contract.epochs(addresses[0]);
  await click("revoke-all");
  assert.equal(await contract.epochs(addresses[0]), before + 1n);
  assert.equal($("review-details").hidden, true);
  assert.equal($("execute").disabled, true);
});
test("UI exports and imports a packet for a separate executor, rejecting tampering before execution", async () => {
  await fresh();
  input("executor", addresses[1]);
  await review();
  await click("sign");
  await click("export");
  assert.ok(capturedBlob);
  const packet = JSON.parse(await capturedBlob.text());
  selected = addresses[1];
  for (const fn of listeners.accountsChanged) fn([selected]);
  await click("connect");
  async function load(p) {
    const text = JSON.stringify(p);
    $("import").onchange({
      target: { files: [{ size: text.length, text: async () => text }] },
    });
    await idle();
  }
  await load({ ...packet, note: "changed memo" });
  assert.equal($("execute").disabled, true);
  assert.match($("status").textContent, /commitment/);
  await load({
    ...packet,
    authorization: { ...packet.authorization, amount: "26000000" },
  });
  assert.equal($("execute").disabled, true);
  assert.match($("status").textContent, /limit/);
  await load({ ...packet, signature: "0x" + "00".repeat(65) });
  assert.equal($("execute").disabled, true);
  assert.match($("status").textContent, /InvalidSignature/);
  await load(packet);
  assert.equal($("execute").disabled, false, $("status").textContent);
  const before = await token.balanceOf(addresses[2]);
  await click("execute");
  assert.equal(await token.balanceOf(addresses[2]), before + 100000n);
  await load(packet);
  assert.equal($("execute").disabled, true);
  assert.match($("status").textContent, /NonceUnavailable/);
});
test("Graph UI clears selected evidence on filter edits and ignores stale query responses", async () => {
  input("graph-task", "research");
  await $("graph-form").onsubmit({ preventDefault() {} });
  assert.match($("graph-status").textContent, /1 of 1/);
  const consent = $("graph-results").querySelector("input[type=checkbox]");
  consent.checked = true;
  consent.onchange();
  $("graph-results").querySelector("button").click();
  assert.match($("graph-selected").textContent, /Selected Research fixture/);
  input("graph-reviewers", "5");
  assert.match($("graph-selected").textContent, /No agent selected/);
  assert.equal($("graph-results").children.length, 0);
  let release;
  pauseGraph = new Promise((resolve) => {
    release = resolve;
  });
  const pending = $("graph-form").onsubmit({ preventDefault() {} });
  input("graph-task", "treasury");
  release();
  pauseGraph = null;
  await pending;
  assert.equal($("graph-results").children.length, 0);
  assert.match($("graph-status").textContent, /conditions changed/);
});
test("UI drops a delayed review when its inputs change and unlocks after failure", async () => {
  await fresh();
  let release;
  pausePolicy = new Promise((resolve) => {
    release = resolve;
  });
  const started = new Promise((resolve) => {
    policyStarted = resolve;
  });
  $("proposal-form").dispatchEvent(
    new dom.window.Event("submit", { cancelable: true }),
  );
  await started;
  assert.equal(document.querySelector("main").inert, true);
  input("amount", "0.25");
  release();
  pausePolicy = null;
  policyStarted = null;
  await idle();
  assert.equal($("review-details").hidden, true);
  assert.equal($("sign").disabled, true);
  assert.equal(document.querySelector("main").inert, false);
});
test("UI deploys testnet contracts, clears old reviews and mints only the demo token", async () => {
  await fresh();
  const oldContract = $("contract").value;
  await click("deploy");
  assert.notEqual($("contract").value, oldContract, $("status").textContent);
  assert.equal($("review-details").hidden, true);
  await click("mint");
  assert.match($("status").textContent, /25 valueless mUSD minted/);
  const { Contract } = await import("ethers");
  const deployedToken = new Contract(
    $("token").value,
    art("TestToken").abi,
    provider,
  );
  assert.equal(await deployedToken.balanceOf(addresses[0]), 25000000n);
});
