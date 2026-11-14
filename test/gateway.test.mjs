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
 const upstreamOrigin=await listen(upstream),gateway=createGateway({upstreamOrigin,allowedOrigin:website}),base=await listen(gateway);
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
 const gateway=createGateway({fetchImpl:async()=>new Response(null,{status:302,headers:{Location:'https://evil.example'}})}),base=await listen(gateway);
 try{const result=await fetch(base+'/api/state',{headers:{Origin:website}});assert.equal(result.status,502);assert.match((await result.json()).error,/unexpected redirect/);assert.equal(result.headers.get('location'),null);}finally{await close(gateway);}
});

test('gateway does not accept non-local upstream destinations',()=>{
 assert.throws(()=>createGateway({upstreamOrigin:'https://example.com'}),/local HTTP/);
 assert.throws(()=>createGateway({allowedOrigin:'https://qiuxicqu.github.io/hanzi/'}),/origin only/);
});
