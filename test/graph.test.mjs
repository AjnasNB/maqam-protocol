import test from "node:test";
import assert from "node:assert/strict";
import { screenAgent, discoverAgents } from "../src/graph-agents.mjs";
import { validateGraphEvidence } from "../src/graph-evidence.mjs";
import worker from "../worker.mjs";
const owner = "0x1111111111111111111111111111111111111111";
const wallet = "0x2222222222222222222222222222222222222222";
const agent = {
  id: "84532:1",
  agentId: "1",
  chainId: "84532",
  owner,
  agentWallet: wallet,
  registrationFile: {
    name: "Research agent",
    description: "Research reports",
    active: true,
    mcpTools: [],
    a2aSkills: [],
  },
  feedback: [],
};
const now = 1_800_000_000_000;
const data = () => ({
  data: {
    _meta: {
      block: { number: 100, timestamp: now / 1000 - 5 },
      hasIndexingErrors: false,
    },
    agents: [structuredClone(agent)],
  },
});
const run = (raw = data(), input = {}) =>
  discoverAgents(
    { network: 84532, task: "research", ...input },
    {
      apiKey: "test-only",
      now: () => now,
      fetcher: async (url, options) => {
        assert.match(
          url,
          /^https:\/\/gateway\.thegraph\.com\/api\/subgraphs\/id\//,
        );
        assert.equal(options.headers.Authorization, "Bearer test-only");
        return Response.json(raw);
      },
    },
  );

test("Graph screening requires active registration, agent wallet and task match", () => {
  assert.equal(screenAgent(agent, "research").eligible, true);
  assert.equal(screenAgent(agent, "trading").eligible, false);
  assert.equal(screenAgent({ ...agent, agentWallet: null }).eligible, false);
  assert.equal(
    screenAgent({ ...agent, registrationFile: null }).eligible,
    false,
  );
  assert.equal(
    screenAgent({
      ...agent,
      registrationFile: { ...agent.registrationFile, active: false },
    }).eligible,
    false,
  );
});
test("Review policy deduplicates reviewers and excludes self-feedback", () => {
  const a = {
    ...agent,
    feedback: [
      { clientAddress: owner },
      { clientAddress: wallet },
      { clientAddress: wallet },
    ],
  };
  assert.equal(screenAgent(a, "", 2).eligible, false);
  assert.equal(screenAgent(a, "", 1).reviewers, 1);
});
test("Live Graph snapshot binds exact evidence and never claims static fallback", async () => {
  const result = await run();
  assert.equal(result.candidates[0].eligible, true);
  assert.equal(result.indexedBlock, 100);
  const packet = {
    authorization: { recipient: wallet },
    note: `Invoice\nGraph agent: ${agent.id}\nGraph snapshot: ${result.snapshotHash}`,
    graphEvidence: {
      agentId: agent.id,
      wallet,
      snapshotHash: result.snapshotHash,
      snapshot: result.snapshot,
    },
  };
  assert.doesNotThrow(() => validateGraphEvidence(packet));
  packet.graphEvidence.snapshot.agents[0].agentWallet = owner;
  assert.throws(() => validateGraphEvidence(packet), /signed note/);
});
test("Graph discovery fails closed on missing key, stale/error indexes, mixed chains and API errors", async () => {
  await assert.rejects(discoverAgents({ task: "" }), /not configured/);
  const stale = data();
  stale.data._meta.block.timestamp -= 1000;
  await assert.rejects(run(stale), /15 minutes/);
  const broken = data();
  broken.data._meta.hasIndexingErrors = true;
  await assert.rejects(run(broken), /unhealthy/);
  const mixed = data();
  mixed.data.agents[0].chainId = "1";
  await assert.rejects(run(mixed), /unexpected registry/);
  await assert.rejects(
    run({ errors: [{ message: "no auth" }] }),
    /query failed/,
  );
  await assert.rejects(run(data(), { network: 1 }), /Select Base/);
  await assert.rejects(run(data(), { minimumReviewers: -1 }), /0 to 20/);
});
test("Graph Worker route rejects malformed requests and exposes no credentials", async () => {
  const call = (body) =>
    worker.fetch(
      new Request("https://test.invalid/api/agents", { method: "POST", body }),
      {},
    );
  assert.equal((await call("{")).status, 400);
  assert.equal((await call("x".repeat(4097))).status, 413);
  const unavailable = await call(JSON.stringify({ task: "research" }));
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).error, /not configured/);
});
