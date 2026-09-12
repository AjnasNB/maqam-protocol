import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

const sources = Object.fromEntries(fs.readdirSync('contracts').filter(x => x.endsWith('.sol'))
  .map(name => [name, {content: fs.readFileSync(path.join('contracts', name), 'utf8')}]));
const input = {language:'Solidity', sources, settings:{optimizer:{enabled:true,runs:200}, evmVersion:'paris',
  outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object','metadata']}}}};
const output = JSON.parse(solc.compile(JSON.stringify(input), {import(file) {
  try { return {contents:fs.readFileSync(path.join('node_modules',file),'utf8')}; }
  catch { return {error:`Missing dependency: ${file}`}; }
}}));
for (const error of output.errors ?? []) console.error(error.formattedMessage);
if (output.errors?.some(x => x.severity === 'error')) process.exit(1);
fs.mkdirSync('artifacts',{recursive:true});
fs.mkdirSync('public/artifacts',{recursive:true});
for (const file of Object.keys(sources)) for (const [name, contract] of Object.entries(output.contracts[file])) {
  const artifact = {contractName:name, compiler:solc.version(), abi:contract.abi,
    bytecode:`0x${contract.evm.bytecode.object}`, deployedBytecode:`0x${contract.evm.deployedBytecode.object}`};
  fs.writeFileSync(`artifacts/${name}.json`,JSON.stringify(artifact,null,2)+'\n');
  fs.writeFileSync(`public/artifacts/${name}.json`,JSON.stringify(artifact)+'\n');
  console.log(`Compiled ${name}: ${(artifact.bytecode.length-2)/2} bytes`);
}
fs.writeFileSync('artifacts/compiler-input.json',JSON.stringify(input,null,2)+'\n');
