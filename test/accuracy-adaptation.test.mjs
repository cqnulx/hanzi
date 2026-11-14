import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from '../server.mjs';
import {performanceEvidence,validateDifficultyAdjustment,teachingLevel} from '../accuracy-adaptation.mjs';

const outline={id:'greetings',title:'Greetings',level:'HSK 2',duration:5,prerequisites:[],description:'Short Chinese greetings',objectives:['Greet someone','Reply politely'],phrases:[]};
const phrase={hanzi:'你好。',pinyin:'Nǐ hǎo.',english:'Hello.',translation:'Hola.'};
const validLesson={title:'Saludos',subtitle:'Saluda despacio',category:'Conversación',description:'Práctica breve.',objectives:['Saludar','Responder'],phrases:Array.from({length:4},()=>({...phrase})),vocabulary:Array.from({length:4},()=>({...phrase})),videoFrames:Array.from({length:4},()=>({...phrase,note:'Repite despacio.'})),writingPrompt:{title:'Saluda',instruction:'Escribe una frase.',starter:'你好。',tip:'Usa tu nombre.'}};
async function fixture(options={}){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hanzi-accuracy-'));
 const calls=[],jar={},other={};let wrongDecision=options.wrongDecision;
 const server=createServer({apiKey:'test-key',storageDir:directory,lessons:[{...outline,level:options.level||outline.level}],fetchImpl:async(_,request)=>{
  const body=JSON.parse(request.body),payload=JSON.parse(body.messages[1].content);calls.push({payload,system:body.messages[0].content});let result;
  if(payload.task==='lesson')result=validLesson;
  else if(payload.task==='exercises')result={questions:Array.from({length:4},(_,i)=>({question:`Choose ${i} for practice ${payload.practiceRound}`,options:['你好','再见','谢谢','不客气'],answer:0,explanation:'你好 is a greeting.'}))};
  else if(payload.task==='quiz'){
   const evidence=payload.difficultyEvidence,action=wrongDecision||(options.firstMaintain&&evidence?.attemptCount===1?'maintain':evidence?.allowedActions.find(value=>value!=='maintain'))||'maintain';
   const base=Number(evidence?.currentLevel?.slice(-1)||2),level=`HSK ${base+(action==='increase'?1:action==='decrease'?-1:0)}`;
   result={results:payload.checkedResults.map(item=>({questionId:item.questionId,explanation:'An explanation based on the checked answer.'})),summary:'A limited sample of checked practice.',nextStep:'Try a fresh short sentence.',difficultyAdjustment:{action,level,reason:'Based on the checked accuracy and sample size.',focus:'Practise word order with short Chinese examples.'}};
   if(options.incompleteFeedback)delete result.summary;
  }else if(payload.task==='localize-hints')result={courses:payload.courses.map(course=>({...course,title:'日本語のコース',subtitle:'短い練習',description:'ゆっくり練習します。',objectives:['短い文を読む','短い文を書く']})),adaptation:payload.adaptation?{reason:'短い文を使います。',levelReason:'基礎を確認します。'}:null,difficulty:payload.difficulty?{reason:'成績に合わせて練習します。',focus:'短い文を練習しましょう。'}:null};
  else if(payload.task==='plan')result={plan:[{lessonId:outline.id,title:'Practise greetings',reason:'Use the next teaching target.',duration:5,difficulty:payload.availableLessons[0].level,type:'lesson'}],summary:'A short plan.'};
  else if(payload.task==='adaptation')result={action:'adjust-only',level:'HSK 1',reason:'Use easier short examples.',levelReason:'The learner explicitly requested a gentler pace.',selectedLessonId:null};
  else if(payload.task==='profile')result={profileInsight:'A stated learning profile.',recommendedFocus:'Practise briefly.'};
  else if(body.messages[0].content.includes('Chinese writing tutor'))result={overallFeedback:'Una frase clara.',correctedText:'你好。',corrections:[],strengths:['Significado claro.'],nextStep:'Otra frase breve.'};
  else result={reply:'Hola',memoryUpdates:[]};
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}),{status:200});
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 async function request(route,payload,session=jar,method=payload===undefined?'GET':'POST'){
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(session.value?{Cookie:session.value}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});
  if(response.headers.get('set-cookie'))session.value=response.headers.get('set-cookie').split(';')[0];
  return {status:response.status,data:await response.json()};
 }
 const exercise=async(language='en')=>(await request('/api/exercises',{lessonId:outline.id,language})).data.exerciseSet;
 const submit=(set,correct=4,extra={})=>request('/api/quiz',{lessonId:outline.id,exerciseSetId:set.id,language:set.language,answers:set.questions.map((item,index)=>({questionId:item.id,answer:index<correct?0:1})),...extra});
 return{calls,request,exercise,submit,jar,other,directory,setWrong:value=>wrongDecision=value,close:async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}};
}

