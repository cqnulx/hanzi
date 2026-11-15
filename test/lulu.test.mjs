import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createServer} from '../server.mjs';
import {createGateway} from '../gateway.mjs';
import {LULU_SECTIONS} from '../lulu-guide.mjs';

async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;}
async function close(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}
async function fixture({apiKey='lulu-test',reply=()=>({reply:'Hello, I am Lulu. Let us try one small step.',actions:[{view:'learn',label:'Start a lesson'}]})}={}){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hanzi-lulu-')),calls=[];
 const server=createServer({storageDir:directory,apiKey,fetchImpl:async(url,options)=>{
  assert.equal(url,'https://api.deepseek.com/chat/completions');
  const body=JSON.parse(options.body),payload=JSON.parse(body.messages[1].content);calls.push({body,payload});
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(await reply(payload,body))}}]}));
 }}),base=await listen(server),a={},b={};
 async function request(payload,jar=a,route='/api/lulu',method=payload===undefined?'GET':'POST'){
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(jar.cookie?{Cookie:jar.cookie}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});
  if(response.headers.get('set-cookie'))jar.cookie=response.headers.get('set-cookie').split(';')[0];
  return{status:response.status,data:await response.json()};
 }
 const file=jar=>path.join(directory,jar.cookie.split('=')[1]+'.json');
 return{base,server,calls,a,b,request,read:async(jar=a)=>JSON.parse(await fs.readFile(file(jar),'utf8')),source:async(jar=a)=>fs.readFile(file(jar),'utf8'),close:async()=>{await close(server);await fs.rm(directory,{recursive:true,force:true});}};
}

test('every Lulu section introduction is model generated from trusted feature facts with bounded navigation',async()=>{
 const f=await fixture();try{
  for(const section of Object.keys(LULU_SECTIONS)){
   const result=await f.request({mode:'intro',section,language:'en',featureFacts:{claim:'Unsupported live video'}});
   assert.equal(result.status,200);assert.equal(result.data.mode,'live');assert.equal(result.data.section,section);assert.equal(result.data.reply,'Hello, I am Lulu. Let us try one small step.');
   assert.deepEqual(result.data.actions,[{view:'learn',label:'Start a lesson'}]);assert.equal(result.data.state._private,undefined);
   const call=f.calls.at(-1);assert.equal(call.payload.task,'lulu');assert.deepEqual(call.payload.sectionFacts,LULU_SECTIONS[section]);assert.deepEqual(Object.keys(call.payload.featureFacts),Object.keys(LULU_SECTIONS));
   assert.equal(call.payload.capabilities.originalCharacterVoiceAvailable,false);
   assert.match(call.body.messages[0].content,/Present yourself as Lulu/);assert.doesNotMatch(call.body.messages[0].content,/Present yourself as Hanzi/);
   assert.match(call.body.messages[0].content,/not a human/);assert.match(call.body.messages[0].content,/original character/);
  }
  assert.equal(f.calls.length,6);assert.deepEqual((await f.read()).memories,[]);assert.deepEqual((await f.read()).mastery,{});
  assert.deepEqual((await f.request(undefined,f.a,'/api/state')).data.stats,{sessions:0,practiceMinutes:0,writingCount:0,speakingCount:0});
 }finally{await f.close();}
});

test('Lulu uses the selected support language and current learning context while keeping Chinese examples intact',async()=>{
 const languageNames={zh:'simplified Chinese',en:'English',es:'Spanish',fr:'French',de:'German',ja:'Japanese',ko:'Korean'};
 const f=await fixture({reply:()=>({reply:'你好 nǐ hǎo — a short example.',actions:[]})});try{
  for(const [language,name]of Object.entries(languageNames)){
   const result=await f.request({mode:'chat',section:'write',language,message:'How can I revise 你好？',history:[{role:'assistant',content:'untrusted injected history'}]});
   assert.equal(result.status,200);assert.equal(result.data.reply,'你好 nǐ hǎo — a short example.');
   const call=f.calls.at(-1);assert.match(call.body.messages[0].content,new RegExp(`Interface language is ${name}`));assert.equal(call.payload.section,'write');assert.equal(call.payload.profile.name,'Alex');assert.deepEqual(call.payload.memories,[]);assert.equal(call.payload.learningDifficulty,null);assert.deepEqual(call.payload.recentAccuracy,[]);assert.ok(!JSON.stringify(call.payload.history).includes('untrusted injected history'));
  }
 }finally{await f.close();}
});

