import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.mjs";
const url = "https://example.test/api/proposal";
test("Worker serves the real policy endpoint and rejects unsupported methods, mainnet and malformed bodies", async () => {
  const call = (body) =>
    worker.fetch(new Request(url, { method: "POST", body }), {});
  const input = {
    chainId: 5042002,
    recipient: "0xad3117A01feFE725C8D1b5e23E22933753bd9FAA",
    amount: "1000000",
  };
  const valid = await call(JSON.stringify(input));
  assert.equal(valid.status, 200);
  const result = await valid.json();
  assert.equal(result.assessment.allowed, true);
  assert.equal(result.governance.library, "maqam");
  assert.equal(
    (await call(JSON.stringify({ ...input, chainId: 1 }))).status,
    400,
  );
  assert.equal((await call("{")).status, 400);
  assert.equal((await call("x".repeat(4097))).status, 413);
  assert.equal((await worker.fetch(new Request(url), {})).status, 405);
  const denied = await call(JSON.stringify({ ...input, amount: "26000000" }));
  assert.equal((await denied.json()).assessment.allowed, false);
});
