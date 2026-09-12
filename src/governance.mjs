import {PolicyEngine,ToolGateway,ApprovalQueue} from 'maqam';
import {assessProposal,requireTestnet} from './protocol.mjs';

/** Maqam governs proposal evaluation. Onchain signatures remain the execution authority. */
export async function evaluateProposal(input){
  requireTestnet(input.chainId);
  const gateway=new ToolGateway({policyEngine:new PolicyEngine({allowedTools:['payment.evaluate']})});
  gateway.registerTool('payment.evaluate',async value=>assessProposal(value),{effects:['read']});
  return {assessment:await gateway.call('payment.evaluate',input,{runId:crypto.randomUUID()}),
    governance:{library:'maqam',version:'0.3.3',tool:'payment.evaluate',boundary:'proposal policy; execution requires onchain signature'}};
}

/** The host must authenticate the owner before approving a request in this queue. */
export function createPaymentGateway(handler){
  const approvals=new ApprovalQueue();
  const gateway=new ToolGateway({policyEngine:new PolicyEngine({allowedTools:['payment.execute'],approvalRequiredEffects:['send']}),approvalQueue:approvals});
  gateway.registerTool('payment.execute',handler,{effects:['send']});
  return {gateway,approvals};
}
