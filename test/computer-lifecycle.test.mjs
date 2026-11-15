import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureVoiceHelper,isOwnedProcess,voiceHealth,registerVoiceWorker,healthy} from '../computer-runtime.mjs';

const identity={id:1234,executable:'C:\\voice\\python.exe',startedAt:'2026-11-15T12:00:00.0000000Z'};

test('tunnel startup can use the system proxy when direct networking fails, limited to trusted tunnel addresses',async()=>{
 const address='https://restored.trycloudflare.com';let probes=0;
 const options={fetchImpl:async()=>{throw Error('direct connection unavailable');},systemProbe:async url=>{assert.equal(url,address);probes++;return true;}};
 assert.equal(await healthy(address,options),true);assert.equal(probes,1);
 assert.equal(await healthy('http://127.0.0.1:4173',options),false);assert.equal(await healthy("https://untrusted.example/'",options),false);assert.equal(probes,1);
 assert.equal(await healthy(address,{...options,fetchImpl:async()=>Response.json({ok:true})}),true);assert.equal(probes,1);
 assert.equal(await healthy(address,{...options,systemProbe:async()=>false}),false);
});

test('recorded voice identity is stoppable only while its exact executable and process start match',async()=>{
 const record={label:'voice',...identity};
 assert.equal(await isOwnedProcess(record,async()=>({...identity,executable:identity.executable.toUpperCase()})),true);
 assert.equal(await isOwnedProcess(record,async()=>({...identity,startedAt:'2026-11-16T12:00:00.0000000Z'})),false);
 assert.equal(await isOwnedProcess(record,async()=>({...identity,executable:'C:\\other\\python.exe'})),false);
 assert.equal(await isOwnedProcess(record,async()=>null),false);
 assert.equal(await isOwnedProcess({...record,label:'unmanaged'},async()=>{throw Error('Must not inspect unmanaged process');}),false);
 assert.equal(await isOwnedProcess({...record,label:'voice-worker'},async()=>identity),true);
});

test('Windows voice worker registration requires an owned launcher and an OS-verified direct child',async()=>{
 const launcher={label:'voice',...identity},child={...identity,id:5678,parentPid:launcher.id,executable:'C:\\base\\python.exe'},service={pid:child.id,parentPid:launcher.id};
 const state={processes:[launcher]};let saves=0;
 const options={isOwnedProcess:async()=>true,processIdentity:async(id,settings)=>{assert.equal(id,child.id);assert.deepEqual(settings,{parent:true});return child;},saveState:async()=>{saves++;}};
 assert.equal(await registerVoiceWorker(state,launcher,service,{...options,processIdentity:async()=>({...child,parentPid:999})}),false);
 assert.equal(await registerVoiceWorker(state,launcher,service,{...options,isOwnedProcess:async()=>false}),false);
 assert.equal(await registerVoiceWorker(state,launcher,{pid:child.id,parentPid:999},options),false);
 assert.equal(await registerVoiceWorker(state,launcher,{pid:launcher.id,parentPid:12},options),false);
 assert.equal(await registerVoiceWorker(state,launcher,service,options),true);assert.equal(saves,1);assert.deepEqual(state.processes[1],{label:'voice-worker',...child});
 assert.equal(await registerVoiceWorker(state,launcher,service,options),false);assert.equal(saves,1);
});

test('voice health accepts only the loopback reference service contract',async()=>{
 assert.deepEqual(await voiceHealth(async(url)=>{assert.equal(url,'http://127.0.0.1:4187/health');return Response.json({voice:'reference',status:'loading',referenceConfigured:true});}),{voice:'reference',status:'loading',referenceConfigured:true});
 assert.equal(await voiceHealth(async()=>Response.json({ok:true})),null);
 assert.equal(await voiceHealth(async()=>{throw Error('offline');}),null);
});

test('website startup skips an incomplete voice installation without launching or blocking the website',async()=>{
 let launched=0;const messages=[];
 const result=await ensureVoiceHelper({processes:[],tunnelUrl:'https://keep.trycloudflare.com'},{health:async()=>null,exists:async()=>false,startHelper:async()=>{launched++;},log:message=>messages.push(message)});
 assert.deepEqual(result,{status:'not-installed'});assert.equal(launched,0);assert.match(messages[0],/website remains available/);
});

test('loading or recorded starting voice service is reused without duplicate model processes',async()=>{
 for(const status of ['loading','ready','error','starting']){
  let launched=0,checkedFiles=0;const state={processes:[{label:'voice',...identity}]};
  const result=await ensureVoiceHelper(state,{health:async()=>status==='starting'?null:{voice:'reference',status},isOwnedProcess:async()=>true,exists:async()=>{checkedFiles++;return true;},startHelper:async()=>{launched++;},log:()=>{}});
  assert.deepEqual(result,{status,reused:true});assert.equal(launched,0);assert.equal(checkedFiles,0);
 }
});

test('installed voice helper prefers the console-free launcher, falls back when absent, and launches once preserving the tunnel',async()=>{
 for(const guiInstalled of [true,false]){
  const state={processes:[],tunnelUrl:'https://keep.trycloudflare.com'},starts=[];
  const options={health:async()=>null,exists:async file=>!file.endsWith('pythonw.exe')||guiInstalled,isOwnedProcess:async()=>true,log:()=>{},startHelper:async(label,executable,args,received)=>{assert.equal(received,state);starts.push({label,executable,args});state.processes.push({label,...identity});}};
  assert.deepEqual(await ensureVoiceHelper(state,options),{status:'loading',started:true});
  assert.equal(starts.length,1);assert.equal(starts[0].label,'voice');assert.match(starts[0].executable,/runtime[\\/]lulu-voice[\\/]venv[\\/]Scripts[\\/]pythonw?\.exe$/);assert.equal(starts[0].executable.endsWith('pythonw.exe'),guiInstalled);
  assert.match(starts[0].args[0],/scripts[\\/]lulu-voice-service\.py$/);assert.deepEqual(starts[0].args.slice(1,4),['--port','4187','--runtime']);
  assert.deepEqual(await ensureVoiceHelper(state,options),{status:'starting',reused:true});assert.equal(starts.length,1);assert.equal(state.tunnelUrl,'https://keep.trycloudflare.com');
 }
});

test('a voice launch failure leaves normal website startup available',async()=>{
 const messages=[];
 assert.deepEqual(await ensureVoiceHelper({processes:[]},{health:async()=>null,exists:async()=>true,startHelper:async()=>{throw Error('cannot spawn');},log:message=>messages.push(message)}),{status:'error'});
 assert.match(messages.at(-1),/website remains available/);
});
