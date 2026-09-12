import fs from "node:fs";
const deployment = JSON.parse(fs.readFileSync("public/deployments.json"))[
  "5042002"
];
const form = new FormData();
for (const [key, value] of Object.entries({
  contractaddress: deployment.contract,
  contractname: "MaqamExecutor.sol:MaqamExecutor",
  codeformat: "solidity-standard-json-input",
  compilerversion: "v0.8.36+commit.8a079791",
  sourceCode: fs.readFileSync("artifacts/verification-input.json", "utf8"),
  licenseType: "3",
}))
  form.append(key, value);
const response = await fetch(
  "https://testnet.arcscan.app/api?module=contract&action=verifysourcecode",
  {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(45000),
  },
);
console.log(response.status, await response.text());
const verified = await (
  await fetch(
    `https://testnet.arcscan.app/api/v2/smart-contracts/${deployment.contract}`,
  )
).json();
const record = {
  checkedAt: new Date().toISOString(),
  address: deployment.contract,
  name: verified.name,
  compilerVersion: verified.compiler_version,
  verifiedAt: verified.verified_at,
  fullyVerified: verified.is_fully_verified,
  partiallyVerified: verified.is_partially_verified,
  changedBytecode: verified.is_changed_bytecode,
};
if (
  verified.name !== "MaqamExecutor" ||
  !verified.source_code ||
  verified.is_partially_verified !== false
)
  throw new Error("Explorer source verification not confirmed");
fs.writeFileSync(
  "public/evidence/source-verification.json",
  JSON.stringify(record, null, 2) + "\n",
);
console.log(record);
