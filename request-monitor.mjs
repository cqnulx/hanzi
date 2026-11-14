import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-f0-9-]{36}$/;
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
const invalid = message => Object.assign(new Error(message), {status:400});
const validDate = value => {
  const parsed=new Date(value+'T12:00:00Z');
  if (!DAY.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==value) throw invalid('Invalid log date.');
  return value;
};

// No HTTP headers or usable browser session credentials enter the log.
export function createRequestMonitor({directory, secrets = []}) {
  const active = new Map();
  const indexes = new Map();
  let queue = Promise.resolve();
  let logError = null;
  let failedRecords = 0;
  const redactString = value => {
    let result = value;
    for (const secret of secrets.filter(Boolean)) result=result.split(secret).join('[已隐藏密钥]');
    return result.replace(/\bsk-[a-zA-Z0-9_-]{16,}/g,'[已隐藏密钥]');
  };
  const clean = value => {
    if (typeof value==='string') return redactString(value);
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[
      key, /^(?:authorization|cookie|set-cookie|api[_-]?key|deepseek[_-]?api[_-]?key|password|access[_-]?token|refresh[_-]?token|hanzi[_-]?session|x-hanzi-session)$/i.test(key) ? '[已隐藏]' : clean(item)
    ]));
    return value;
  };
  const preview = value => {
    if (value===null || value===undefined) return '';
    if (typeof value==='string') return value.slice(0,260);
    const selected=value.message ?? value.text ?? value.feedback ?? value.reply ?? value.overallFeedback ?? value.summary ?? value.error ?? value.lesson?.title ?? value.profileInsight;
    if (typeof selected==='string') return selected.slice(0,260);
    return JSON.stringify(value, (key,item)=>['state','model'].includes(key)?undefined:item).slice(0,260);
  };
  const summary = record => {
    const {input,output,...metadata}=record;
    return {...metadata,inputPreview:preview(input),outputPreview:preview(output)};
  };
  async function readIndex(date) {
    validDate(date);
    // Read only the small metadata index when polling; full content is loaded on demand.
    if (indexes.has(date)) return indexes.get(date);
    let records=[];
    try {
      const source=await fs.readFile(path.join(directory,date,'index.jsonl'),'utf8');
      records=source.split('\n').filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
    } catch(error) {if (error.code!=='ENOENT') throw error;}
    if (indexes.size>=3) indexes.delete(indexes.keys().next().value);
    indexes.set(date,records);
    return records;
  }
  function begin(method,route) {
    const trace={id:randomUUID(),startedAt:new Date().toISOString(),session:'unknown',learner:'',method,path:route,kind:route.split('/')[2]||'other',input:null};
    active.set(trace.id,trace);
    return trace;
  }
  function identify(trace,id,learner) {
    if (!trace) return;
    trace.session=createHash('sha256').update(id).digest('hex').slice(0,16);
    trace.learner=clean(String(learner||''));
  }
  function capture(trace,input) {if(trace) trace.input=clean(input);}
  function finish(trace,status,output) {
    if (!trace || trace.finishing) return trace?.finishing || Promise.resolve();
    const finishedAt=new Date().toISOString();
    const record=clean({...trace,finishedAt,durationMs:Date.parse(finishedAt)-Date.parse(trace.startedAt),status,output});
    active.delete(trace.id);
    const date=localDate(new Date(trace.startedAt));
    const task=queue.then(async()=>{
      const dayDirectory=path.join(directory,date);
      await fs.mkdir(dayDirectory,{recursive:true});
      await fs.writeFile(path.join(dayDirectory,record.id+'.json'),JSON.stringify(record),{mode:0o600});
      await fs.appendFile(path.join(dayDirectory,'index.jsonl'),JSON.stringify(summary(record))+'\n',{mode:0o600});
      indexes.get(date)?.push(summary(record));
    }).catch(()=>{
      failedRecords++;
      logError=`有 ${failedRecords} 条请求记录未能写入；后续成功记录不会消除此告警。请检查本机 data/request-logs 目录及磁盘空间。`;
      console.error(logError);
    });
    queue=task;
    trace.finishing=task;
    return task;
  }
  async function query(parameters) {
    const date=validDate(parameters.get('date')||localDate());
    // Serialize index loading with appends so a refresh cannot cache a partially written day.
    const reading=queue.then(async()=>[...await readIndex(date)]);
    queue=reading.then(()=>{},()=>{});
    const source=await reading;
    const session=(parameters.get('session')||'').toLowerCase().slice(0,80);
    const kind=(parameters.get('kind')||'').slice(0,40);
    const query=(parameters.get('q')||'').toLowerCase().slice(0,200);
    const matches=record=>(!session||(record.session+' '+record.learner).toLowerCase().includes(session))&&(!kind||record.kind===kind)&&(!query||JSON.stringify(record).toLowerCase().includes(query));
    const limit=Math.max(1,Math.min(40,Number(parameters.get('limit'))||40));
    const before=parameters.get('before');
    let end=source.length;
    if(before){const position=source.findIndex(record=>record.id===before);if(position<0)throw invalid('Unknown page cursor.');end=position;}
    const selected=[];
    for(let i=end-1;i>=0;i--) {if(matches(source[i]))selected.push(source[i]);if(selected.length>limit)break;}
    const more=selected.length>limit;
    const records=selected.slice(0,limit);
    return {records,active:[...active.values()].filter(record=>localDate(new Date(record.startedAt))===date).map(summary).filter(matches),nextBefore:more?records.at(-1).id:null,total:source.length,logging:{ok:!logError,error:logError},date};
  }
  async function getRecord(date,id) {
    validDate(date);
    if(!ID.test(id))throw invalid('Invalid request identifier.');
    try{return JSON.parse(await fs.readFile(path.join(directory,date,id+'.json'),'utf8'));}
    catch(error){if(error.code==='ENOENT')throw Object.assign(new Error('Request record not found.'),{status:404});throw error;}
  }
  async function dates() {
    await queue;
    let entries=[];
    try{entries=await fs.readdir(directory,{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')throw error;}
    return [...new Set([localDate(),...entries.filter(item=>item.isDirectory()&&DAY.test(item.name)).map(item=>item.name)])].sort().reverse();
  }
  async function exportDay(date,res) {
    validDate(date);
    await queue;
    const indexFile=path.join(directory,date,'index.jsonl');
    try{await fs.access(indexFile);}catch(error){if(error.code!=='ENOENT')throw error;}
    res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':`attachment; filename="hanzi-requests-${date}.jsonl"`});
    let reader;
    try {
      reader=createInterface({input:createReadStream(indexFile),crlfDelay:Infinity});
      for await(const line of reader) {
        if(res.destroyed)break;
        if(!line.trim())continue;
        const metadata=JSON.parse(line);
        const record=await getRecord(date,metadata.id);
        if(!res.write(JSON.stringify(record)+'\n'))await new Promise(resolve=>{res.once('drain',resolve);res.once('close',resolve);});
      }
      res.end();
    } catch(error) {if(error.code==='ENOENT')res.end();else res.destroy(error);}
    finally {reader?.close();}
  }
  return {begin,identify,capture,finish,query,getRecord,dates,exportDay,flush:()=>queue};
}
