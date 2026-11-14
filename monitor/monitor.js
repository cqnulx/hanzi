const $=id=>document.getElementById(id);
const kinds={chat:'伴学对话',writing:'交互写作',speaking:'口语练习',lesson:'课程生成',exercises:'习题生成',quiz:'习题批改',plan:'学习计划',profile:'学习画像',memory:'长期记忆',activity:'学习活动',feedback:'学习反思',state:'学习档案',export:'数据导出',data:'清空档案'};
const format=value=>value===undefined?'无内容':typeof value==='string'?value:JSON.stringify(value,(key,item)=>/^(.*model|provider|apiKey|authorization)$/i.test(key)?undefined:item,2);
const clock=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||'—'):date.toLocaleString('zh-CN',{hour12:false});};
const today=new Date();$('date').value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
let records=[],active=[],selected=null,nextBefore=null,total=0,busy=false,queued=false,revision=0,detailRevision=0,timer=null;
let filters=readFilters();
function readFilters(){return{date:$('date').value,session:$('session').value.trim(),kind:$('kind').value,q:$('query').value.trim()};}
function query(values){const params=new URLSearchParams();for(const [key,value]of Object.entries(values))if(value!==undefined&&value!==null&&value!=='')params.set(key,String(value));return params;}
function status(message,type=''){const element=$('connection');element.textContent=message;element.className=type;}
function schedule(){clearTimeout(timer);if($('auto-refresh').checked&&!document.hidden)timer=setTimeout(()=>load(),5000);}
function render(){
  const all=[...active.map(item=>({...item,pending:true})),...records];
  $('total').textContent=String(total);$('active-count').textContent=String(active.length);
  $('outcomes').textContent=`${records.filter(item=>item.status>=200&&item.status<400).length} / ${records.filter(item=>item.status>=400).length}`;
  $('sessions').textContent=String(new Set(all.map(item=>item.session).filter(Boolean)).size);$('shown').textContent=`已展示 ${all.length} 条`;
  const list=$('records');list.replaceChildren();
  if(!all.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='当前条件下暂无记录。请从任意电脑打开网站并提交一次对话或写作，再刷新此页。';list.append(empty);}
  for(const item of all){
    const button=document.createElement('button');button.type='button';button.className='request-row'+(selected?.id===item.id?' selected':'');button.dataset.id=item.id;
    const top=document.createElement('span');top.className='row-top';const label=document.createElement('span');label.className='row-label';label.textContent=kinds[item.kind]||item.kind||item.path;
    const badge=document.createElement('span');badge.className='badge'+(item.pending?' pending':item.status>=400?' failed':'');badge.textContent=item.pending?'处理中':`${item.status>=400?'失败':'完成'} · ${item.status}`;top.append(label,badge);
    const meta=document.createElement('span');meta.className='row-meta';const session=item.session?String(item.session).slice(0,12):'尚未分配';meta.textContent=`${clock(item.startedAt)} · ${item.learner||'未命名'} · 会话 ${session}`;
    const summary=document.createElement('span');summary.className='row-preview';summary.textContent=item.inputPreview||item.outputPreview||'无提交正文';button.append(top,meta,summary);
    button.addEventListener('click',()=>{selected=item;showDetail();if(!item.pending)loadDetail(item);for(const row of list.children)row.classList.toggle('selected',row.dataset.id===item.id);});list.append(button);
  }
  $('more').hidden=!nextBefore;$('more').disabled=busy;
  if(selected?.pending){const fresh=records.find(item=>item.id===selected.id);if(fresh){selected=fresh;showDetail();loadDetail(fresh);}}
}
function showDetail(){
  if(!selected)return;$('detail-empty').hidden=true;$('detail').hidden=false;$('copy').disabled=!selected.loaded;
  $('detail-title').textContent=kinds[selected.kind]||selected.kind||selected.path;
  const entries=[['记录编号',selected.id],['访问会话',selected.session||'尚未分配'],['档案姓名',selected.learner||'未命名'],['提交时间',clock(selected.startedAt)],['完成时间',selected.finishedAt?clock(selected.finishedAt):'正在处理'],['请求地址',`${selected.method||''} ${selected.path||''}`],['处理结果',selected.pending?'正在处理':`HTTP ${selected.status}`],['处理耗时',selected.durationMs===undefined?'尚未完成':`${(selected.durationMs/1000).toFixed(2)} 秒`]];
  const meta=$('detail-meta');meta.replaceChildren();for(const [name,value]of entries){const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=name;description.textContent=value;meta.append(term,description);}
  $('detail-input').textContent=selected.loaded?format(selected.input):selected.pending?`${selected.inputPreview||'无提交正文'}\n\n（当前为提交摘要，处理完成后可查看完整内容。）`:(selected.inputPreview||'正在读取完整提交内容……');
  $('detail-output').textContent=selected.pending?'请求正在处理，完成后会显示返回结果。':selected.loaded?format(selected.output):'正在读取完整返回结果……';
}
async function getJSON(url){const response=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error(`读取失败（HTTP ${response.status}）`);return response.json();}
async function loadDetail(item){
  const version=++detailRevision;
  try{const result=await getJSON('/api/monitor/request?'+query({date:filters.date,id:item.id}));if(version!==detailRevision||selected?.id!==item.id)return;selected={...result.record,pending:!result.record.finishedAt,loaded:true};showDetail();}
  catch(error){if(version===detailRevision&&selected?.id===item.id){$('detail-output').textContent=`无法读取完整详情：${error.message}。点击该记录可重试。`;}}
}
async function load(append=false){
  clearTimeout(timer);if(busy){queued=true;return;}busy=true;$('refresh').disabled=true;$('more').disabled=true;const version=revision;
  try{
    const data=await getJSON('/api/monitor/requests?'+query({...filters,limit:40,...(append&&nextBefore?{before:nextBefore}:{})}));
    if(version!==revision)return;
    const incoming=Array.isArray(data.records)?data.records:[];records=append?[...records,...incoming.filter(item=>!records.some(existing=>existing.id===item.id))]:incoming;active=Array.isArray(data.active)?data.active:[];nextBefore=data.nextBefore||null;total=data.total??records.length;
    $('export').href='/api/monitor/export?'+query({date:filters.date});render();
    if(data.logging?.ok===false)status(`记录保存出现问题：${data.logging.error||'请检查后端日志和磁盘空间。'}。学习请求仍可继续。`,'warning');
    else status(`已连接本机后端 · 最近刷新 ${new Date().toLocaleTimeString('zh-CN',{hour12:false})} · 汇总所有访问者提交的请求`);
  }catch(error){if(version===revision)status(`无法读取记录：${error.message}。请确认本机后端正在运行。`,'error');}
  finally{busy=false;$('refresh').disabled=false;$('more').disabled=false;if(queued){queued=false;load();}else schedule();}
}
$('filters').addEventListener('submit',event=>{event.preventDefault();filters=readFilters();revision++;detailRevision++;nextBefore=null;records=[];active=[];selected=null;$('detail').hidden=true;$('detail-empty').hidden=false;$('copy').disabled=true;load();});
$('refresh').addEventListener('click',()=>load());$('more').addEventListener('click',()=>load(true));$('auto-refresh').addEventListener('change',schedule);
$('copy').addEventListener('click',async()=>{if(!selected?.loaded)return;try{const{loaded,pending,...record}=selected;await navigator.clipboard.writeText(format(record));$('copy').textContent='已复制';setTimeout(()=>{$('copy').textContent='复制详情';},1500);}catch{status('复制失败，可在详情区域选择文字后复制。','warning');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else load();});
try{const result=await getJSON('/api/monitor/dates');const dates=$('available-dates');for(const date of result.dates||[]){const option=document.createElement('option');option.value=date;dates.append(option);}}catch{/* Main request displays connection errors. */}
load();