test('difficulty guardrails require varied current-level evidence and enforce boundaries',()=>{
 const record=(id,correct=4,level='HSK 2')=>({exerciseSetId:id,lessonId:outline.id,level,correct,total:4,accuracy:correct*25,timestamp:new Date().toISOString()});
 const results=correct=>Array.from({length:4},(_,i)=>({correct:i<correct}));
 const first=performanceEvidence({}, {id:'a',lessonId:outline.id,level:'HSK 2'},results(4),'HSK 2');
 assert.deepEqual(first.evidence.allowedActions,['maintain']);
 const high=performanceEvidence({quizPerformance:[record('a')]},{id:'b',lessonId:outline.id,level:'HSK 2'},results(4),'HSK 2');
 assert.deepEqual(high.evidence.allowedActions,['increase']);
 assert.throws(()=>validateDifficultyAdjustment({action:'maintain',level:'HSK 2',reason:'More samples needed.',focus:'Repeat.'},high.evidence,null,'b','en'),/invalid difficulty/);
 const higher=performanceEvidence({quizPerformance:[record('a'),record('b')]},{id:'c',lessonId:outline.id,level:'HSK 3'},results(4),'HSK 3');
 assert.deepEqual(higher.evidence.allowedActions,['maintain']);
 const low=performanceEvidence({}, {id:'d',lessonId:outline.id,level:'HSK 2'},results(1),'HSK 2');
 assert.deepEqual(low.evidence.allowedActions,['maintain','decrease']);
 const sustainedLow=performanceEvidence({quizPerformance:[record('low-a',0)]},{id:'low-b',lessonId:outline.id,level:'HSK 2'},results(0),'HSK 2');
 assert.deepEqual(sustainedLow.evidence.allowedActions,['decrease']);
 assert.throws(()=>validateDifficultyAdjustment({action:'maintain',level:'HSK 2',reason:'More samples needed.',focus:'Repeat.'},sustainedLow.evidence,null,'low-b','en'),/invalid difficulty/);
 const recovered=performanceEvidence({quizPerformance:[record('hard-1',0,'HSK 3'),record('hard-2',0,'HSK 3')]},{id:'easier',lessonId:outline.id,level:'HSK 2'},results(4),'HSK 2');
 assert.deepEqual(recovered.evidence.allowedActions,['maintain']);
 for(const [level,correct]of [['HSK 1',0],['HSK 6',4]]){
  const evidence=performanceEvidence({quizPerformance:[record('a',correct,level)]},{id:'b',lessonId:outline.id,level},results(correct),level).evidence;
  assert.deepEqual(evidence.allowedActions,['maintain']);
 }
 assert.throws(()=>validateDifficultyAdjustment({action:'increase',level:'HSK 4',reason:'x',focus:'y'},high.evidence,null,'b','en'),/invalid difficulty/);
 const bounded=performanceEvidence({quizPerformance:Array.from({length:40},(_,i)=>record('old-'+i,4))},{id:'new',lessonId:outline.id,level:'HSK 2'},results(2),'HSK 2');
 assert.equal(bounded.history.length,30);assert.equal(bounded.evidence.attemptCount,5);assert.equal(bounded.evidence.total,20);
});

