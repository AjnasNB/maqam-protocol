import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JsonRpcProvider, Contract } from 'ethers';

// Public, read-only verification of the participant's browser-wallet test.
const hash = '0x916fa842aafebf1caf3b0aee628601755f16acf9223c509bd0b975a7fb52d678';
const address = '0x8267D3D996e4884BBc7E88307a46A957AC95ea2b';
const account = '0x06F66Ce53eF70BdC9f98803851f7Ad7EEa1228d7';
const provider = new JsonRpcProvider('https://rpc.testnet.arc.io');
try {
  assert.equal((await provider.getNetwork()).chainId, 5042002n);
  const receipt = await provider.getTransactionReceipt(hash);
  assert.equal(receipt.status, 1);
  assert.equal(receipt.to.toLowerCase(), address.toLowerCase());
  const abi = JSON.parse(fs.readFileSync('artifacts/MaqamExecutor.json')).abi;
  const contract = new Contract(address, abi, provider);
  const event = receipt.logs.filter(log=>log.address.toLowerCase()===address.toLowerCase()).map(log=>{
    try {return contract.interface.parseLog(log);} catch {return null;}
  }).find(log=>log?.name==='Executed');
  assert.ok(event);
  for (const role of ['owner','recipient','executor']) assert.equal(event.args[role].toLowerCase(),account.toLowerCase());
  assert.equal(event.args.amount,100000n);
  assert.equal(await contract.usedNonces(account,event.args.nonce),true);
  const evidence = {
    checkedAt:new Date().toISOString(), network:'Arc Testnet', chainId:5042002,
    transactionHash:hash, blockNumber:receipt.blockNumber, contract:address,
    owner:account,executor:account,recipient:account,amountUnits:event.args.amount.toString(),decimals:6,
    digest:event.args.digest,nonce:event.args.nonce.toString(),evidenceHash:event.args.evidenceHash,
    receiptStatus:receipt.status,nonceConsumed:true,
    browserObservations:{recipientTampering:'InvalidSignature / BLOCKED',amountTampering:'InvalidSignature / BLOCKED',replay:'NonceUnavailable / BLOCKED'},
    scope:'Real connected MetaMask wallet; participant confirmed wallet prompts while Codex operated the app. Self-payment, not a separate-executor test and not payment to a Graph-discovered agent. Tamper and replay checks were eth_call simulations.'
  };
  fs.writeFileSync('evidence/participant-wallet-test.json',JSON.stringify(evidence,null,2)+'\n');
  console.log('Verified participant Arc wallet self-payment: 0.10 test USDC, successful receipt and consumed nonce.');
} finally { await provider.destroy(); }
