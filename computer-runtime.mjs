import {promises as fs, openSync, closeSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile, spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';

export const root=path.dirname(fileURLToPath(import.meta.url));
export const runtime=path.join(root,'runtime');
export const stateFile=path.join(runtime,'computer-processes.json');
export const tunnelPattern=/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;
export const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const runFile=promisify(execFile);

export async function run(executable,args,options={}){
  try{return await runFile(executable,args,{cwd:root,windowsHide:true,encoding:'utf8',maxBuffer:1024*1024,...options});}
  catch(error){if(error.stdout)process.stdout.write(error.stdout);if(error.stderr)process.stderr.write(error.stderr);throw error;}
}

export async function exists(file){try{await fs.access(file);return true;}catch{return false;}}

export async function findExecutable(name,extras=[]){
  const directories=(process.env.PATH||process.env.Path||'').split(path.delimiter).filter(Boolean);
  for(const candidate of [...directories.map(directory=>path.join(directory,name)),...extras])if(await exists(candidate))return path.resolve(candidate);
  return null;
}

export async function processIdentity(id){
  if(!Number.isSafeInteger(Number(id))||Number(id)<1)return null;
  const powershell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  // Read-only process inspection. No scripts or execution-policy changes.
  const command=`$ErrorActionPreference='Stop';$p=Get-Process -Id ${Number(id)};[pscustomobject]@{id=$p.Id;executable=$p.Path;startedAt=$p.StartTime.ToUniversalTime().ToString('o')}|ConvertTo-Json -Compress`;
  try{
    const {stdout}=await runFile(powershell,['-NoProfile','-Command',command],{windowsHide:true,encoding:'utf8',timeout:10000});
    const result=JSON.parse(stdout.replace(/^\uFEFF/,''));
    return result?.executable&&result?.startedAt?result:null;
  }catch{return null;}
}

export async function isOwnedProcess(record){
  if(!record||!['backend','gateway','tunnel'].includes(record.label)||!record.startedAt||!record.executable)return false;
  const actual=await processIdentity(record.id);
  return Boolean(actual&&actual.executable.toLowerCase()===record.executable.toLowerCase()&&actual.startedAt===record.startedAt);
}

export async function withRuntimeLock(task){
  await fs.mkdir(runtime,{recursive:true});
  const lockFile=path.join(runtime,'computer.lock');
  let handle;
  try{handle=await fs.open(lockFile,'wx');}
  catch(error){if(error.code==='EEXIST')throw Error('Another start/stop is running. If it was interrupted, remove runtime/computer.lock only after confirming no start/stop is running.');throw error;}
  const token=randomUUID();
  await handle.writeFile(JSON.stringify({id:process.pid,token}));await handle.close();
  const release=async()=>{try{const owner=JSON.parse(await fs.readFile(lockFile,'utf8'));if(owner.token===token)await fs.unlink(lockFile);}catch{}};
  const interrupted=()=>{release().finally(()=>process.exit(130));};
  process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted);
  try{return await task();}
  finally{process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);await release();}
}

export async function loadState(){
  try{const saved=JSON.parse(await fs.readFile(stateFile,'utf8'));return{processes:Array.isArray(saved.processes)?saved.processes:[],tunnelUrl:saved.tunnelUrl||null};}
  catch(error){if(error.code==='ENOENT')return{processes:[],tunnelUrl:null};throw Error('The runtime process record could not be read. No processes were changed.');}
}

export async function saveState(state){
  const temporary=stateFile+'.'+randomUUID()+'.tmp';
  await fs.writeFile(temporary,JSON.stringify(state,null,2)+'\n','utf8');await fs.rename(temporary,stateFile);
}

export async function healthy(address){
  try{const response=await fetch(address+'/api/health',{signal:AbortSignal.timeout(5000)});return response.ok&&(await response.json()).ok===true;}
  catch{return false;}
}

export async function startHelper(label,executable,args,state){
  const output=openSync(path.join(runtime,label+'.out.log'),'w');
  const errors=openSync(path.join(runtime,label+'.err.log'),'w');
  let child;
  try{
    child=spawn(executable,args,{cwd:root,windowsHide:true,detached:true,stdio:['ignore',output,errors]});
    await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
  }finally{closeSync(output);closeSync(errors);}
  child.unref();
  const identity=await processIdentity(child.pid);
  if(!identity){try{child.kill();}catch{}throw Error('A helper could not be identified safely. It was not left running.');}
  const record={label,...identity};state.processes.push(record);await saveState(state);return record;
}

export async function waitForService(address,record){
  for(let attempt=0;attempt<20;attempt++){
    if(await healthy(address))return;
    if(!await isOwnedProcess(record))throw Error('A learning service stopped. Check the logs in runtime/.');
    await wait(500);
  }
  throw Error('The learning service did not start: '+address);
}
