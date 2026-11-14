import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {createGateway} from '../gateway.mjs';

const website='https://qiuxicqu.github.io';
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return`http://127.0.0.1:${server.address().port}`;}
async function close(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}
async function fixture(){
 const sessions=new Map(),calls=[];
 const upstream=http.createServer(async(req,res)=>{
  const parts=[];for await(const chunk of req)parts.push(chunk);calls.push({url:req.url,headers:req.headers,body:Buffer.concat(parts).toString()});
  if(req.url==='/api/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,configured:true}));return;}
  let session=(req.headers.cookie||'').match(/^hanzi_session=([a-f0-9]{64})$/)?.[1];
  if(!sessions.has(session)){session=randomBytes(32).toString('hex');sessions.set(session,{name:'Learner'});res.setHeader('Set-Cookie',`hanzi_session=${session}; Path=/; HttpOnly; SameSite=Strict`);}
  if(req.url==='/api/profile'&&req.method==='PUT')sessions.get(session).name=JSON.parse(Buffer.concat(parts)).name;
  if(req.url==='/api/chat'){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'The learning service is temporarily unavailable.'}));return;}
  if(req.url==='/api/export')res.setHeader('Content-Disposition','attachment; filename="hanzi-learning-data.json"');
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({profile:sessions.get(session)}));
 });
 const upstreamOrigin=await listen(upstream),gateway=createGateway({upstreamOrigin,allowedOrigin:website,reportRejection:async()=>{}}),base=await listen(gateway);
 const request=(route='/api/state',options={})=>fetch(base+route,{...options,headers:{Origin:website,'Content-Type':'application/json',...options.headers}});
 return{base,upstream,gateway,calls,request,close:async()=>{await close(gateway);await close(upstream);}};
}

test('gateway permits exact website preflight and health while blocking other origins and private paths',async()=>{
 const f=await fixture();try{
  const preflight=await f.request('/api/state',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'content-type,x-hanzi-session'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),website);assert.equal(preflight.headers.get('access-control-allow-credentials'),null);assert.match(preflight.headers.get('access-control-allow-headers'),/X-Hanzi-Session/);
  assert.equal((await fetch(f.base+'/api/health')).status,200);
  const forbidden=await f.request('/api/state',{headers:{Origin:'https://evil.example'}});assert.equal(forbidden.status,403);assert.equal(forbidden.headers.get('access-control-allow-origin'),null);
  assert.equal((await f.request('/api/state',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}})).status,403);
  for(const route of ['/.env','/server.mjs','/data/private.json','/','/api/state?secret=x'])assert.equal((await f.request(route)).status,404,route);
  assert.equal(f.calls.length,1);
 }finally{await f.close();}
});

test('gateway browser session header isolates data without cross-site cookies or a site password',async()=>{
 const f=await fixture();try{
  const first=await f.request(),session=first.headers.get('x-hanzi-session');assert.match(session,/^[a-f0-9]{64}$/);assert.equal(first.headers.get('set-cookie'),null);assert.match(first.headers.get('access-control-expose-headers'),/X-Hanzi-Session/);
  await f.request('/api/profile',{method:'PUT',headers:{'X-Hanzi-Session':session,'Sec-Fetch-Site':'cross-site',Authorization:'discard-me'},body:JSON.stringify({name:'Anna'})});
  const own=await f.request('/api/state',{headers:{'X-Hanzi-Session':session}});assert.equal((await own.json()).profile.name,'Anna');
  const stranger=await f.request('/api/state',{headers:{Cookie:`hanzi_session=${session}`}});assert.notEqual(stranger.headers.get('x-hanzi-session'),session);assert.equal((await stranger.json()).profile.name,'Learner');
  assert.equal(f.calls[1].headers.origin,undefined);assert.equal(f.calls[1].headers.authorization,undefined);assert.notEqual(f.calls[1].headers['sec-fetch-site'],'cross-site');assert.equal(f.calls[1].headers.cookie,`hanzi_session=${session}`);
  const invalid=await f.request('/api/state',{headers:{'X-Hanzi-Session':'invalid'}});assert.equal(invalid.status,400);assert.equal(invalid.headers.get('access-control-allow-origin'),website);
  const exported=await f.request('/api/export',{headers:{'X-Hanzi-Session':session}});assert.match(exported.headers.get('content-disposition'),/attachment/);assert.equal((await exported.json()).profile.name,'Anna');
 }finally{await f.close();}
});

test('gateway bounds body size, preserves backend errors and refuses redirects',async()=>{
 const f=await fixture();try{
  const huge=await f.request('/api/chat',{method:'POST',body:'x'.repeat(33000)});assert.equal(huge.status,413);assert.equal(f.calls.length,0);
  const unavailable=await f.request('/api/chat',{method:'POST',body:JSON.stringify({message:'Hello'})});assert.equal(unavailable.status,502);assert.match((await unavailable.json()).error,/temporarily unavailable/);assert.equal(unavailable.headers.get('access-control-allow-origin'),website);
 }finally{await f.close();}
 const gateway=createGateway({fetchImpl:async()=>new Response(null,{status:302,headers:{Location:'https://evil.example'}}),reportRejection:async()=>{}}),base=await listen(gateway);
 try{const result=await fetch(base+'/api/state',{headers:{Origin:website}});assert.equal(result.status,502);assert.match((await result.json()).error,/unexpected redirect/);assert.equal(result.headers.get('location'),null);}finally{await close(gateway);}
});

