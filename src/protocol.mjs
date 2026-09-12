import {getAddress, isAddress, keccak256, toUtf8Bytes, TypedDataEncoder} from 'ethers';

export const types = {Authorization:[
  {name:'owner',type:'address'},{name:'executor',type:'address'},
  {name:'token',type:'address'},{name:'recipient',type:'address'},
  {name:'amount',type:'uint256'},{name:'nonce',type:'uint256'},
  {name:'deadline',type:'uint256'},{name:'epoch',type:'uint256'},
  {name:'evidenceHash',type:'bytes32'}
]};
export const domain = (chainId, verifyingContract) => ({name:'Maqam Protocol',version:'1',chainId,verifyingContract});
export const digest = (chainId, contract, authorization) => TypedDataEncoder.hash(domain(chainId,contract),types,authorization);
export const evidenceHash = text => keccak256(toUtf8Bytes(text));
export const networks = Object.freeze({
  84532:{name:'Base Sepolia',rpc:'https://sepolia.base.org',explorer:'https://sepolia.basescan.org',currency:'ETH'},
  11155111:{name:'Ethereum Sepolia',rpc:'https://ethereum-sepolia-rpc.publicnode.com',explorer:'https://sepolia.etherscan.io',currency:'ETH'},
  5042002:{name:'Arc Testnet',rpc:'https://rpc.testnet.arc.io',explorer:'https://testnet.arcscan.app',currency:'USDC',token:'0x3600000000000000000000000000000000000000'},
  31337:{name:'Local EVM',rpc:'http://127.0.0.1:8546',explorer:null,currency:'ETH'}
});
export function requireTestnet(id) {
  const network=networks[Number(id)];
  if(!network) throw new Error(`Unsupported chain ${id}. This application only permits testnets.`);
  return network;
}
export function assessProposal({recipient,amount,maximum='25000000',approvedRecipient}) {
  if(!isAddress(recipient)) return {allowed:false,code:'INVALID_RECIPIENT',reason:'Enter a valid recipient address.'};
  if(!/^[0-9]+$/.test(String(amount)) || BigInt(amount)<=0n) return {allowed:false,code:'INVALID_AMOUNT',reason:'Amount must be positive whole token units.'};
  if(BigInt(amount)>BigInt(maximum)) return {allowed:false,code:'BUDGET_EXCEEDED',reason:'This proposal exceeds the configured per-payment limit.'};
  if(approvedRecipient && getAddress(recipient)!==getAddress(approvedRecipient)) return {allowed:false,code:'RECIPIENT_CHANGED',reason:'The proposed recipient differs from the approved vendor.'};
  return {allowed:true,code:'REVIEW_REQUIRED',reason:'Within policy. A person must approve the exact payment.'};
}
