import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JsonRpcProvider,Wallet,NonceManager,Contract,verifyTypedData,hexlify,randomBytes} from 'ethers';
import {domain,types,digest,evidenceHash,requireTestnet} from '../src/protocol.mjs';
import {createPaymentGateway,evaluateProposal} from '../src/governance.mjs';

const network=requireTestnet(5042002);const provider=new JsonRpcProvider(network.rpc);provider.pollingInterval=1000;
try{
  assert.equal(Number((await provider.getNetwork()).chainId),5042002);
  const deployment=JSON.parse(fs.readFileSync('public/deployments.json'))['5042002'];
  const ownerData=JSON.parse(fs.readFileSync('data/testnet-account.json'));
  const agentData=JSON.parse(fs.readFileSync('data/testnet-executor.json'));
  const owner=new Wallet(ownerData.privateKey,provider),agent=new NonceManager(new Wallet(agentData.privateKey,provider));
  const c=new Contract(deployment.contract,JSON.parse(fs.readFileSync('artifacts/MaqamExecutor.json')).abi,agent);
  const t=new Contract(network.token,['function approve(address,uint256) returns(bool)','function balanceOf(address) view returns(uint256)','function decimals() view returns(uint8)'],new NonceManager(owner));
  assert.equal(await t.decimals(),6n);
  const agentProposal=process.argv.includes('--agent-proposal')?JSON.parse(fs.readFileSync('public/evidence/agent-proposal.json')):null; const recipient=agentProposal?agentProposal.output.recipient:Wallet.createRandom().address; if(agentProposal)assert.equal(agentProposal.output.amountUnits,'1000000');
  const a={owner:owner.address,executor:agentData.address,token:network.token,recipient,amount:'1000000',nonce:BigInt(hexlify(randomBytes(16))).toString(),deadline:(await provider.getBlock('latest')).timestamp+1800,epoch:(await c.epochs(owner.address)).toString(),evidenceHash:evidenceHash(agentProposal?JSON.stringify(agentProposal.output):'Synthetic invoice INV-2048: one research report; 1 test USDC')};
  const proposal=await evaluateProposal({chainId:5042002,recipient,amount:a.amount});assert.equal(proposal.assessment.allowed,true);
  const approvalTx=await t.approve(deployment.contract,a.amount);await approvalTx.wait();console.log('Exact allowance approved: '+approvalTx.hash);
  const d=domain(5042002,deployment.contract);const signature=await owner.signTypedData(d,types,a);
  const results=[];
  const {gateway,approvals}=createPaymentGateway(async input=>{
    const transaction=await c.execute(input.authorization,input.signature);
    console.log('Agent execution submitted: '+transaction.hash);const receipt=await transaction.wait();assert.equal(receipt.status,1);
    return {transactionHash:transaction.hash,blockNumber:receipt.blockNumber,status:receipt.status};
  });
  const input={authorization:a,signature};const context={runId:'arc-proof-'+a.nonce};let approval;
  try{await gateway.call('payment.execute',input,context);assert.fail('Expected approval');}catch(error){assert.equal(error.code,'APPROVAL_REQUIRED');approval=error.details.approvalRequests[0];results.push({test:'Maqam requires approval',code:error.code,passed:true});}
  assert.equal(verifyTypedData(d,types,a,signature),owner.address);approvals.approve(approval.approvalId,{decidedBy:owner.address});
  const approved={...context,approvalId:approval.approvalId};
  try{await gateway.call('payment.execute',{...input,authorization:{...a,amount:'2000000'}},approved);assert.fail('Expected mismatch');}catch(error){assert.equal(error.code,'APPROVAL_SCOPE_MISMATCH');results.push({test:'Maqam blocks changed proposal',code:error.code,passed:true});}
  for(const [label,change] of [['Recipient replacement',{recipient:Wallet.createRandom().address}],['Amount doubled',{amount:'2000000'}]]){
    try{await c.execute.staticCall({...a,...change},signature);assert.fail('Expected signature rejection');}catch(error){assert.equal(error.revert?.name,'InvalidSignature');results.push({test:label,code:error.revert.name,method:'Arc Testnet eth_call',passed:true});}
  }
  const before=await t.balanceOf(recipient);const receipt=await gateway.call('payment.execute',input,approved);
  assert.equal(await t.balanceOf(recipient),before+1000000n);assert.equal(await c.usedNonces(owner.address,a.nonce),true);
  results.push({test:'Separate agent pays exactly 1 test USDC',method:'Mined Arc Testnet transaction',...receipt,passed:true});
  try{await gateway.call('payment.execute',input,approved);assert.fail('Expected replay rejection');}catch(error){assert.equal(error.code,'APPROVAL_INVALID');results.push({test:'Maqam blocks replay',code:error.code,passed:true});}
  try{await c.execute.staticCall(a,signature);assert.fail('Expected nonce rejection');}catch(error){assert.equal(error.revert?.name,'NonceUnavailable');results.push({test:'Contract blocks replay even bypassing Maqam',code:error.revert.name,method:'Arc Testnet eth_call',passed:true});}
  const record={generatedAt:new Date().toISOString(),environment:'Arc Testnet — valueless test USDC',chainId:5042002,contract:deployment.contract,token:network.token,owner:owner.address,executor:agentData.address,proposal,agentProposal:agentProposal?{model:agentProposal.model,generatedAt:agentProposal.generatedAt,output:agentProposal.output}:null,authorization:a,signature,authorizationDigest:digest(5042002,deployment.contract,a),allowanceTransaction:approvalTx.hash,receipt,results};
  fs.writeFileSync('public/evidence/arc-proof.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({passed:results.length,receipt,explorer:network.explorer+'/tx/'+receipt.transactionHash}));
}finally{await provider.destroy();}