test('gateway does not accept non-local upstream destinations',()=>{
 assert.throws(()=>createGateway({upstreamOrigin:'https://example.com'}),/local HTTP/);
 assert.throws(()=>createGateway({allowedOrigin:'https://qiuxicqu.github.io/hanzi/'}),/origin only/);
});

test('learning-hint localization is forwarded for the allowed website with its isolated session',async()=>{
 const f=await fixture();try{
  const first=await f.request(),session=first.headers.get('x-hanzi-session');
  const translated=await f.request('/api/localize-learning',{method:'POST',headers:{'X-Hanzi-Session':session},body:JSON.stringify({language:'ja'})});
  assert.equal(translated.status,200);
  assert.equal(f.calls.at(-1).url,'/api/localize-learning');
  assert.deepEqual(JSON.parse(f.calls.at(-1).body),{language:'ja'});
  assert.equal(f.calls.at(-1).headers.cookie,`hanzi_session=${session}`);
  assert.equal((await f.request('/api/localize-learning',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'})).status,403);
 }finally{await f.close();}
});

test('gateway reports its own teaching rejections with bounded input, excluding preflight and hostile traffic',async()=>{
 const reports=[],calls=[],session='a'.repeat(64);
 const gateway=createGateway({reportRejection:async record=>{reports.push(record);},fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({error:'Backend already recorded this error.'}),{status:400,headers:{'Content-Type':'application/json'}});}}),base=await listen(gateway);
 const request=(route,options={})=>fetch(base+route,{...options,headers:{Origin:website,'Content-Type':'application/json',...options.headers}});
 try{
  const huge=await request('/api/chat',{method:'POST',headers:{'X-Hanzi-Session':session},body:JSON.stringify({message:'文'.repeat(12000)})});
  assert.equal(huge.status,413);assert.equal(calls.length,0);assert.equal(reports.length,1);
  assert.equal(reports[0].path,'/api/chat');assert.equal(reports[0].method,'POST');assert.equal(reports[0].status,413);assert.equal(reports[0].session,session);
  assert.ok(Number.isFinite(Date.parse(reports[0].startedAt)));assert.equal(reports[0].input.truncated,true);assert.equal(reports[0].input.body.length,4000);assert.match(reports[0].input.body,/文/);
  assert.deepEqual(reports[0].output,await huge.json());assert.ok(Buffer.byteLength(JSON.stringify(reports[0]))<32768);
  const invalid=await request('/api/chat',{method:'POST',headers:{'X-Hanzi-Session':'bad-session'},body:JSON.stringify({message:'Keep the rejected input.'})});
  assert.equal(invalid.status,400);assert.deepEqual(reports[1].input,{message:'Keep the rejected input.'});assert.equal(reports[1].session,undefined);assert.equal(calls.length,0);
  assert.equal((await request('/api/chat',{method:'POST',body:JSON.stringify({message:'Backend error'})})).status,400);assert.equal(reports.length,2);assert.equal(calls.length,1);
  await request('/api/chat',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization'}});
  await request('/api/chat',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'});
  await request('/api/monitor/requests');await request('/.env');
  assert.equal(reports.length,2);
 }finally{await close(gateway);}
});

test('gateway reports connection failures and keeps rejection responses when recording fails',async()=>{
 const reports=[];
 const gateway=createGateway({fetchImpl:async()=>{throw new TypeError('Private transport detail.');},reportRejection:async record=>{reports.push(record);}}),base=await listen(gateway);
 try{
  const response=await fetch(base+'/api/chat',{method:'POST',headers:{Origin:website,'Content-Type':'application/json'},body:JSON.stringify({message:'Submitted before the service disconnected.'})});
  assert.equal(response.status,502);assert.equal(reports.length,1);assert.equal(reports[0].status,502);assert.deepEqual(reports[0].input,{message:'Submitted before the service disconnected.'});assert.deepEqual(reports[0].output,await response.json());
 }finally{await close(gateway);}
 const originalError=console.error,messages=[];
 const failing=createGateway({reportRejection:async()=>{throw new Error('Secret private detail.');}}),fallback=await listen(failing);
 try{
  console.error=message=>messages.push(message);
  const response=await fetch(fallback+'/api/state',{headers:{Origin:website,'X-Hanzi-Session':'bad-session'}});
  assert.equal(response.status,400);assert.equal(messages.length,1);assert.doesNotMatch(messages[0],/Secret|bad-session/);
 }finally{console.error=originalError;await close(failing);}
});