test('checked accuracy changes the next real lesson, exercise, writing and plan without trusting client scores',async()=>{
 const f=await fixture();try{
  await f.request('/api/lesson',{lessonId:outline.id,language:'es'});
  const spanishBefore=await f.exercise('es'),first=await f.exercise('en');
  const one=await f.submit(first,4,{accuracy:0,correct:0,level:'HSK 6'});assert.equal(one.status,200);assert.equal(one.data.score.accuracy,100);assert.equal(one.data.difficultyAdjustment.action,'maintain');assert.equal(one.data.difficultyAdjustment.level,'HSK 2');
  const next=await f.exercise();assert.notEqual(next.id,first.id);
  const two=await f.submit(next,4);assert.equal(two.status,200);assert.equal(two.data.difficultyAdjustment.action,'increase');assert.equal(two.data.difficultyAdjustment.level,'HSK 3');assert.equal(two.data.difficultyAdjustment.total,8);assert.equal(two.data.difficultyAdjustment.revision,2);
  const lesson=await f.request('/api/lesson',{lessonId:outline.id,language:'es'});assert.equal(lesson.data.mode,'live');assert.equal(lesson.data.lesson.level,'HSK 3');assert.equal(f.calls.at(-1).payload.outline.level,'HSK 3');assert.equal(lesson.data.lesson.difficultyRevision,2);
  const spanish=await f.exercise('es');assert.notEqual(spanish.id,spanishBefore.id);assert.equal(spanish.level,'HSK 3');assert.equal(f.calls.at(-1).payload.lesson.level,'HSK 3');
  await f.request('/api/writing',{lessonId:outline.id,text:'你好。',language:'es'});assert.equal(f.calls.at(-1).payload.level,'HSK 3');
  const plan=await f.request('/api/plan',{language:'es'});assert.equal(plan.status,200);assert.equal(plan.data.state.planDifficultyRevision,2);assert.equal(f.calls.at(-1).payload.availableLessons[0].level,'HSK 3');
  const three=await f.submit(spanish,4);assert.equal(three.data.difficultyAdjustment.action,'maintain');assert.equal(three.data.difficultyAdjustment.level,'HSK 3');
 }finally{await f.close();}
});

test('low and middle accuracy select bounded decreases or maintenance and replay never creates new evidence',async()=>{
 const f=await fixture();try{
  const set=await f.exercise(),first=await f.submit(set,1);assert.equal(first.status,200);assert.equal(first.data.difficultyAdjustment.level,'HSK 1');assert.equal(first.data.difficultyAdjustment.action,'decrease');
  const replay=await f.submit(set,4,{language:'ja'});assert.equal(replay.status,200);assert.equal(replay.data.alreadyMeasured,true);assert.equal(replay.data.difficultyAdjustment.revision,1);assert.equal(replay.data.difficultyAdjustment.level,'HSK 1');assert.equal(replay.data.state.quizPerformance.length,1);assert.equal(replay.data.mastery.observations,4);
  await f.request('/api/lesson',{lessonId:outline.id,language:'en'});
  const stillReplay=await f.submit(set,4);assert.equal(stillReplay.status,200);assert.equal(stillReplay.data.alreadyMeasured,true);
  const next=await f.exercise(),middle=await f.submit(next,3);assert.equal(middle.data.difficultyAdjustment.action,'maintain');assert.equal(middle.data.difficultyAdjustment.level,'HSK 1');
  const restored=(await f.request('/api/state')).data;assert.equal(restored.learningDifficulty.revision,2);assert.equal(restored.quizPerformance.length,2);assert.equal(restored.quizPerformance[0].correct,1);
  const stranger=(await f.request('/api/state',undefined,f.other)).data;assert.equal(stranger.learningDifficulty,null);assert.deepEqual(stranger.quizPerformance,[]);
  const saved=JSON.parse(await fs.readFile(path.join(f.directory,f.jar.value.split('=')[1]+'.json'),'utf8'));assert.equal(saved.learningDifficulty.level,'HSK 1');assert.equal(saved.quizPerformance.length,2);
 }finally{await f.close();}
});

test('two low first attempts require a decrease even when the first low set maintained difficulty',async()=>{
 const f=await fixture({firstMaintain:true});try{
  const first=await f.submit(await f.exercise(),0);assert.equal(first.status,200);assert.equal(first.data.difficultyAdjustment.action,'maintain');assert.equal(first.data.difficultyAdjustment.level,'HSK 2');
  const second=await f.submit(await f.exercise(),0);assert.equal(second.status,200);assert.equal(second.data.difficultyAdjustment.action,'decrease');assert.equal(second.data.difficultyAdjustment.level,'HSK 1');assert.equal(second.data.difficultyAdjustment.correct,0);assert.equal(second.data.difficultyAdjustment.total,8);
  const quizCall=f.calls.filter(call=>call.payload.task==='quiz').at(-1);assert.deepEqual(quizCall.payload.difficultyEvidence.allowedActions,['decrease']);assert.match(quizCall.system,/direction is mandatory/);
 }finally{await f.close();}
});

