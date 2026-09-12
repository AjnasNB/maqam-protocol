import fs from "node:fs";
import {
  JsonRpcProvider,
  Wallet,
  NonceManager,
  Contract,
  ContractFactory,
  parseUnits,
} from "ethers";
import { requireTestnet } from "../src/protocol.mjs";

const network = requireTestnet(5042002);
const provider = new JsonRpcProvider(network.rpc);
provider.pollingInterval = 1000;
try {
  if (Number((await provider.getNetwork()).chainId) !== 5042002)
    throw new Error("Wrong chain; refusing deployment.");
  const account = JSON.parse(fs.readFileSync("data/testnet-account.json"));
  const owner = new NonceManager(new Wallet(account.privateKey, provider));
  const balance = await provider.getBalance(account.address);
  console.log(
    JSON.stringify({
      chainId: 5042002,
      owner: account.address,
      nativeTestUSDC: balance.toString(),
    }),
  );
  if (balance < parseUnits("0.5", 18))
    throw new Error("Fund this dedicated account with Arc testnet USDC first.");
  const agentPath = "data/testnet-executor.json";
  if (!fs.existsSync(agentPath)) {
    const w = Wallet.createRandom();
    fs.writeFileSync(
      agentPath,
      JSON.stringify({ address: w.address, privateKey: w.privateKey }),
      { mode: 0o600 },
    );
  }
  const agent = JSON.parse(fs.readFileSync(agentPath));
  const existing = fs.existsSync("public/deployments.json")
    ? JSON.parse(fs.readFileSync("public/deployments.json"))
    : {};
  let address = existing["5042002"]?.contract,
    txHash = existing["5042002"]?.deploymentTransaction;
  const artifact = JSON.parse(fs.readFileSync("artifacts/MaqamExecutor.json"));
  if(address && existing['5042002'].compiler!==artifact.compiler){
    const history=fs.existsSync('public/deployments-history.json')?JSON.parse(fs.readFileSync('public/deployments-history.json')):[];
    history.push({...existing['5042002'],supersededReason:'Recompile with explorer-supported stable compiler for source verification.'});
    fs.writeFileSync('public/deployments-history.json',JSON.stringify(history,null,2)+'\n');
    address=undefined;
  }
  if (!address) {
    const c = await new ContractFactory(
      artifact.abi,
      artifact.bytecode,
      owner,
    ).deploy();
    console.log(
      "Executor deployment submitted: " + c.deploymentTransaction().hash,
    );
    await c.waitForDeployment();
    address = await c.getAddress();
    txHash = c.deploymentTransaction().hash;
    existing["5042002"] = {
      chainId: 5042002,
      name: network.name,
      contract: address,
      token: network.token,
      tokenDecimals: 6,
      owner: account.address,
      executor: agent.address,
      deploymentTransaction: txHash,
      compiler: artifact.compiler,
      deployedAt: new Date().toISOString(),
      explorer: network.explorer,
    };
    fs.writeFileSync(
      "public/deployments.json",
      JSON.stringify(existing, null, 2) + "\n",
    );
  }
  if ((await provider.getBalance(agent.address)) < parseUnits("0.1", 18)) {
    const tx = await owner.sendTransaction({
      to: agent.address,
      value: parseUnits("1", 18),
    });
    await tx.wait();
    console.log(
      "Funded separate executor with 1 test USDC for gas: " + tx.hash,
    );
  }
  const c = new Contract(address, artifact.abi, provider);
  const d = await c.eip712Domain();
  if (d.name !== "Maqam Protocol")
    throw new Error("Unexpected contract domain");
  console.log(
    JSON.stringify({
      contract: address,
      token: network.token,
      executor: agent.address,
      transaction: txHash,
    }),
  );
} finally {
  await provider.destroy();
}
