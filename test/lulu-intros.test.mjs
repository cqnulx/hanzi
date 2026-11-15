import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createLuluIntroCatalog,luluIntroRequest} from '../lulu-intros.mjs';
import {createServer,initialState} from '../server.mjs';

const generated={reply:'Choose a short lesson, listen to its phrases, and try one question.',actions:[{view:'learn',label:'Open lessons'}],model:'intro-model',generatedAt:'2026-11-15T00:00:00.000Z'};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
async function directory(t){const folder=await fs.mkdtemp(path.join(os.tmpdir(),'hanzi-intros-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));return folder;}

test('standard introduction payloads contain trusted feature facts and no learner context',()=>{
 for(const language of ['zh','en','es','fr','de','ja','ko']){
  const payload=luluIntroRequest('learn',language);assert.equal(payload.mode,'intro');assert.equal(payload.language,language);assert.equal(payload.standardIntro,true);assert.equal(payload.sectionFacts.name,'Video lessons and adaptive practice');
  for(const field of ['profile','memories','history','recentAccuracy','learningDifficulty'])assert.equal(Object.hasOwn(payload,field),false);
  assert.equal(payload.message,'');assert.match(payload.introductionScope,/90 characters/);assert.match(payload.introductionScope,/capability limitation/);
 }
 assert.throws(()=>luluIntroRequest('../profile','en'),{status:400});assert.throws(()=>luluIntroRequest('overview','../en'),{status:400});
});

test('catalog persists a whitelisted model result across instances and invalidates model or content revisions',async t=>{
 const folder=await directory(t),catalog=createLuluIntroCatalog({directory:folder,model:'intro-model'});
 const stored=await catalog.put('overview','en',{...generated,profile:{name:'Must never persist'},memories:['private'],actions:[...generated.actions,{view:'https://example.com',label:'External'},{view:'learn',label:'Duplicate'}]});
 assert.deepEqual(stored,generated);assert.deepEqual(await createLuluIntroCatalog({directory:folder,model:'intro-model'}).get('overview','en'),generated);
 const source=await fs.readFile(path.join(folder,'overview-en.json'),'utf8');assert.doesNotMatch(source,/Must never persist|private|profile|https:/);
 assert.equal(await createLuluIntroCatalog({directory:folder,model:'new-model'}).get('overview','en'),null);
 assert.equal(await catalog.get('overview','zh'),null);assert.equal(await catalog.get('learn','en'),null);
 const saved=JSON.parse(source);saved.revision='outdated-feature-facts';await fs.writeFile(path.join(folder,'overview-en.json'),JSON.stringify(saved));assert.equal(await catalog.get('overview','en'),null);
 await fs.writeFile(path.join(folder,'overview-en.json'),'{interrupted old content');assert.equal(await catalog.get('overview','en'),null);
});

test('concurrent standard introduction requests share generation and failed generation never becomes a cache entry',async t=>{
 const folder=await directory(t),catalog=createLuluIntroCatalog({directory:folder,model:'intro-model'}),waiting=deferred();let calls=0;
 const generate=async()=>{calls++;return waiting.promise;};
 const requests=Array.from({length:4},()=>catalog.resolve('write','en',generate));waiting.resolve(generated);
 const responses=await Promise.all(requests);assert.equal(calls,1);assert.ok(responses.every(response=>response.cached===false));assert.ok(responses.every(response=>response.result.reply===generated.reply));
 const hit=await catalog.resolve('write','en',()=>{throw Error('Must reuse the generated introduction');});assert.equal(hit.cached,true);
 await assert.rejects(catalog.resolve('speak','en',async()=>{throw Error('upstream failure');}),/upstream failure/);assert.equal(await catalog.get('speak','en'),null);
 await assert.rejects(catalog.resolve('speak','en',async()=>({reply:''})),{status:502});assert.equal(await catalog.get('speak','en'),null);
 assert.deepEqual(await catalog.resolve('speak','en',async()=>generated),{result:generated,cached:false});
 assert.ok((await fs.readdir(folder)).every(name=>name.endsWith('.json')));
});

test('invalid writes preserve a valid introduction and simultaneous writers leave complete JSON without temporary files',async t=>{
 const folder=await directory(t),catalog=createLuluIntroCatalog({directory:folder,model:'intro-model'});
 await catalog.put('memory','en',generated);
 await assert.rejects(catalog.put('memory','en',{...generated,model:'different-model'}),{status:502});
 await assert.rejects(catalog.put('memory','en',{...generated,generatedAt:'yesterday'}),{status:502});
 assert.deepEqual(await catalog.get('memory','en'),generated);
 await Promise.all(Array.from({length:4},(_,index)=>catalog.put('path','en',{...generated,reply:`Complete introduction ${index}.`})));
 const saved=await catalog.get('path','en');assert.match(saved.reply,/^Complete introduction [0-3]\.$/);assert.ok((await fs.readdir(folder)).every(name=>name.endsWith('.json')));
});

test('shared introductions stay independent of private learning data, populate each session voice history, and chat stays live',async t=>{
 const folder=await directory(t),calls=[],voiceCalls=[],catalogDirectory=path.join(folder,'standard-intros');
 const wave=Buffer.alloc(44);wave.write('RIFF');wave.write('WAVE',8);
 const server=createServer({storageDir:folder,luluIntroDirectory:catalogDirectory,apiKey:'catalog-test',model:'intro-model',fetchImpl:async(_url,options)=>{
  const body=JSON.parse(options.body),payload=JSON.parse(body.messages[1].content);calls.push(payload);
  return Response.json({choices:[{message:{content:JSON.stringify(payload.mode==='intro'?generated:{reply:'Let us practise your next sentence.',actions:[]})}}]});
 },voiceFetchImpl:async(_url,options)=>{voiceCalls.push(JSON.parse(options.body));return new Response(wave,{headers:{'Content-Type':'audio/wav'}});}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const base=`http://127.0.0.1:${server.address().port}`,a={},b={};
 async function request(route,payload,jar){const response=await fetch(base+route,{method:payload?'POST':'GET',headers:{'Content-Type':'application/json',...(jar.cookie?{Cookie:jar.cookie}:{})},body:payload?JSON.stringify(payload):undefined});if(response.headers.get('set-cookie'))jar.cookie=response.headers.get('set-cookie').split(';')[0];return{status:response.status,data:await response.json()};}
 await request('/api/state',undefined,a);await request('/api/state',undefined,b);
 const aFile=path.join(folder,a.cookie.split('=')[1]+'.json'),privateState=initialState();privateState.profile.name='Private learner A';privateState.memories=[{id:'private-memory',text:'Private preference',status:'active',category:'preference',kind:'semantic',timestamp:new Date().toISOString()}];await fs.writeFile(aFile,JSON.stringify(privateState));
 const first=await request('/api/lulu',{mode:'intro',section:'overview',language:'en',message:'Do not put my personal message in the shared introduction'},a);
 const second=await request('/api/lulu',{mode:'intro',section:'overview',language:'en'},b);
 assert.equal(first.status,200);assert.equal(first.data.introCached,false);assert.equal(second.status,200);assert.equal(second.data.introCached,true);assert.equal(second.data.mode,'live');assert.equal(second.data.reply,generated.reply);assert.equal(calls.length,1);
 for(const key of ['profile','memories','history','recentAccuracy','learningDifficulty'])assert.equal(Object.hasOwn(calls[0],key),false);assert.equal(calls[0].message,'');
 const savedA=JSON.parse(await fs.readFile(aFile,'utf8')),savedB=JSON.parse(await fs.readFile(path.join(folder,b.cookie.split('=')[1]+'.json'),'utf8'));
 assert.deepEqual(savedA.memories,privateState.memories);assert.deepEqual(savedA.stats,privateState.stats);assert.deepEqual(savedB.memories,[]);assert.equal(savedB._private.luluHistory.length,2);assert.equal(savedB._private.luluHistory[1].content,generated.reply);assert.equal(second.data.state._private,undefined);
 assert.doesNotMatch(await fs.readFile(path.join(catalogDirectory,'overview-en.json'),'utf8'),/Private learner|Private preference|personal message/);
 const voice=await request('/api/lulu/voice',{text:second.data.reply,language:'en',segmentIndex:0},b);assert.equal(voice.status,200);assert.equal(voiceCalls.length,1);assert.equal(voiceCalls[0].cache,'standard-intro');
 const chat=await request('/api/lulu',{mode:'chat',section:'write',language:'en',message:'Help with my writing'},a);assert.equal(chat.status,200);assert.equal(chat.data.introCached,undefined);assert.equal(calls.length,2);assert.equal(calls[1].profile.name,'Private learner A');assert.equal(calls[1].history.length,2);
});