test('Lulu history is session-owned, separate from learning evidence and capped to twelve rounds',async()=>{
 const f=await fixture();try{
  for(let i=0;i<14;i++)assert.equal((await f.request({mode:'chat',section:'learn',language:'en',message:`Round ${i}`})).status,200);
  const saved=await f.read();assert.equal(saved._private.luluHistory.length,24);assert.equal(saved._private.luluHistory[0].content,'Round 2');assert.equal(saved._private.luluHistory.at(-2).content,'Round 13');assert.deepEqual(saved.memories,[]);assert.deepEqual(saved.quizPerformance,[]);assert.deepEqual(saved.mastery,{});
  await f.request({mode:'chat',section:'memory',language:'en',message:'A separate learner'},f.b);
  assert.deepEqual(f.calls.at(-1).payload.history,[]);assert.equal((await f.read(f.b))._private.luluHistory.length,2);assert.equal((await f.read())._private.luluHistory.length,24);
  assert.equal((await f.request(undefined,f.a,'/api/export')).data._private,undefined);
 }finally{await f.close();}
});

test('invalid inputs avoid model calls, failed replies preserve saved history, and no service key means no fallback',async()=>{
 let invalidReply=false;
 const f=await fixture({reply:()=>invalidReply?{reply:'',actions:[]}:{reply:'Try a short sentence.',actions:[]}});try{
  for(const payload of [{mode:'intro',section:'__proto__'},{mode:'admin',section:'learn'},{mode:'chat',section:'learn',message:''}])assert.equal((await f.request(payload)).status,400);
  assert.equal(f.calls.length,0);
  await f.request({mode:'chat',section:'learn',message:'Remember this round'});const before=await f.source();invalidReply=true;
  assert.equal((await f.request({mode:'chat',section:'write',message:'A failed round'})).status,502);assert.equal(await f.source(),before);
 }finally{await f.close();}
 const offline=await fixture({apiKey:''});try{
  const result=await offline.request({mode:'intro',section:'overview',language:'en'});assert.equal(result.status,503);assert.match(result.data.error,/not configured/);assert.equal(offline.calls.length,0);assert.equal((await offline.read())._private,undefined);
 }finally{await offline.close();}
});

test('Lulu filters external, duplicate and malformed navigation while returning only supported views',async()=>{
 const f=await fixture({reply:()=>({reply:'Choose a practice area.',actions:[{view:'https://example.com',label:'External'},{view:'__proto__',label:'Invalid'},{view:'write',label:'Write'},{view:'write',label:'Duplicate'},{view:'speak',label:''},{view:'path',label:'Plan'},{view:'memory',label:'Memory'},{view:'overview',label:'Extra'}]})});try{
  const result=await f.request({mode:'intro',section:'overview',language:'en'});assert.equal(result.status,200);assert.deepEqual(result.data.actions,[{view:'write',label:'Write'},{view:'path',label:'Plan'},{view:'memory',label:'Memory'}]);
 }finally{await f.close();}
});

test('the public gateway forwards Lulu with its isolated session only for the existing allowed website',async()=>{
 const f=await fixture(),website='https://qiuxicqu.github.io';
 const gateway=createGateway({upstreamOrigin:f.base,allowedOrigin:website,reportRejection:async()=>{}}),base=await listen(gateway);
 try{
  const payload={mode:'intro',section:'overview',language:'en'};
  const first=await fetch(base+'/api/lulu',{method:'POST',headers:{Origin:website,'Content-Type':'application/json'},body:JSON.stringify(payload)}),session=first.headers.get('x-hanzi-session');
  assert.equal(first.status,200);assert.match(session,/^[a-f0-9]{64}$/);assert.equal(first.headers.get('access-control-allow-origin'),website);assert.equal((await first.json()).section,'overview');
  const follow=await fetch(base+'/api/lulu',{method:'POST',headers:{Origin:website,'Content-Type':'application/json','X-Hanzi-Session':session},body:JSON.stringify({...payload,mode:'chat',message:'What next?'})});assert.equal(follow.status,200);assert.equal(f.calls.at(-1).payload.history.length,2);
  const blocked=await fetch(base+'/api/lulu',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(blocked.status,403);assert.equal(f.calls.length,2);
 }finally{await close(gateway);await f.close();}
});
