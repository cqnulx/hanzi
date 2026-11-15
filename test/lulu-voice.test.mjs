import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createLuluVoice} from '../lulu-voice.mjs';
import {createServer} from '../server.mjs';
import {createGateway} from '../gateway.mjs';
import {splitLuluSpeech} from '../public/lulu-speech.js';

const wav=Buffer.alloc(64);wav.write('RIFF');wav.write('WAVE',8);
const reply='你好，我是噜噜。';
const history=[{role:'assistant',content:reply,language:'zh'}];
const recording=()=>new Response(wav,{headers:{'Content-Type':'audio/wav'}});
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return`http://127.0.0.1:${server.address().port}`;}
async function close(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}

test('reference synthesis only accepts this session’s generated reply and a loopback destination',async()=>{
 let calls=0;
 const voice=createLuluVoice({fetchImpl:async(url,options)=>{calls++;assert.equal(String(url),'http://127.0.0.1:4187/synthesize');assert.deepEqual(JSON.parse(options.body),{text:reply,language:'zh'});return recording();}});
 const result=await voice({text:reply,language:'zh'},history);
 assert.equal(result.voice,'reference');assert.deepEqual(Buffer.from(result.audio.data,'base64'),wav);assert.equal(result.bytes,64);
 for(const input of [{text:'arbitrary text',language:'zh'},{text:reply,language:'en'},{text:reply,language:'xx'}])await assert.rejects(voice(input,history),error=>error.status===400);
 await assert.rejects(voice({text:reply,language:'zh'},[]),error=>error.status===400);
 assert.equal(calls,1);
 for(const origin of ['https://example.com','http://127.0.0.1:4187/private','http://user:secret@localhost:4187'])assert.throws(()=>createLuluVoice({origin}),/local HTTP/);
});

test('voice failures preserve readable replies and never return fake speech or provider diagnostics',async()=>{
 for(const fetchImpl of [async()=>{throw Error('private local path');},async()=>new Response('not ready',{status:503}),async()=>new Response('not audio'),async()=>new Response('not wav',{headers:{'Content-Type':'audio/wav'}}),async()=>new Response(null,{headers:{'Content-Type':'audio/wav','Content-Length':30*1024*1024}})]){
  await assert.rejects(createLuluVoice({fetchImpl})({text:reply,language:'zh'},history),error=>[502,503].includes(error.status)&&!error.message.includes('private local path'));
 }
});

test('only a trusted standard introduction history entry permits persistent voice caching',async()=>{
 const calls=[],voice=createLuluVoice({fetchImpl:async(_url,options)=>{calls.push(JSON.parse(options.body));return recording();}});
 const intro={role:'assistant',content:reply,language:'zh',mode:'intro'};
 await voice({text:reply,language:'zh',cache:'standard-intro'},[{...intro,mode:'chat'}]);
 assert.equal(calls.at(-1).cache,undefined,'the browser cannot turn a chat reply into a disk-cached introduction');
 await voice({text:reply,language:'zh'},[intro]);assert.equal(calls.at(-1).cache,'standard-intro');
 await voice({text:reply,language:'zh'},[intro,{...intro,mode:'chat'}]);
 assert.equal(calls.at(-1).cache,undefined,'the latest matching reply determines the trusted mode');
});

test('progressive speech sends only validated session reply segments and rejects arbitrary segment requests',async()=>{
 const full='你好，我是师小噜。这里可以查看你的学习进度和每日练习时间，还可以打开课程、写作和学习计划。我们可以先选一个小目标，一步一步练习中文。';
 const segments=splitLuluSpeech(full,'zh'),calls=[];
 assert.ok(segments.length>1);assert.ok(segments[0].length<=32);assert.equal(segments.join(''),full);
 const voice=createLuluVoice({fetchImpl:async(url,options)=>{calls.push(JSON.parse(options.body));return recording();}});
 for(let index=0;index<segments.length;index++){
  const result=await voice({text:full,language:'zh',segmentIndex:index},[{role:'assistant',content:full,language:'zh'}]);
  assert.equal(result.segmentIndex,index);assert.equal(result.segmentCount,segments.length);assert.equal(calls.at(-1).text,segments[index]);
 }
 for(const index of [-1,.5,segments.length,'0',null])await assert.rejects(voice({text:full,language:'zh',segmentIndex:index},[{role:'assistant',content:full,language:'zh'}]),error=>error.status===400);
 await assert.rejects(voice({text:segments[0],language:'zh',segmentIndex:0},[{role:'assistant',content:full,language:'zh'}]),error=>error.status===400);
 assert.equal(calls.length,segments.length);
 for(const language of ['en','es','fr','de','ja','ko']){
  const text=language==='ja'?'こんにちは。中国語の練習を一緒に始めましょう。'.repeat(8):language==='ko'?'안녕하세요. 중국어 공부를 함께 시작해요. '.repeat(8):'Let us start with one short sentence. Then we can practise writing and look at your learning plan together. '.repeat(4);
  const parts=splitLuluSpeech(text,language);assert.ok(parts.length>1);assert.equal(parts.join('').replace(/\s/g,''),text.replace(/\s/g,''));
 }
});

test('public voice playback remains session bound and logs text plus audio metadata without recording bytes',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hanzi-voice-'));
 let synthesisCalls=0;
 const server=createServer({storageDir:directory,apiKey:'test-only',fetchImpl:async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reply,actions:[]})}}]})),voiceFetchImpl:async()=>{synthesisCalls++;return recording();}});
 const upstream=await listen(server),gateway=createGateway({upstreamOrigin:upstream,reportRejection:async()=>{}}),base=await listen(gateway);
 const request=(route,payload,session)=>fetch(base+route,{method:'POST',headers:{Origin:'https://qiuxicqu.github.io','Content-Type':'application/json',...(session?{'X-Hanzi-Session':session}:{})},body:JSON.stringify(payload)});
 try{
  const intro=await request('/api/lulu',{mode:'intro',section:'overview',language:'zh'}),session=intro.headers.get('x-hanzi-session');assert.equal(intro.status,200);await intro.json();
  const voice=await request('/api/lulu/voice',{text:reply,language:'zh'},session);assert.equal(voice.status,200);assert.equal((await voice.json()).voice,'reference');
  assert.equal((await request('/api/lulu/voice',{text:reply,language:'zh'})).status,400);assert.equal(synthesisCalls,1);
  const dates=await fs.readdir(path.join(directory,'request-logs'));const files=await fs.readdir(path.join(directory,'request-logs',dates[0]));
  const records=await Promise.all(files.filter(file=>file.endsWith('.json')).map(async file=>JSON.parse(await fs.readFile(path.join(directory,'request-logs',dates[0],file),'utf8'))));
  const record=records.find(item=>item.path==='/api/lulu/voice'&&item.status===200);assert.equal(record.input.text,reply);assert.equal(record.output.text,reply);assert.deepEqual(record.output.audio,{mime:'audio/wav',bytes:64});assert.ok(!JSON.stringify(record).includes(wav.toString('base64')));
 }finally{await close(gateway);await close(server);await fs.rm(directory,{recursive:true,force:true});}
});
