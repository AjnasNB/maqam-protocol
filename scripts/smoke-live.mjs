import https from "node:https";
import dns from "node:dns";
import fs from "node:fs";
import assert from "node:assert/strict";
// Explicit public resolver avoids a stale local NXDOMAIN cached before domain creation.
const resolver = new dns.Resolver();
resolver.setServers(["1.1.1.1"]);
function call(method, body) {
  return new Promise((resolve, reject) => {
    const encoded = body ? JSON.stringify(body) : "";
    const req = https.request(
      "https://maqam.ajnasnb.com/api/proposal",
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(encoded),
        },
        lookup(host, options, callback) {
          resolver.resolve4(host, (error, addresses) => {
            if (error) return callback(error);
            if (options.all)
              callback(
                null,
                addresses.map((address) => ({ address, family: 4 })),
              );
            else callback(null, addresses[0], 4);
          });
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
          if (data.length > 8192) req.destroy(new Error("Oversized response"));
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (error) {
            reject(error);
          }
        });
        res.on("error", reject);
      },
    );
    req.setTimeout(20000, () => req.destroy(new Error("Request timeout")));
    req.on("error", reject);
    req.end(encoded);
  });
}
const input = {
  chainId: 5042002,
  recipient: "0xad3117A01feFE725C8D1b5e23E22933753bd9FAA",
  amount: "1000000",
};
const allowed = await call("POST", input);
assert.equal(allowed.status, 200);
assert.equal(allowed.body.assessment.allowed, true);
assert.equal(allowed.body.governance.library, "maqam");
const oversized = await call("POST", { ...input, amount: "26000000" });
assert.equal(oversized.body.assessment.allowed, false);
const mainnet = await call("POST", { ...input, chainId: 1 });
assert.equal(mainnet.status, 400);
const get = await call("GET");
assert.equal(get.status, 405);
const record = {
  checkedAt: new Date().toISOString(),
  url: "https://maqam.ajnasnb.com/api/proposal",
  dnsResolver: "1.1.1.1 (normal TLS certificate validation)",
  allowed,
  oversized,
  mainnet,
  get,
};
fs.writeFileSync(
  "evidence/live-api.json",
  JSON.stringify(record, null, 2) + "\n",
);
console.log(
  "Live API passed: allowed testnet proposal, policy budget rejection, mainnet rejection, method rejection.",
);
