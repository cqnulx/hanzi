import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createLuluVoice} from '../lulu-voice.mjs';
import {createServer} from '../server.mjs';
import {createGateway} from '../gateway.mjs';

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
