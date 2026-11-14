import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from '../server.mjs';
import {createGateway} from '../gateway.mjs';
import {localDate} from '../request-monitor.mjs';

const website='https://qiuxicqu.github.io';
const listen=async server=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;};
const close=server=>new Promise(resolve=>server.close(resolve));
async function fixture({fetchImpl,apiKey='monitor-private-key'}={}) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hanzi-monitor-'));
  const options={apiKey,storageDir:directory,fetchImpl:fetchImpl||(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reply:'你好！Hello.',memoryUpdates:[]})}}]})))};
  const server=createServer(options),base=await listen(server);
  const gateway=createGateway({upstreamOrigin:base}),remote=await listen(gateway);
  const request=(route,body,session)=>fetch(remote+route,{method:body===undefined?'GET':'POST',headers:{Origin:website,'Content-Type':'application/json',...(session?{'X-Hanzi-Session':session}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const logs=async query=>(await fetch(base+'/api/monitor/requests'+(query?'?'+query:''))).json();
  const detail=async row=>(await fetch(base+`/api/monitor/request?date=${localDate(new Date(row.startedAt))}&id=${row.id}`)).json();
  return {server,base,remote,directory,request,logs,detail,close:async()=>{await close(gateway);await close(server);await server.requestMonitor.flush();await fs.rm(directory,{recursive:true,force:true});}};
}

test('central monitor sees independent remote browser inputs and exact replies, including errors',async()=>{
  const f=await fixture();
  try {
    const first=await f.request('/api/chat',{message:'First remote browser',language:'en'});
    const a=first.headers.get('x-hanzi-session'),firstOutput=await first.json();
    const second=await f.request('/api/chat',{message:'第二个远程浏览器',language:'zh'});
    const b=second.headers.get('x-hanzi-session');await second.json();
    await f.request('/api/chat',{message:''},a);
    const page=await f.logs('kind=chat');
    assert.equal(page.records.length,3);assert.equal(page.total,3);assert.equal(page.logging.ok,true);
    const firstRow=page.records.find(row=>row.inputPreview==='First remote browser');
    const secondRow=page.records.find(row=>row.inputPreview==='第二个远程浏览器');
    assert.notEqual(firstRow.session,secondRow.session);assert.notEqual(firstRow.session,a);assert.notEqual(secondRow.session,b);
    assert.equal(firstRow.input,undefined);assert.equal(firstRow.output,undefined);
    const {record}=await f.detail(firstRow);
    assert.deepEqual(record.input,{message:'First remote browser',language:'en'});
    assert.deepEqual(record.output,firstOutput);assert.equal(record.status,200);assert.ok(record.durationMs>=0);
    assert.equal(page.records[0].status,400);assert.match((await f.detail(page.records[0])).record.output.error,/required/);
    const filtered=await f.logs(`session=${secondRow.session}`);assert.equal(filtered.records.length,1);
    const top=await f.logs('limit=1');assert.equal(top.records.length,1);assert.ok(top.nextBefore);
    const next=await f.logs('limit=1&before='+top.nextBefore);assert.notEqual(next.records[0].id,top.records[0].id);
    const exported=await fetch(f.base+`/api/monitor/export?date=${page.date}`);
    const lines=(await exported.text()).trim().split('\n').map(line=>JSON.parse(line));assert.equal(lines.length,3);
    assert.deepEqual(lines.find(row=>row.id===firstRow.id).output,firstOutput);
    const disk=JSON.parse(await fs.readFile(path.join(f.directory,'request-logs',page.date,firstRow.id+'.json'),'utf8'));assert.deepEqual(disk,record);
  } finally {await f.close();}
});

test('monitor content stays local and cannot be loaded through gateway, hostile origins or private paths',async()=>{
  const f=await fixture();
  try {
    for(const route of ['/monitor','/monitor/monitor.js','/api/monitor/requests','/api/monitor/dates','/api/monitor/request','/api/monitor/export']) {
      assert.equal((await f.request(route)).status,404,route);
      assert.equal((await fetch(f.base+route,{headers:{Origin:'https://evil.example'}})).status,403,route);
      assert.equal((await fetch(f.base+route,{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403,route);
    }
    const page=await fetch(f.base+'/monitor');assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    assert.equal((await fetch(f.base+'/monitor/request-monitor.mjs')).status,404);
    assert.equal((await fetch(f.base+'/data/request-logs/index.jsonl')).status,404);
    assert.equal((await fetch(f.base+'/api/monitor/requests?date=2026-13-01')).status,400);
    assert.equal((await fetch(f.base+'/api/monitor/request?date=2026-11-14&id=../../.env')).status,400);
    assert.equal((await f.logs()).total,0); // Reading the monitor never creates more records.
  } finally {await f.close();}
});

test('recording redacts credentials and persists across backend restarts',async()=>{
  const apiKey='monitor-private-key',pastedKey='sk-'+'1234567890abcdef1234567890abcdef';
  const f=await fixture({apiKey,fetchImpl:async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reply:'Secret: '+apiKey,memoryUpdates:[]})}}]}))});
  try {
    await f.request('/api/chat',{message:'Pasted '+pastedKey,password:'do-not-save',api_key:apiKey});
    const page=await f.logs(),row=page.records[0];
    const {record}=await f.detail(row),serialized=JSON.stringify(record);
    assert.equal(serialized.includes(apiKey),false);assert.equal(serialized.includes(pastedKey),false);assert.equal(serialized.includes('do-not-save'),false);
    assert.equal(record.input.password,'[已隐藏]');assert.match(record.output.reply,/已隐藏密钥/);
    const restarted=createServer({storageDir:f.directory,apiKey:''}),newBase=await listen(restarted);
    try {
      const resumed=await (await fetch(newBase+'/api/monitor/requests')).json();assert.equal(resumed.records[0].id,row.id);
      const dates=await (await fetch(newBase+'/api/monitor/dates')).json();assert.ok(dates.dates.includes(page.date));
    } finally {await close(restarted);}
  } finally {await f.close();}
});

