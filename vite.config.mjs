import {defineConfig} from 'vite';
import {evaluateProposal} from './src/governance.mjs';
export default defineConfig({plugins:[{name:'local-governance-api',configureServer(server){
  server.middlewares.use('/api/proposal',(req,res,next)=>{
    if(req.method!=='POST'){res.statusCode=405;res.end();return;}
    let body='';req.on('data',chunk=>{body+=chunk;if(body.length>4096)req.destroy();});
    req.on('end',async()=>{try{const b=JSON.parse(body);const result=await evaluateProposal({chainId:b.chainId,recipient:b.recipient,amount:b.amount,maximum:'25000000'});res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));}catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message}));}});
  });
}}]});
