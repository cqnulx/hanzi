import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .+;\r?\n/gm,'').replace(/populateLanguageSelectors\(\);\r?\nobserveTranslations\(\);\r?\ninit\(\);\s*$/,'');
const state=(name='Saved learner',revision=0)=>({profile:{name,level:'HSK 2',dailyMinutes:15},customLessons:[],memories:[{id:'saved-memory'}],activities:[],plan:[],mastery:{},reviews:{},reflections:[],stats:{},learningDifficulty:revision?{revision}:null});
const response=(data,status=200,session='')=>({ok:status>=200&&status<300,status,headers:{get:name=>name==='X-Hanzi-Session'?session:''},json:async()=>data});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};

function fixture(fetchReply){
 const calls=[],events={window:new Map(),document:new Map()},nodes=new Map();let notice=null,htmlWrites=0;
 const node=()=>({value:'',checked:false,innerHTML:'',title:'',textContent:'',dataset:{},addEventListener(){},classList:{values:new Set(),toggle(name,on){if(on)this.values.add(name);else this.values.delete(name);},add(name){this.values.add(name);},remove(name){this.values.delete(name);},contains(name){return this.values.has(name);}}});
 const root=node(),status=node(),draft=node(),radio=node();draft.value='My unfinished Chinese paragraph.';radio.checked=true;root.html='Current working page';
 Object.defineProperty(root,'innerHTML',{get(){return this.html;},set(value){htmlWrites++;this.html=value;}});
 root.insertAdjacentHTML=()=>{notice={remove(){notice=null;}};};root.querySelectorAll=()=>[];
 nodes.set('#view-root',root);nodes.set('#api-status',status);nodes.set('#writing-text',draft);
 const document={visibilityState:'visible',querySelector(selector){if(selector==='.service-notice')return notice;if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},querySelectorAll(selector){return selector==='.service-notice'&&notice?[notice]:[];},addEventListener(name,handler){events.document.set(name,handler);}};
 const context=vm.createContext({document,window:{addEventListener(name,handler){events.window.set(name,handler);}},location:{hostname:'qiuxicqu.github.io',hash:'#write'},localStorage:{getItem:()=>null,setItem(){}},getLocalizedLessons:()=>[{id:'greetings',title:'Greetings',phrases:[],writingPrompt:{}}],getLanguage:()=>'en',languageInfo:()=>({locale:'en',name:'English'}),translateText:value=>value,normalizeLanguage:value=>value,API_BASE_URL:'https://learning.example',applyTranslations(){},Map,Set,Number,String,JSON,TypeError,Error,URL,console,setTimeout,clearTimeout,AbortController,queueMicrotask,fetch:async(url,options)=>{const route=new URL(url).pathname;calls.push({route,method:options.method||'GET'});return fetchReply(route,options);}});
 vm.runInContext(source,context);
 vm.runInContext(`globalThis.observed={renders:0,routes:0,localizations:0};render=()=>{observed.renders++;};restoreRoute=()=>{observed.routes++;};ensureLocalizedLearning=()=>{observed.localizations++;};`,context);
 const run=code=>vm.runInContext(code,context);
 return{calls,run,root,status,draft,radio,events,get htmlWrites(){return htmlWrites;},get notice(){return notice;},seed(value=state()){context.savedState=value;run(`app.state=savedState;app.view='write';app.lessonId='greetings';app.writingText='My unfinished Chinese paragraph.';app.serviceUnavailable=true;`);status.classList.add('offline');}};
}

test('a failed health check does not discard a successfully read bare profile or leave the service offline',async()=>{
 const saved=state();const f=fixture(async route=>{if(route==='/api/health')throw new TypeError('Temporary health connection failure');return response(saved);});
 await f.run('init()');
 assert.equal(f.run('app.state.profile.name'),'Saved learner');assert.equal(f.run('app.state.memories[0].id'),'saved-memory');assert.equal(f.run('app.serviceUnavailable'),false);assert.equal(f.status.classList.contains('connected'),true);assert.equal(f.status.classList.contains('offline'),false);assert.equal(f.run('observed.routes'),1);assert.equal(f.calls.filter(call=>call.route==='/api/state').length,1);
});

test('a fresh browser establishes its profile session before health and never adopts a health-only token',async()=>{
 const pending=deferred(),profileSession='a'.repeat(64),healthSession='b'.repeat(64);let healthHeaders;
 const f=fixture((route,options)=>{if(route==='/api/state')return pending.promise;healthHeaders=options.headers;return Promise.resolve(response({configured:true},200,healthSession));});
 const initializing=f.run('init()');assert.deepEqual(f.calls.map(call=>call.route),['/api/state'],'health cannot race the first profile request');
 pending.resolve(response(state(),200,profileSession));await initializing;
 assert.equal(healthHeaders['X-Hanzi-Session'],profileSession);assert.equal(f.run('remoteSession'),profileSession);assert.equal(f.run('app.state.profile.name'),'Saved learner');assert.equal(f.run('app.serviceUnavailable'),false);assert.equal(f.run('observed.routes'),1);
});

test('a later successful learning request clears offline notice and badge without replacing the draft or radio',async()=>{
 const f=fixture(async route=>{if(route==='/api/writing')throw new TypeError('Disconnected');return response({reply:'Try a short sentence.'});});f.seed();
 await assert.rejects(f.run(`api('/writing',{method:'POST',body:'{}'})`));assert.equal(f.run('app.serviceUnavailable'),true);assert.ok(f.notice);
 await f.run(`api('/chat',{method:'POST',body:'{}'})`);
 assert.equal(f.run('app.serviceUnavailable'),false);assert.equal(f.notice,null);assert.equal(f.status.classList.contains('offline'),false);assert.equal(f.status.classList.contains('connected'),true);assert.equal(f.draft.value,'My unfinished Chinese paragraph.');assert.equal(f.radio.checked,true);assert.equal(f.htmlWrites,0);assert.equal(f.calls.filter(call=>call.route==='/api/writing').length,1,'failed POST is never replayed');
});