test('pending remote requests are visible before a reply, then turn into completed records',async()=>{
  let release,started;
  const blocked=new Promise(resolve=>{release=resolve;}),called=new Promise(resolve=>{started=resolve;});
  const f=await fixture({fetchImpl:async()=>{started();await blocked;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reply:'Finished.',memoryUpdates:[]})}}]}));}});
  let pending;
  try {
    pending=f.request('/api/chat',{message:'Waiting for feedback'});await called;
    const running=await f.logs();assert.equal(running.active.length,1);assert.equal(running.records.length,0);assert.equal(running.active[0].inputPreview,'Waiting for feedback');
    release();await pending;
    const complete=await f.logs();assert.equal(complete.active.length,0);assert.equal(complete.records[0].status,200);
  } finally {release();if(pending)await pending;await f.close();}
});

test('gateway rejections join the local monitor without duplicating backend errors or exposing sessions',async()=>{
  const f=await fixture();
  try {
    const first=await f.request('/api/state'),session=first.headers.get('x-hanzi-session');await first.json();
    const body=JSON.stringify({message:'Remote oversized writing: '+'文'.repeat(12000)});
    const rejected=await fetch(f.remote+'/api/writing',{method:'POST',headers:{Origin:website,'Content-Type':'application/json','X-Hanzi-Session':session},body});
    const output=await rejected.json();assert.equal(rejected.status,413);
    const page=await f.logs('kind=writing');assert.equal(page.records.length,1);assert.equal(page.logging.ok,true);
    const {record}=await f.detail(page.records[0]);
    assert.equal(record.status,413);assert.equal(record.method,'POST');assert.equal(record.path,'/api/writing');assert.equal(record.input.truncated,true);assert.equal(record.input.body,body.slice(0,4000));assert.deepEqual(record.output,output);
    assert.match(record.session,/^[a-f0-9]{16}$/);assert.equal(JSON.stringify(record).includes(session),false);
    await f.request('/api/chat',{message:''},session);
    assert.equal((await f.logs('kind=chat')).records.length,1);
    const hostile=await fetch(f.remote+'/api/writing',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(hostile.status,403);
    assert.equal((await f.logs('kind=writing')).records.length,1);
    assert.equal((await f.request('/internal/monitor/rejected',{path:'/api/chat',method:'POST',status:400})).status,404);
    assert.equal((await fetch(f.base+'/internal/monitor/rejected',{method:'POST',headers:{Origin:website,'Content-Type':'application/json'},body:JSON.stringify({path:'/api/chat',method:'POST',status:400})})).status,403);
  } finally {await f.close();}
});
