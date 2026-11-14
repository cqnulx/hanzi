import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequestMonitor} from '../request-monitor.mjs';

test('a successful later write cannot hide a lost request record',async()=>{
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'hanzi-log-write-'));
  const directory=path.join(temporary,'blocked');
  const monitor=createRequestMonitor({directory});
  try {
    await fs.writeFile(directory,'Directory is temporarily unavailable.');
    const lost=monitor.begin('POST','/api/chat');monitor.capture(lost,{message:'First'});await monitor.finish(lost,200,{reply:'Response'});
    await fs.unlink(directory);
    const saved=monitor.begin('POST','/api/chat');monitor.capture(saved,{message:'Second'});await monitor.finish(saved,200,{reply:'Saved response'});
    const page=await monitor.query(new URLSearchParams());
    assert.equal(page.records.length,1);assert.equal(page.records[0].inputPreview,'Second');
    assert.equal(page.logging.ok,false);assert.match(page.logging.error,/1 条请求记录未能写入/);
  }finally {await fs.rm(temporary,{recursive:true,force:true});}
});
