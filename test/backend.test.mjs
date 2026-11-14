import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createServer } from '../server.mjs';

const lessons=[{id:'first-hello',title:'Hello',level:'HSK 1',duration:8,prerequisites:[],description:'Greeting and introductions',objectives:['Greet','Introduce yourself'],phrases:[{hanzi:'你好',pinyin:'nǐ hǎo',english:'Hello'}]},
 {id:'coffee-order',title:'Coffee',level:'HSK 2',duration:10,prerequisites:['first-hello'],description:'Order a coffee',objectives:['Request politely'],phrases:[]}];
const phrase={hanzi:'你好',pinyin:'nǐ hǎo',english:'Hello'};
function mockReply(payload,system){
 if(payload.task==='adaptation')return{action:'create-course',reason:'The catalogue does not yet cover Chinese cities.',level:'HSK 1',levelReason:'Stated HSK 2 has not yet been checked in practice; start with short foundation sentences.',selectedLessonId:null,course:{english:{title:'Discover Chinese cities',subtitle:'Ask about a city',description:'Talk about Beijing and Shanghai using short Chinese sentences.',objectives:['Name a city','Ask where someone lives']},chinese:{title:'认识中国城市',subtitle:'用简单中文聊城市',description:'围绕北京和上海，练习介绍城市和询问住在哪里。',objectives:['说出城市名称','询问对方住在哪里']},duration:5}};
 if(payload.task==='lesson')return{title:'A fresh hello',subtitle:'Start a real conversation',category:'Everyday Chinese',description:'Personalized greeting practice.',objectives:['Greet someone','Introduce yourself'],phrases:Array.from({length:4},()=>({...phrase})),vocabulary:Array.from({length:4},()=>({...phrase})),writingPrompt:{title:'Introduce yourself',instruction:'Write two sentences.',starter:'我叫',tip:'Use your own name.'},videoFrames:Array.from({length:4},()=>({...phrase,note:'Say hello first.'}))};
 if(payload.task==='exercises')return{questions:Array.from({length:4},(_,i)=>({question:`Question ${i+1}: Which is a greeting?`,options:['你好','谢谢','再见','请问'],answer:0,explanation:'你好 means hello.'}))};
 if(payload.task==='quiz')return{results:payload.checkedResults.map(r=>({questionId:r.questionId,explanation:'你好 is the correct greeting.',correct:!r.correct})),summary:'You used the greeting accurately; this is limited evidence.',nextStep:'Try a new self-introduction.',difficultyAdjustment:{action:'maintain',level:payload.difficultyEvidence?.currentLevel||'HSK 1',reason:'Keep practising with varied evidence.',focus:'Practise one short greeting.'}};
 if(payload.task==='plan')return payload.requiredLessonId?{plan:[{lessonId:payload.requiredLessonId,title:'Explore Chinese cities',reason:'Directly addresses your requested new topic.',duration:5,difficulty:'Beginner',type:'lesson'}],summary:'Start with a new course about Chinese cities.'}:{plan:[{lessonId:'first-hello',title:'Practise a greeting',reason:'Start with the foundation while evidence is limited.',duration:5,difficulty:'Beginner',type:'lesson'},{lessonId:'coffee-order',title:'Order politely',reason:'Apply the foundation to a useful goal.',duration:5,difficulty:'Gentle',type:'lesson'}],summary:'Two short steps chosen for your goal.'};
 if(payload.task==='speaking')return{feedback:'The recognized characters match the target; audio quality was not assessed.',nextStep:'Listen again, then try the same words in a question.'};
 if(payload.task==='profile')return{profileInsight:'Your stated goal suggests practical beginner conversations; ability is not yet assessed.',recommendedFocus:'Start with a short greeting check.'};
 if(payload.task==='activity')return{stepFeedback:'You reported exploring this lesson; completion alone does not prove mastery.',nextStep:'Try a fresh practice question.'};
 if(payload.task==='memory')return{category:'preference',reflection:'Short examples may make the next lesson easier to follow.'};
 if(system.includes('Chinese writing tutor'))return{overallFeedback:'Clear meaning; put the time before the action.',correctedText:'我昨天去书店。',corrections:[{original:'我去昨天书店。',suggestion:'我昨天去书店。',explanation:'Place 昨天 before the action.'},{original:'not in original',suggestion:'discard',explanation:'Invalid replacement'}],strengths:['Clear destination'],nextStep:'Write another sentence with 昨天.'};
 if(system.includes('Evaluate a Chinese learning'))return{attribution:'The teaching pace may be too fast, but evidence is limited.',action:'Use one short example.',category:'strategy',memoryUpdates:[]};
 return{reply:'你好！Nǐ hǎo! Let us try one short greeting.',memoryUpdates:[{text:'Learner wants to practise coffee conversations.',category:'goal',kind:'semantic',confidence:0.7}]};
}
async function fixture({apiKey='unit-test-key',reply=mockReply}={}){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hanzi-backend-'));
 const publicDir=path.join(directory,'public');await fs.mkdir(publicDir);await fs.writeFile(path.join(publicDir,'index.html'),'<!doctype html><title>Hanzi test</title>');await fs.writeFile(path.join(directory,'.env'),'DEEPSEEK_API_KEY=never-public');
 const calls=[];
 const server=createServer({apiKey,storageDir:path.join(directory,'data'),publicDir,lessons,fetchImpl:async(url,options)=>{
  assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(options.headers.Authorization,'Bearer unit-test-key');
  const body=JSON.parse(options.body),payload=JSON.parse(body.messages[1].content);calls.push({payload,body});
  const result=await reply(payload,body.messages[0].content);
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}),{status:200,headers:{'Content-Type':'application/json'}});
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const a={},b={};
 async function request(route,payload,jar=a,method=payload===undefined?'GET':'POST',extraHeaders={}){
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(jar.value?{Cookie:jar.value}:{}),...extraHeaders},body:payload===undefined?undefined:typeof payload==='string'?payload:JSON.stringify(payload)});
  if(response.headers.get('set-cookie'))jar.value=response.headers.get('set-cookie').split(';')[0];
  const type=response.headers.get('content-type')||'';
  return{status:response.status,data:type.includes('json')?await response.json():await response.text(),headers:response.headers};
 }
 return{directory,base,calls,a,b,request,close:async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}};
}
const answersFor=set=>set.questions.map((q,i)=>({questionId:q.id,answer:i===0?1:0}));

