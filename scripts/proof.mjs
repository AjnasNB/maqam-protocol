import fs from 'node:fs';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import {BrowserProvider,ContractFactory,Wallet,verifyTypedData} from 'ethers';
import {domain,types,evidenceHash,digest} from '../src/protocol.mjs';
import {createPaymentGateway,evaluateProposal} from '../src/governance.mjs';

const rpc=ganache.provider({logging:{quiet:true},chain:{chainId:31337},wallet:{totalAccounts:4}});
const provider=new BrowserProvider(rpc);provider.pollingInterval=20;
try{
  const deployer=await provider.getSigner(0),executor=await provider.getSigner(1),recipient=await provider.getSigner(2);
  const owner=new Wallet(Object.values(rpc.getInitialAccounts())[0].secretKey);
  const load=name=>JSON.parse(fs.readFileSync(`artifacts/${name}.json`));
  const ca=load('MaqamExecutor'),ta=load('TestToken');
  const c=await new ContractFactory(ca.abi,ca.bytecode,deployer).deploy();await c.waitForDeployment();
  const t=await new ContractFactory(ta.abi,ta.bytecode,deployer).deploy();await t.waitForDeployment();
  await(await t.mint(owner.address,25000000)).wait();await(await t.approve(await c.getAddress(),1000000)).wait();
  const a={owner:owner.address,executor:await executor.getAddress(),recipient:await recipient.getAddress(),token:await t.getAddress(),amount:'1000000',nonce:'2048',epoch:'0',deadline:(await provider.getBlock('latest')).timestamp+600,evidenceHash:evidenceHash('Synthetic invoice INV-2048: one research report')};
  const d=domain(31337,await c.getAddress());
  const signature=await owner.signTypedData(d,types,a);
  const results=[];
  const proposal=await evaluateProposal({chainId:31337,recipient:a.recipient,amount:a.amount});assert.equal(proposal.assessment.allowed,true);
  const {gateway,approvals}=createPaymentGateway(async input=>{
    const tx=await c.connect(executor).execute(input.authorization,input.signature);const receipt=await tx.wait();
    return {transactionHash:tx.hash,blockNumber:receipt.blockNumber,status:receipt.status};
  });
  const input={authorization:a,signature};const context={runId:'local-proof-2048'};
  let approval;
  try{await gateway.call('payment.execute',input,context);assert.fail('Expected approval');}
  catch(error){assert.equal(error.code,'APPROVAL_REQUIRED');approval=error.details.approvalRequests[0];results.push({test:'Maqam blocks unapproved dispatch',code:error.code,passed:true});}
  assert.equal(verifyTypedData(d,types,a,signature),owner.address);
  approvals.approve(approval.approvalId,{decidedBy:owner.address});
  const approved={...context,approvalId:approval.approvalId};
  try{await gateway.call('payment.execute',{...input,authorization:{...a,amount:'2000000'}},approved);assert.fail('Expected mismatch');}
  catch(error){assert.equal(error.code,'APPROVAL_SCOPE_MISMATCH');results.push({test:'Maqam rejects altered input',code:error.code,passed:true});}
  for(const [test,change] of [['Contract rejects recipient replacement',{recipient:await(await provider.getSigner(3)).getAddress()}],['Contract rejects doubled amount',{amount:'2000000'}]]){
    try{await c.connect(executor).execute.staticCall({...a,...change},signature);assert.fail('Expected contract rejection');}
    catch(error){assert.equal(error.revert?.name,'InvalidSignature');results.push({test,code:error.revert.name,method:'eth_call',passed:true});}
  }
  const before=await t.balanceOf(a.recipient);
  const receipt=await gateway.call('payment.execute',input,approved);
  assert.equal(await t.balanceOf(a.recipient),before+1000000n);
  results.push({test:'Exact approved payment transfers 1 mUSD',method:'mined local EVM transaction',passed:true,...receipt});
  try{await gateway.call('payment.execute',input,approved);assert.fail('Expected replay block');}
  catch(error){assert.equal(error.code,'APPROVAL_INVALID');results.push({test:'Maqam rejects replay',code:error.code,passed:true});}
  try{await c.connect(executor).execute.staticCall(a,signature);assert.fail('Expected contract replay block');}
  catch(error){assert.equal(error.revert?.name,'NonceUnavailable');results.push({test:'Contract rejects replay even when bypassing Maqam',code:error.revert.name,method:'eth_call',passed:true});}
  const record={generatedAt:new Date().toISOString(),environment:'Ephemeral local Ganache EVM. NOT a public testnet deployment.',chainId:31337,compiler:ca.compiler,contract:await c.getAddress(),token:await t.getAddress(),proposal,authorization:a,signature,authorizationDigest:digest(31337,await c.getAddress(),a),results};
  fs.mkdirSync('public/evidence',{recursive:true});fs.writeFileSync('public/evidence/local-proof.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({passed:results.length,receipt,evidence:'public/evidence/local-proof.json'}));
}finally{await provider.destroy();await rpc.disconnect();}
