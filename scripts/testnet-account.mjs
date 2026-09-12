import fs from "node:fs";
import { Wallet } from "ethers";
fs.mkdirSync("data", { recursive: true });
const path = "data/testnet-account.json";
if (!fs.existsSync(path)) {
  const wallet = Wallet.createRandom();
  fs.writeFileSync(
    path,
    JSON.stringify(
      {
        purpose:
          "Valueless ETHOnline testnet deployment only. NEVER fund on mainnet.",
        address: wallet.address,
        privateKey: wallet.privateKey,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
}
console.log(
  JSON.stringify({
    address: JSON.parse(fs.readFileSync(path)).address,
    purpose:
      "Testnet deployment only; secret retained locally in ignored data directory.",
  }),
);