test('browser sessions isolate persisted learning and concurrent writes cannot lose events',async()=>{
 const f=await fixture();try{
  const a=await f.request('/api/state'),b=await f.request('/api/state',undefined,f.b);
  assert.equal(a.data.stats.sessions,0);assert.deepEqual(a.data.mastery,{});assert.notEqual(f.a.value,f.b.value);assert.match(a.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  const writes=await Promise.all(Array.from({length:4},(_,i)=>f.request('/api/memory',{text:`I prefer short example ${i}`})));
  assert.ok(writes.every(r=>r.status===200&&r.data.model==='deepseek-chat'));assert.equal(f.calls.length,4);
  assert.equal((await f.request('/api/state')).data.memories.length,4);assert.equal((await f.request('/api/state',undefined,f.b)).data.memories.length,0);assert.equal(b.data.profile.nativeLanguage,'English');
 }finally{await f.close();}
});
test('private files, hostile Host and cross-site writes stay blocked before model calls',async()=>{
 const f=await fixture();try{
  for(const route of ['/.env','/server.mjs','/%2e%2e/.env','/%5c..%5c.env'])assert.equal((await f.request(route)).status,404);
  assert.equal((await f.request('/api/memory',{text:'injected'},f.a,'POST',{Origin:'https://evil.example'})).status,403);
  assert.equal((await f.request('/api/memory',{text:'injected'},f.a,'POST',{'Sec-Fetch-Site':'cross-site'})).status,403);
  const status=await new Promise((resolve,reject)=>{const req=http.get(f.base+'/api/state',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});
  assert.equal(status,403);assert.equal(f.calls.length,0);assert.equal((await f.request('/')).status,200);
 }finally{await f.close();}
});
test('invalid requests are rejected without spending model calls',async()=>{
 const f=await fixture();try{
  assert.equal((await f.request('/api/memory','{broken')).status,400);assert.equal((await f.request('/api/memory',{text:''})).status,400);
  assert.equal((await f.request('/api/activity',{type:'admin',title:'bad'})).status,400);
  assert.equal((await f.request('/api/activity',{type:'lesson',title:'bad',lessonId:'__proto__'})).status,400);
  assert.equal((await f.request('/api/chat',{message:'x'.repeat(35000)})).status,413);
  assert.equal((await f.request('/api/lesson',{lessonId:'unknown'})).status,400);
  assert.equal((await f.request('/api/quiz',{lessonId:'first-hello',answers:[]})).status,400);assert.equal(f.calls.length,0);
 }finally{await f.close();}
});
test('every educational endpoint requires a configured model with no algorithm or static fallback',async()=>{
 const f=await fixture({apiKey:''});try{
  for(const[route,payload]of [['/api/chat',{message:'Hello'}],['/api/lesson',{lessonId:'first-hello'}],['/api/exercises',{lessonId:'first-hello'}],['/api/plan',{}],['/api/speaking',{expected:'你好',transcript:'你好'}],['/api/memory',{text:'I prefer short examples'}],['/api/activity',{type:'lesson',title:'Hello',lessonId:'first-hello'}],['/api/writing',{text:'你好'}]]){const r=await f.request(route,payload);assert.equal(r.status,503,route);assert.match(r.data.error,/not configured/);}
  assert.equal((await f.request('/api/profile',{name:'Jordan'},f.a,'PUT')).status,503);
  const state=(await f.request('/api/state')).data;assert.equal(state.profile.name,'Alex');assert.deepEqual(state.memories,[]);assert.deepEqual(state.plan,[]);assert.equal(f.calls.length,0);
 }finally{await f.close();}
});
test('personalized lessons are generated by model, cached per session/language and refreshed on demand',async()=>{
 const f=await fixture();try{
  const first=await f.request('/api/lesson',{lessonId:'first-hello',language:'zh'});assert.equal(first.status,200);assert.equal(first.data.mode,'live');assert.equal(first.data.lesson.phrases.length,4);assert.equal(first.data.lesson.id,'first-hello');assert.deepEqual(first.data.state.mastery,{});
  assert.match(f.calls[0].body.messages[0].content,/Interface language is simplified Chinese/);assert.match(f.calls[0].body.messages[0].content,/english.*MUST remain English/);
  assert.equal((await f.request('/api/lesson',{lessonId:'first-hello',language:'zh'})).data.mode,'cached');assert.equal(f.calls.length,1);
  await f.request('/api/lesson',{lessonId:'first-hello',language:'en'});assert.equal(f.calls.length,2);
  await f.request('/api/lesson',{lessonId:'first-hello',language:'zh',refresh:true});assert.equal(f.calls.length,3);
  assert.equal((await f.request('/api/lesson',{lessonId:'first-hello',language:'zh'},f.b)).data.mode,'live');assert.equal(f.calls.length,4);
 }finally{await f.close();}
});
test('generated exercise answers are private, persistent and inaccessible to a different session',async()=>{
 const f=await fixture();try{
  const generated=await f.request('/api/exercises',{lessonId:'first-hello',language:'en'});assert.equal(generated.status,200);const set=generated.data.exerciseSet;assert.equal(set.questions.length,4);assert.ok(set.questions.every(q=>q.answer===undefined&&q.explanation===undefined));
  assert.equal(JSON.stringify(generated.data).includes('correctAnswer'),false);assert.equal(JSON.stringify(generated.data).includes('_private'),false);
  assert.equal((await f.request('/api/state')).data._private,undefined);assert.equal((await f.request('/api/export')).data._private,undefined);
  const file=JSON.parse(await fs.readFile(path.join(f.directory,'data',`${f.a.value.split('=')[1]}.json`),'utf8'));assert.equal(file._private.exerciseSets[0].questions[0].answer,0);
  assert.equal((await f.request('/api/quiz',{lessonId:'first-hello',exerciseSetId:set.id,answers:answersFor(set)},f.b)).status,400);
  assert.equal((await f.request('/api/exercises',{lessonId:'first-hello'})).data.mode,'cached');assert.equal(f.calls.length,1);
 }finally{await f.close();}
});
test('quiz submissions receive model feedback while server truth and deduplication govern mastery',async()=>{
 const f=await fixture();try{
  const set=(await f.request('/api/exercises',{lessonId:'first-hello'})).data.exerciseSet,payload={lessonId:'first-hello',exerciseSetId:set.id,answers:answersFor(set)};
  const first=await f.request('/api/quiz',payload);assert.equal(first.status,200);assert.equal(first.data.mode,'live');assert.equal(first.data.results[0].correct,false);assert.equal(first.data.results[1].correct,true);assert.equal(first.data.mastery.observations,4);assert.ok(first.data.summary&&first.data.nextStep);
  const second=await f.request('/api/quiz',payload);assert.equal(second.data.alreadyMeasured,true);assert.equal(second.data.mastery.observations,4);assert.equal(second.data.reviewRescheduled,false);assert.equal(f.calls.filter(c=>c.payload.task==='quiz').length,2);
  const filename=path.join(f.directory,'data',`${f.a.value.split('=')[1]}.json`),persisted=JSON.parse(await fs.readFile(filename,'utf8'));persisted.reviews['first-hello'].dueAt=new Date(Date.now()-1000).toISOString();await fs.writeFile(filename,JSON.stringify(persisted));
  const due=await f.request('/api/quiz',payload);assert.equal(due.data.reviewRescheduled,true);assert.equal(due.data.state.reviews['first-hello'].interval,6);assert.equal(due.data.mastery.observations,4);
  const fresh=(await f.request('/api/exercises',{lessonId:'first-hello',refresh:true})).data.exerciseSet;assert.equal((await f.request('/api/quiz',{lessonId:'first-hello',exerciseSetId:fresh.id,answers:answersFor(fresh)})).data.mastery.observations,8);
 }finally{await f.close();}
});
test('model grading failure saves neither guessed feedback nor mastery evidence',async()=>{
 const f=await fixture({reply:(p,s)=>p.task==='quiz'?{summary:'Incomplete'}:mockReply(p,s)});try{
  const set=(await f.request('/api/exercises',{lessonId:'first-hello'})).data.exerciseSet;assert.equal((await f.request('/api/quiz',{lessonId:'first-hello',exerciseSetId:set.id,answers:answersFor(set)})).status,502);
  const state=(await f.request('/api/state')).data;assert.deepEqual(state.mastery,{});assert.equal(state.activities.length,0);
 }finally{await f.close();}
});
test('model chooses the full plan within prerequisite and time constraints',async()=>{
 const f=await fixture();try{
  const r=await f.request('/api/plan',{feedback:'I want to learn about Chinese cities',language:'zh'});assert.equal(r.status,200);assert.equal(r.data.mode,'live');assert.equal(r.data.model,'deepseek-chat');assert.equal(r.data.state.planLanguage,'zh');assert.equal(r.data.plan[0].lessonId,r.data.addedLesson.id);assert.equal(r.data.addedLesson.level,'HSK 1');assert.deepEqual(f.calls.map(call=>call.payload.task),['adaptation','plan']);assert.ok(f.calls[1].payload.advisoryPlan);assert.ok(r.data.plan.reduce((n,p)=>n+p.duration,0)<=15);
 }finally{await f.close();}
});

test('feedback adds a bilingual session-owned course that persists and works through lesson, quiz and activity',async()=>{
 const f=await fixture();try{
  const adjusted=await f.request('/api/plan',{feedback:'我想学习中国的城市',language:'zh'});assert.equal(adjusted.status,200);
  const course=adjusted.data.addedLesson;assert.match(course.id,/^custom-/);assert.equal(course.translations.zh.title,'认识中国城市');assert.equal(course.translations.en.title,'Discover Chinese cities');assert.equal(course.sourceFeedback,'我想学习中国的城市');
  assert.equal(adjusted.data.plan.some(step=>step.lessonId===course.id),true);
  const restored=(await f.request('/api/state')).data;assert.equal(restored.customLessons[0].id,course.id);
  const file=JSON.parse(await fs.readFile(path.join(f.directory,'data',f.a.value.split('=')[1]+'.json'),'utf8'));assert.equal(file.customLessons[0].id,course.id);
  const stranger=(await f.request('/api/state',undefined,f.b)).data;assert.deepEqual(stranger.customLessons,[]);
  assert.equal((await f.request('/api/lesson',{lessonId:course.id},f.b)).status,400);
  const lesson=await f.request('/api/lesson',{lessonId:course.id,language:'zh'});assert.equal(lesson.status,200);assert.equal(lesson.data.lesson.id,course.id);assert.equal(f.calls.at(-1).payload.outline.title,course.title);
  const generated=await f.request('/api/exercises',{lessonId:course.id,language:'zh'});assert.equal(generated.status,200);
  const quiz=await f.request('/api/quiz',{lessonId:course.id,exerciseSetId:generated.data.exerciseSet.id,answers:answersFor(generated.data.exerciseSet)});assert.equal(quiz.status,200);
  const activity=await f.request('/api/activity',{type:'lesson',lessonId:course.id,title:course.title});assert.equal(activity.status,200);
  const refreshed=await f.request('/api/plan',{});assert.equal(refreshed.status,200);assert.equal(refreshed.data.addedLesson,null);assert.equal(refreshed.data.state.customLessons.length,1);
  const exported=await f.request('/api/export');assert.equal(exported.data.customLessons[0].id,course.id);
  assert.deepEqual((await f.request('/api/data',undefined,f.a,'DELETE')).data.state.customLessons,[]);
 }finally{await f.close();}
});

test('a failed or unrelated adjusted plan saves neither a ghost course nor a replacement plan',async()=>{
 const f=await fixture({reply:(payload,system)=>payload.task==='plan'&&payload.requiredLessonId?{plan:[{lessonId:'first-hello',title:'Unrelated greeting',reason:'Unrelated',duration:5,difficulty:'Easy'}],summary:'Missed the new topic.'}:mockReply(payload,system)});
 try {
  const original=await f.request('/api/plan',{});assert.equal(original.status,200);
  const failed=await f.request('/api/plan',{feedback:'我想学习中国的城市',language:'zh'});assert.equal(failed.status,502);assert.match(failed.data.error,/requested course/);
  const state=(await f.request('/api/state')).data;assert.deepEqual(state.customLessons,[]);assert.deepEqual(state.plan,original.data.plan);
 }finally {await f.close();}
 const incomplete=await fixture({reply:(payload,system)=>payload.task==='adaptation'?{...mockReply(payload,system),course:{english:{title:'Missing metadata'}}}:mockReply(payload,system)});
 try {
  assert.equal((await incomplete.request('/api/plan',{feedback:'New topic'})).status,502);
  assert.deepEqual((await incomplete.request('/api/state')).data.customLessons,[]);assert.equal(incomplete.calls.length,1);
 }finally {await incomplete.close();}
});

test('model can reuse a course or adjust practice without creating one, and real content follows the proposed difficulty',async()=>{
 for(const action of ['use-existing','adjust-only']){
  const f=await fixture({reply:(payload,system)=>payload.task==='adaptation'?{action,reason:'Existing greetings already support a slower foundation check.',level:'HSK 1',levelReason:'No checked practice yet; stated HSK 2 is not a measured level.',selectedLessonId:action==='use-existing'?'first-hello':null,course:null}:mockReply(payload,system)});
  try {
   await f.request('/api/lesson',{lessonId:'first-hello'});await f.request('/api/exercises',{lessonId:'first-hello'});
   const result=await f.request('/api/plan',{feedback:'I need slower, simpler practice.'});assert.equal(result.status,200);assert.equal(result.data.addedLesson,null);assert.deepEqual(result.data.state.customLessons,[]);assert.equal(result.data.adaptation.action,action);
   assert.equal(result.data.state.planAdaptation.level,'HSK 1');assert.equal(result.data.state.aiLessons['first-hello:en'],undefined);
   const decision=f.calls.find(call=>call.payload.task==='adaptation').payload;assert.equal(decision.profile.level,'HSK 2');assert.deepEqual(decision.mastery,{});assert.ok(decision.availableLessons.some(lesson=>lesson.id==='first-hello'));
   const adapted=await f.request('/api/lesson',{lessonId:'first-hello'});assert.equal(adapted.status,200);assert.equal(adapted.data.mode,'live');assert.equal(adapted.data.lesson.level,'HSK 1');assert.equal(f.calls.at(-1).payload.adaptation.action,action);assert.equal(f.calls.at(-1).payload.outline.level,'HSK 1');
   const practice=await f.request('/api/exercises',{lessonId:'first-hello'});assert.equal(practice.data.mode,'live');assert.equal(f.calls.at(-1).payload.lesson.level,'HSK 1');
   const writing=await f.request('/api/writing',{text:'我去昨天书店。',lessonId:'first-hello',level:'HSK 6'});assert.equal(writing.status,200);assert.equal(f.calls.at(-1).payload.level,'HSK 1');assert.equal(f.calls.at(-1).payload.currentLesson.id,'first-hello');assert.equal(f.calls.at(-1).payload.adaptation.action,action);
  }finally {await f.close();}
 }
});

test('refreshing an adapted plan invalidates an old lesson newly selected into that plan',async()=>{
 let plans=0;
 const f=await fixture({reply:(payload,system)=>{
  if(payload.task==='adaptation')return{action:'adjust-only',reason:'Use short foundation practice.',level:'HSK 1',levelReason:'There is no checked evidence of HSK 2 readiness.',selectedLessonId:null,course:null};
  if(payload.task==='plan')return{plan:[{lessonId:'first-hello',title:'Slow greeting practice',reason:'Foundation first',duration:5,difficulty:'HSK 1',type:'review'},...++plans>1?[{lessonId:'coffee-order',title:'One simple drink request',reason:'Apply the foundation gently',duration:5,difficulty:'HSK 1',type:'lesson'}]:[]],summary:'Short foundation practice.'};
  return mockReply(payload,system);
 }});
 try {
  await f.request('/api/lesson',{lessonId:'coffee-order'});
  await f.request('/api/plan',{feedback:'Please slow down.'});
  assert.equal((await f.request('/api/lesson',{lessonId:'coffee-order'})).data.mode,'cached');
  const refreshed=await f.request('/api/plan',{});assert.equal(refreshed.status,200);assert.equal(refreshed.data.plan.length,2);assert.equal(refreshed.data.state.aiLessons['coffee-order:en'],undefined);
  const lesson=await f.request('/api/lesson',{lessonId:'coffee-order'});assert.equal(lesson.status,200);assert.equal(lesson.data.mode,'live');assert.equal(lesson.data.lesson.level,'HSK 1');
 }finally {await f.close();}
});

test('unusable adaptation decisions do not create courses or silently replace a plan',async()=>{
 for(const decision of [{action:'always-create',level:'HSK 1'},{action:'adjust-only',level:'HSK 99'},{action:'use-existing',level:'HSK 1',selectedLessonId:'another-session-course'}]){
  const f=await fixture({reply:(payload,system)=>payload.task==='adaptation'?{...mockReply(payload,system),...decision}:mockReply(payload,system)});
  try {
   assert.equal((await f.request('/api/plan',{feedback:'Adapt my practice.'})).status,502);
   const state=(await f.request('/api/state')).data;assert.deepEqual(state.customLessons,[]);assert.deepEqual(state.plan,[]);assert.equal(f.calls.length,1);
  }finally {await f.close();}
 }
});
test('invalid model plans never silently fall back to algorithm plans',async()=>{
 for(const invalid of [{plan:[{lessonId:'coffee-order',title:'Skip',reason:'Skip foundation',duration:5,difficulty:'Hard'}],summary:'Bad'},{plan:[{lessonId:'first-hello',title:'Too long',reason:'Long',duration:50,difficulty:'Easy'}],summary:'Bad'},{plan:[{lessonId:'unknown',title:'Unknown',reason:'Unknown',duration:5,difficulty:'Easy'}],summary:'Bad'}]){
  const f=await fixture({reply:()=>invalid});try{assert.equal((await f.request('/api/plan',{})).status,502);assert.deepEqual((await f.request('/api/state')).data.plan,[]);}finally{await f.close();}
 }
});

test('an invalid generated plan is corrected by one model request with validation feedback',async()=>{
 const f=await fixture({reply:(payload,system)=>{
  if(payload.task==='plan'&&!payload.validationFeedback){const valid=mockReply(payload,system);return{...valid,plan:[valid.plan[0],{...valid.plan[0],title:'Second round of the same course'}]};}
  return mockReply(payload,system);
 }});
 try {
  const result=await f.request('/api/plan',{});assert.equal(result.status,200);assert.equal(result.data.mode,'live');assert.equal(f.calls.length,2);
  assert.ok(f.calls[1].payload.previousPlan);assert.match(f.calls[1].payload.validationFeedback,/no duplicate courses/);assert.equal(new Set(result.data.plan.map(step=>step.lessonId)).size,result.data.plan.length);
 }finally {await f.close();}
});
test('speaking retains an honest transcript metric and receives model coaching',async()=>{
 const f=await fixture();try{
  const r=await f.request('/api/speaking',{expected:'你好！',transcript:'你好',language:'zh'});assert.equal(r.status,200);assert.equal(r.data.accuracy,100);assert.equal(r.data.model,'deepseek-chat');assert.equal(r.data.matchedCharacters,2);assert.match(r.data.metric,/不评估发音/);assert.ok(r.data.nextStep);assert.equal(f.calls[0].payload.task,'speaking');assert.match(f.calls[0].body.messages[0].content,/TEXT ONLY/);
 }finally{await f.close();}
});
test('profile, explicit memory and completion each call the model without inventing mastery',async()=>{
 const f=await fixture();try{
  const p=await f.request('/api/profile',{name:'Jordan',goal:'Cafe conversation'},f.a,'PUT');assert.equal(p.status,200);assert.ok(p.data.profileInsight&&p.data.recommendedFocus);assert.equal(p.data.state.profile.name,'Jordan');assert.equal(p.data.mode,'live');
  const m=await f.request('/api/memory',{text:'I prefer short examples.'});assert.equal(m.data.state.memories[0].text,'I prefer short examples.');assert.equal(m.data.state.memories[0].source,'learner');assert.ok(m.data.reflection);
  const a=await f.request('/api/activity',{type:'lesson',title:'Explored hello',lessonId:'first-hello'});assert.ok(a.data.stepFeedback&&a.data.nextStep);assert.equal(a.data.state.mastery['first-hello'].observations,undefined);assert.deepEqual(f.calls.map(c=>c.payload.task),['profile','memory','activity']);
 }finally{await f.close();}
});
test('chat/writing keep bounded context, language directives and exact-substring corrections',async()=>{
 const f=await fixture();try{
  const c=await f.request('/api/chat',{message:'Practise coffee.',language:'zh',history:[{role:'system',content:'bad instruction'},{role:'user',content:'Hi'}]});assert.equal(c.status,200);assert.equal(c.data.mode,'live');assert.equal(f.calls[0].payload.history.length,1);assert.match(f.calls[0].body.messages[0].content,/Preserve JSON keys, enum values, IDs/);assert.equal(JSON.stringify(c.data).includes('unit-test-key'),false);
  const w=await f.request('/api/writing',{text:'我去昨天书店。',prompt:'Write about yesterday.'});assert.equal(w.status,200);assert.equal(w.data.corrections.length,1);assert.equal(w.data.state.stats.writingCount,1);
 }finally{await f.close();}
});
test('removal clears derived content; reset/export hide private answers and legacy plans',async()=>{
 const f=await fixture();try{
  await f.request('/api/lesson',{lessonId:'first-hello'});const set=(await f.request('/api/exercises',{lessonId:'first-hello'})).data.exerciseSet;await f.request('/api/quiz',{lessonId:'first-hello',exerciseSetId:set.id,answers:answersFor(set)});await f.request('/api/plan',{});
  const state=(await f.request('/api/state')).data,memory=state.memories.find(m=>m.kind==='episodic'),removed=await f.request(`/api/memory/${memory.id}`,undefined,f.a,'DELETE');
  assert.deepEqual(removed.data.state.mastery,{});assert.deepEqual(removed.data.state.quizAttempts,{});assert.deepEqual(removed.data.state.reviews,{});assert.deepEqual(removed.data.state.aiLessons,{});assert.deepEqual(removed.data.state.plan,[]);
  const file=path.join(f.directory,'data',`${f.a.value.split('=')[1]}.json`),old=JSON.parse(await fs.readFile(file,'utf8'));old.planMode='algorithm+deepseek';old.plan=[{lessonId:'first-hello',title:'Old plan'}];await fs.writeFile(file,JSON.stringify(old));assert.deepEqual((await f.request('/api/state')).data.plan,[]);
  const exported=await f.request('/api/export');assert.equal(exported.data._private,undefined);assert.match(exported.headers.get('content-disposition'),/attachment/);
  const reset=await f.request('/api/data',undefined,f.a,'DELETE');assert.deepEqual(reset.data.state.memories,[]);assert.deepEqual(reset.data.state.mastery,{});assert.equal(reset.data.state.profile.name,'Alex');
 }finally{await f.close();}
});
