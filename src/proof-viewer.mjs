import {JsonRpcProvider,Contract,formatUnits} from 'ethers';
import {digest,networks} from './protocol.mjs';
const $=id=>document.getElementById(id);
function node(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function link(text,url){const el=node('a',text);el.href=url;el.target='_blank';el.rel='noopener';return el;}
export async function showPublicProof(){
  const response=await fetch('/evidence/arc-proof.json');if(!response.ok)throw new Error('Arc execution record unavailable.');
  const record=await response.json();const area=$('receipt');area.replaceChildren();
  const head=node('div',null,'proof-head');head.append(node('span','ARC TESTNET / RECORDED EXECUTION','eyebrow'),node('span','Checking chain…','proof-badge'));area.append(head);
  area.append(node('h3',`${formatUnits(record.authorization.amount,6)} USDC. Exactly as authorized.`,'proof-title'));
  area.append(node('p','A scripted owner signed once. A separate agent account executed. Inspect the live transaction and the retained rejection evidence.','small-muted'));
  const flow=node('div',null,'proof-flow');
  for(const [title,address] of [['Owner signed',record.owner],['Agent executed',record.executor],['Recipient received',record.authorization.recipient]]){const card=node('div');card.append(node('span',title),link(address,networks[5042002].explorer+'/address/'+address));flow.append(card);}area.append(flow);
  const checks=node('div',null,'proof-checks');for(const test of record.results){const row=node('div');row.append(node('span',test.passed?'✓':'!',test.passed?'pass':'fail'),node('span',test.test),node('code',test.code||'CONFIRMED'));checks.append(row);}area.append(checks);
  const footer=node('div',null,'proof-links');footer.append(link('View transaction ↗',networks[5042002].explorer+'/tx/'+record.receipt.transactionHash),link('Contract ↗',networks[5042002].explorer+'/address/'+record.contract),link('Download complete evidence ↗','/evidence/arc-proof.json'));area.append(footer);
  const disclaimer=node('p','Rejection checks were recorded using eth_call; the successful payment was mined. Live verification below checks the mined receipt and consumed nonce.','field-help');area.append(disclaimer);
  let provider;
  try{
    provider=new JsonRpcProvider(networks[5042002].rpc);
    const receipt=await provider.getTransactionReceipt(record.receipt.transactionHash);
    if(!receipt||receipt.status!==1||receipt.to.toLowerCase()!==record.contract.toLowerCase())throw new Error('Unexpected chain receipt');
    const artifact=await(await fetch('/artifacts/MaqamExecutor.json')).json();const c=new Contract(record.contract,artifact.abi,provider);
    const event=receipt.logs.map(log=>{try{return c.interface.parseLog(log);}catch{return null;}}).find(e=>e?.name==='Executed');
    if(!event||event.args.digest!==digest(5042002,record.contract,record.authorization)||!await c.usedNonces(record.owner,record.authorization.nonce))throw new Error('Receipt verification failed');
    head.lastChild.textContent='✓ VERIFIED AGAINST LIVE CHAIN';
    disclaimer.textContent+=` Live receipt verified at ${new Date().toLocaleTimeString()}, block ${receipt.blockNumber}.`;
  }catch(error){head.lastChild.textContent='RECORDED EVIDENCE';disclaimer.textContent+=' Live RPC verification unavailable: '+error.message;}finally{await provider?.destroy();}
}
export async function showAgentProposal(){
  const r=await fetch('/evidence/agent-proposal.json');if(!r.ok)throw new Error('Recorded model proposal unavailable.');const record=await r.json();
  const area=$('agent-evidence');area.replaceChildren();area.hidden=false;
  area.append(node('span','RECORDED MODEL CALL / SYNTHETIC INVOICE','eyebrow'),node('h3','The agent proposes. You hold the authority.'),node('p',record.output.explanation));
  const details=node('p',`${record.model} · ${record.usage.total_tokens} tokens · ${new Date(record.generatedAt).toLocaleString()}`,'small-muted');area.append(details);
  area.append(link('Inspect prompt, output & policy decision ↗','/evidence/agent-proposal.json'));
  const use=node('button','Use this sample proposal','secondary');use.type='button';use.onclick=()=>{
    $('recipient').value=record.output.recipient;$('recipient').dispatchEvent(new Event('input'));
    $('amount').value=formatUnits(record.output.amountUnits,6);$('note').value=record.output.memo;
    $('status').textContent='Sample proposal loaded from a recorded real model call. Review before signing; the sample recipient is a valueless test fixture.';
    $('workspace').scrollIntoView({behavior:'smooth'});
  };area.append(use);
}