test('online and visibility recovery share one read-only check and keep the current page and draft',async()=>{
 const pending=deferred();const f=fixture(route=>route==='/api/state'?pending.promise:Promise.resolve(response({configured:true})));f.seed();
 const online=f.events.window.get('online')(),again=f.events.window.get('online')(),visible=f.events.document.get('visibilitychange')();
 assert.equal(f.calls.filter(call=>call.route==='/api/state').length,1);assert.equal(f.calls.filter(call=>call.route==='/api/health').length,0,'health waits for the state session');assert.equal(f.calls.every(call=>call.method==='GET'),true);
 pending.resolve(response(state()));await Promise.all([online,again,visible]);
 assert.equal(f.calls.filter(call=>call.route==='/api/health').length,1);
 assert.equal(f.run('app.serviceUnavailable'),false);assert.equal(f.run('app.view'),'write');assert.equal(f.run('observed.routes'),0);assert.equal(f.run('observed.localizations'),0,'automatic recovery must not issue a localization POST');assert.equal(f.run('observed.renders'),1);assert.equal(f.htmlWrites,0);assert.equal(f.draft.value,'My unfinished Chinese paragraph.');assert.equal(f.radio.checked,true);
 assert.equal(f.events.window.get('online')(),undefined,'healthy pages do not start extra recovery checks');
});

test('state reads retry once for a network error, timeout or server failure, while a bad request is not retried',async()=>{
 for(const kind of ['network','timeout','server','bad-request','unauthorized']){
  let reads=0;
  const f=fixture(async route=>{if(route==='/api/health')return response({configured:true});reads++;if(reads===1){if(kind==='network')throw new TypeError('Network failure');if(kind==='timeout')throw Object.assign(new Error('Timeout'),{name:'TimeoutError'});return response({error:'Read failed'},kind==='server'?503:kind==='unauthorized'?401:400);}return response(state());});
  const terminal=['bad-request','unauthorized'].includes(kind);await f.run('init()');assert.equal(reads,terminal?1:2);assert.equal(f.run('app.serviceUnavailable'),terminal);
 }
});

test('failed recovery preserves the prior profile, current route and unsent form contents',async()=>{
 const f=fixture(async route=>route==='/api/health'?response({configured:true}):response({error:'Temporary failure'},503));f.seed(state('Existing learner'));
 await f.events.window.get('online')();
 assert.equal(f.run('app.state.profile.name'),'Existing learner');assert.equal(f.run('app.serviceUnavailable'),true);assert.equal(f.run('app.view'),'write');assert.equal(f.run('app.writingText'),'My unfinished Chinese paragraph.');assert.equal(f.run('observed.routes'),0);assert.equal(f.run('observed.renders'),0);assert.equal(f.htmlWrites,0);assert.equal(f.draft.value,'My unfinished Chinese paragraph.');assert.equal(f.radio.checked,true);assert.equal(f.calls.filter(call=>call.route==='/api/state').length,2);
});

test('an older successful request cannot clear the offline state established by a newer connection failure',async()=>{
 const older=deferred();const f=fixture(route=>route==='/api/lesson'?older.promise:Promise.reject(new TypeError('Newer connection failure')));f.seed();
 const slow=f.run(`api('/lesson',{method:'POST',body:'{}'})`);await assert.rejects(f.run(`api('/chat',{method:'POST',body:'{}'})`));
 older.resolve(response({lesson:{title:'An earlier response'}}));await slow;
 assert.equal(f.run('app.serviceUnavailable'),true);assert.equal(f.status.classList.contains('offline'),true);
});

test('bare state recovery respects difficulty revision and request session guards, while explicit reset can lower revision',async()=>{
 const older=deferred();let useDeferred=false;const f=fixture(()=>useDeferred?older.promise:Promise.resolve(response(state('Old profile',1))));f.seed(state('Current learner',3));
 await f.run(`api('/state',{skipLocalization:true})`);assert.equal(f.run('app.state.profile.name'),'Current learner');assert.equal(f.run('app.serviceUnavailable'),true);
 useDeferred=true;const request=f.run(`api('/state',{skipLocalization:true})`);f.run(`learningRevision++;`);older.resolve(response(state('Stale generation',4)));await request;
 assert.equal(f.run('app.state.profile.name'),'Current learner');assert.equal(f.run('app.serviceUnavailable'),true);
 const sessionPending=deferred(),changedSession=fixture(()=>sessionPending.promise);changedSession.seed(state('Current session',3));changedSession.run(`remoteSession='a'.repeat(64);`);
 const sessionRequest=changedSession.run(`api('/state',{skipLocalization:true})`);changedSession.run(`remoteSession='b'.repeat(64);`);sessionPending.resolve(response(state('Obsolete session',4),200,'a'.repeat(64)));await sessionRequest;
 assert.equal(changedSession.run('app.state.profile.name'),'Current session');assert.equal(changedSession.run('app.serviceUnavailable'),true);
 const reset=fixture(async()=>response({state:state('Reset learner')}));reset.seed(state('Before reset',3));await reset.run(`api('/data',{method:'DELETE',skipLocalization:true})`);assert.equal(reset.run('difficultyRevision(app.state)'),0);assert.equal(reset.run('app.state.profile.name'),'Reset learner');assert.equal(reset.run('app.serviceUnavailable'),false);
});