test('invalid model difficulty or missing feedback saves no score, mastery or cache revision',async()=>{
 for(const options of [{wrongDecision:'increase'},{incompleteFeedback:true}]){
  const f=await fixture(options);try{
   const set=await f.exercise(),result=await f.submit(set,4);assert.equal(result.status,502);
   const state=(await f.request('/api/state')).data;assert.equal(state.learningDifficulty,null);assert.deepEqual(state.quizPerformance,[]);assert.deepEqual(state.mastery,{});assert.equal(state.activities.length,0);
   assert.equal((await f.exercise()).id,set.id);
  }finally{await f.close();}
 }
});

test('new explicit plan feedback can set a gentler target and profile reset clears derived difficulty',async()=>{
 const f=await fixture();try{
  for(let i=0;i<2;i++)assert.equal((await f.submit(await f.exercise(),4)).status,200);
  assert.equal((await f.request('/api/state')).data.learningDifficulty.level,'HSK 3');
  const plan=await f.request('/api/plan',{feedback:'Please slow down and use easier Chinese.',language:'es'});assert.equal(plan.status,200);assert.equal(plan.data.adaptation.level,'HSK 1');assert.equal(plan.data.adaptation.language,'es');
  const lesson=await f.request('/api/lesson',{lessonId:outline.id,language:'es'});assert.equal(lesson.data.lesson.level,'HSK 1');
  const profile=await f.request('/api/profile',{level:'HSK 2',language:'en'},f.jar,'PUT');assert.equal(profile.status,200);assert.equal(profile.data.state.learningDifficulty,null);assert.deepEqual(profile.data.state.quizPerformance,[]);
 }finally{await f.close();}
});

test('teaching difficulty follows evidence recency without changing the reported profile',()=>{
 const state={profile:{level:'HSK 5'},plan:[{lessonId:outline.id}],planAdaptation:{level:'HSK 1',updatedAt:'2026-11-14T01:00:00Z'},learningDifficulty:{level:'HSK 3',updatedAt:'2026-11-14T02:00:00Z'}};
 assert.equal(teachingLevel(state,outline),'HSK 3');state.planAdaptation.updatedAt='2026-11-14T03:00:00Z';assert.equal(teachingLevel(state,outline),'HSK 1');assert.equal(state.profile.level,'HSK 5');
});

test('guidance localization API persists translated hints only in its learning session and reuses cached text',async()=>{
 const f=await fixture();try{
  await f.submit(await f.exercise(),4);
  await f.request('/api/plan',{feedback:'Slower please.',language:'en'});
  const first=await f.request('/api/localize-learning',{language:'ja'});assert.equal(first.status,200);assert.equal(first.data.modified,true);
  assert.equal(first.data.state.planAdaptation.translations.ja.reason,'短い文を使います。');assert.equal(first.data.state.learningDifficulty.translations.ja.focus,'短い文を練習しましょう。');
  assert.equal(first.data.state.learningDifficulty.revision,1);assert.equal(first.data.state.learningDifficulty.level,'HSK 2');
  const count=f.calls.length,second=await f.request('/api/localize-learning',{language:'ja'});assert.equal(second.status,200);assert.equal(second.data.modified,false);assert.equal(f.calls.length,count);
  const restored=(await f.request('/api/state')).data;assert.equal(restored.learningDifficulty.translations.ja.reason,'成績に合わせて練習します。');
  const other=(await f.request('/api/localize-learning',{language:'ja'},f.other)).data;assert.equal(other.state.learningDifficulty,null);assert.equal(other.state.planAdaptation,null);
 }finally{await f.close();}
});

test('legacy graded sets without measuredAt are excluded from the next cached exercise',async()=>{
 const f=await fixture();try{
  const set=await f.exercise();await f.submit(set,3);
  const filename=path.join(f.directory,f.jar.value.split('=')[1]+'.json'),state=JSON.parse(await fs.readFile(filename,'utf8'));
  delete state._private.exerciseSets[0].measuredAt;state.learningDifficulty=null;state.quizPerformance=[];
  await fs.writeFile(filename,JSON.stringify(state));
  const next=await f.exercise();assert.notEqual(next.id,set.id);
  const replay=await f.submit(set,4);assert.equal(replay.status,200);assert.equal(replay.data.alreadyMeasured,true);assert.deepEqual(replay.data.state.quizPerformance,[]);assert.equal(replay.data.mastery.observations,4);
 }finally{await f.close();}
});
