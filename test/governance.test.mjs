import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateProposal} from '../src/governance.mjs';
test('real Maqam proposal adapter requires human review and enforces budget',async()=>{
  const input={chainId:5042002,recipient:'0x0000000000000000000000000000000000000001',amount:'1000000'};
  const allowed=await evaluateProposal(input);assert.equal(allowed.assessment.code,'REVIEW_REQUIRED');assert.equal(allowed.governance.library,'maqam');
  const blocked=await evaluateProposal({...input,amount:'25000001'});assert.equal(blocked.assessment.allowed,false);
  await assert.rejects(()=>evaluateProposal({...input,chainId:1}),/only permits testnets/);
});
