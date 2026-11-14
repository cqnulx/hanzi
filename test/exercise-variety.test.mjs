import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from '../server.mjs';

const lesson={id:'greetings',title:'Greetings',level:'HSK 2',duration:5,prerequisites:[],description:'Greeting and replying politely',objectives:['Greet someone','Reply politely'],phrases:[]};
const original=['How do you greet your teacher at school?','How do you greet a friend in the morning?','How do you say goodbye after class?','How do you thank someone for a book?'];
const fresh=['What greeting fits a phone call to your classmate?','What do you say when meeting your neighbour outside?','What fits the end of a short video call?','What do you say after a friend helps you find the classroom?'];
const singleStems=[...original,...fresh,'How do you introduce yourself to a new study partner?','How do you reply when your classmate thanks you?'];
const questions=stems=>stems.map(question=>({question,options:['你好','再见','谢谢','不客气'],answer:0,explanation:'Use the expression that fits this situation.'}));

const adaptiveReply=payload=>({questions:questions([singleStems[payload.practiceRound-1]]),teachingIntent:!payload.previousQuestion?'foundation':payload.previousQuestion.correct?'transfer':'consolidate',intentReason:!payload.previousQuestion?'Start with a short situation.':payload.previousQuestion.correct?'Try the expression in another situation.':'Practise the missed skill with a clearer example.'});
async function fixture(reply=payload=>payload.adaptive?adaptiveReply(payload):({questions:questions(payload.practiceRound===1?original:fresh)})){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hanzi-variety-')),calls=[];
 const server=createServer({apiKey:'variety-test',storageDir:directory,lessons:[lesson],fetchImpl:async(_,request)=>{
  const body=JSON.parse(request.body),payload=JSON.parse(body.messages[1].content);calls.push(payload);
  let result;
  if(payload.task==='lesson'){
   const phrase={hanzi:'你好',pinyin:'Nǐ hǎo',english:'Hello',translation:'Hello'};
   result={title:'A greeting',subtitle:'A short practice',category:'Conversation',description:'Practise a polite greeting.',objectives:['Greet someone','Reply politely'],phrases:Array.from({length:4},()=>({...phrase})),vocabulary:Array.from({length:4},()=>({...phrase})),videoFrames:Array.from({length:4},()=>({...phrase,note:'Listen and repeat.'})),writingPrompt:{title:'Say hello',instruction:'Write a short greeting.',starter:'你好',tip:'Use a short phrase.'}};
  }else if(payload.task==='quiz'){
   const evidence=payload.difficultyEvidence,action=evidence?.allowedActions.includes('maintain')?'maintain':evidence?.allowedActions[0]||'maintain',base=Number(evidence?.currentLevel?.slice(-1)||2);
   result={results:payload.checkedResults.map(item=>({questionId:item.questionId,explanation:'Compare this expression with the given situation.'})),summary:'Checked answer feedback.',nextStep:'Try a different situation.',difficultyAdjustment:{action,level:`HSK ${base+(action==='increase'?1:action==='decrease'?-1:0)}`,reason:'Use the checked accuracy and practise the missed skill.',focus:'Use a polite reply in a new situation.'}};
  }
  else result=await reply(payload);
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}));
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let cookie='';
 async function request(route,payload){
  const response=await fetch(`http://127.0.0.1:${server.address().port}${route}`,{method:payload===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});
  if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
  return{status:response.status,data:await response.json()};
 }
 const exercise=extra=>request('/api/exercises',{lessonId:lesson.id,language:'en',...extra});
 const submit=(set,correct=set.questions.length===1?1:3)=>request('/api/quiz',{lessonId:lesson.id,language:'en',exerciseSetId:set.id,answers:set.questions.map((q,index)=>({questionId:q.id,answer:index<correct?0:1}))});
 return{calls,request,exercise,submit,read:async()=>JSON.parse(await fs.readFile(path.join(directory,cookie.split('=')[1]+'.json'),'utf8')),close:async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}};
}

test('the next test uses different questions at unchanged difficulty, while incomplete sets and completed review remain usable',async()=>{
 const f=await fixture();try{
  const first=await f.exercise(),set=first.data.exerciseSet;assert.equal(first.status,200);
  const pending=await f.exercise();assert.equal(pending.data.mode,'cached');assert.equal(pending.data.exerciseSet.id,set.id);assert.equal(f.calls.length,1);
  const graded=await f.submit(set);assert.equal(graded.status,200);assert.equal(graded.data.difficultyAdjustment.action,'maintain');
  const next=await f.exercise();assert.equal(next.status,200);assert.equal(next.data.mode,'live');assert.notEqual(next.data.exerciseSet.id,set.id);assert.equal(next.data.exerciseSet.level,set.level);
  assert.deepEqual(next.data.exerciseSet.questions.map(q=>q.question),fresh);assert.deepEqual(next.data.exerciseSet.questions[0].options,set.questions[0].options,'basic vocabulary can recur');
  const generation=f.calls.filter(call=>call.task==='exercises').at(-1);assert.equal(generation.practiceRound,2);assert.deepEqual(generation.avoidQuestions,original);assert.equal(generation.recentExercises[0].questions[0].correctAnswer,'你好');assert.equal(generation.learningDifficulty.focus,'Use a polite reply in a new situation.');
  const reviewed=await f.submit(set);assert.equal(reviewed.status,200);assert.equal(reviewed.data.alreadyMeasured,true);assert.equal(reviewed.data.mastery.observations,4);assert.equal(reviewed.data.state.quizPerformance.length,1);
  const saved=await f.read();assert.equal(saved._private.exerciseSets.length,2);assert.equal(saved._private.exerciseRound,2);
 }finally{await f.close();}
});

test('a repeated model response is regenerated once with concrete feedback before a fresh set is saved',async()=>{
 let secondRoundCalls=0;
 const f=await fixture(payload=>({questions:questions(payload.practiceRound===1||++secondRoundCalls===1?original:fresh)}));try{
  const first=(await f.exercise()).data.exerciseSet;await f.submit(first);
  const next=await f.exercise();assert.equal(next.status,200);assert.deepEqual(next.data.exerciseSet.questions.map(q=>q.question),fresh);
  const generations=f.calls.filter(call=>call.task==='exercises');assert.equal(generations.length,3);assert.equal(generations[1].validationFeedback,null);assert.deepEqual(generations[2].validationFeedback.repeatedQuestions,original);assert.equal(generations[2].practiceRound,2);
  assert.equal((await f.read())._private.exerciseSets.length,2);
 }finally{await f.close();}
});

test('numbering, punctuation, whitespace and option reordering do not disguise a repeated question',async()=>{
 const f=await fixture(payload=>({questions:questions(payload.practiceRound===1?original:original.map((stem,i)=>`Question ${i+9}: ${stem.toUpperCase().replaceAll(' ','  ').replace('?','!')}`)).map(q=>payload.practiceRound===1?q:{...q,options:[...q.options].reverse(),answer:3})}));try{
  const first=(await f.exercise()).data.exerciseSet;await f.submit(first);
  const failed=await f.exercise({refresh:true});assert.equal(failed.status,502);assert.match(failed.data.error,/repeated earlier questions/);
  const saved=await f.read();assert.equal(saved._private.exerciseSets.length,1);assert.equal(saved._private.exerciseRound,1);assert.equal(saved.quizPerformance.length,1);assert.equal(saved.mastery.greetings.observations,4);
  assert.equal(f.calls.filter(call=>call.task==='exercises').length,3,'only two new generation attempts');
  assert.equal((await f.submit(first)).data.alreadyMeasured,true,'failed generation preserves review');
 }finally{await f.close();}
});

test('duplicate items inside a generated test fail without persisting a partial or fabricated set',async()=>{
 const f=await fixture(()=>({questions:questions([original[0],original[0],original[2],original[3]])}));try{
  const failed=await f.exercise();assert.equal(failed.status,502);assert.equal(f.calls.length,2);
  const saved=await f.read();assert.equal(saved._private,undefined);assert.deepEqual(saved.mastery,{});assert.deepEqual(saved.quizPerformance,[]);
 }finally{await f.close();}
});

test('a forced replacement bypasses an unfinished cache and its new questions become the resumable set',async()=>{
 const f=await fixture();try{
  const first=(await f.exercise()).data.exerciseSet;
  const replacement=await f.exercise({refresh:true});assert.equal(replacement.status,200);assert.notEqual(replacement.data.exerciseSet.id,first.id);assert.deepEqual(replacement.data.exerciseSet.questions.map(q=>q.question),fresh);
  assert.equal((await f.exercise()).data.exerciseSet.id,replacement.data.exerciseSet.id);assert.equal(f.calls.length,2);
 }finally{await f.close();}
});

test('single-question practice is sequential, retries are idempotent, and each next model decision sees the actual previous answer',async()=>{
 const f=await fixture();try{
  const first=await f.exercise({adaptive:true}),set=first.data.exerciseSet;assert.equal(first.status,200);assert.equal(set.questions.length,1);assert.equal(set.questionNumber,1);assert.equal(set.teachingIntent,'foundation');assert.equal(set.previousExerciseSetId,null);
  assert.equal((await f.exercise({adaptive:true,refresh:true})).data.exerciseSet.id,set.id,'cannot skip the unanswered question');
  assert.equal((await f.exercise({adaptive:true,previousExerciseSetId:set.id})).status,409,'cannot request a next question before answering');
  await f.submit(set,0);
  const [next,duplicate]=await Promise.all([f.exercise({adaptive:true,previousExerciseSetId:set.id}),f.exercise({adaptive:true,previousExerciseSetId:set.id})]);
  assert.equal(next.status,200);assert.equal(duplicate.data.exerciseSet.id,next.data.exerciseSet.id);assert.equal(next.data.exerciseSet.questionNumber,2);assert.equal(next.data.exerciseSet.teachingIntent,'consolidate');assert.equal(next.data.exerciseSet.previousExerciseSetId,set.id);
  const generation=f.calls.filter(call=>call.task==='exercises').at(-1);assert.equal(generation.previousQuestion.correct,false);assert.equal(generation.previousQuestion.selectedAnswer,'再见');assert.equal(generation.previousQuestion.correctAnswer,'你好');assert.equal(generation.previousQuestion.question,set.questions[0].question);assert.equal(generation.questionCount,1);
  assert.equal((await f.exercise({adaptive:true})).data.exerciseSet.id,next.data.exerciseSet.id,'reload resumes pending question');
  await f.submit(next.data.exerciseSet);
  assert.equal((await f.exercise({adaptive:true,previousExerciseSetId:set.id})).status,409,'a completed child cannot be returned as an unanswered next question');
  const third=await f.exercise({adaptive:true});assert.equal(third.data.exerciseSet.questionNumber,3);assert.equal(third.data.exerciseSet.teachingIntent,'transfer');assert.equal(third.data.exerciseSet.previousExerciseSetId,next.data.exerciseSet.id,'reload after feedback continues from latest answer');
  assert.equal((await f.exercise({adaptive:true,previousExerciseSetId:set.id})).status,409,'cannot branch from an older answer');
 }finally{await f.close();}
});

test('regenerating a stale lesson preserves the current unanswered adaptive question but drops an unfinished legacy batch',async()=>{
 const f=await fixture();try{
  assert.equal((await f.request('/api/lesson',{lessonId:lesson.id,language:'en'})).status,200);
  const first=(await f.exercise({adaptive:true})).data.exerciseSet;await f.submit(first);
  const pending=(await f.exercise({adaptive:true,previousExerciseSetId:first.id})).data.exerciseSet;
  const legacy=await f.exercise();assert.equal(legacy.status,200);
  const regenerated=await f.request('/api/lesson',{lessonId:lesson.id,language:'en'});assert.equal(regenerated.status,200);assert.equal(regenerated.data.mode,'live','the lesson cache predates the latest answer');
  const resumed=await f.exercise({adaptive:true,previousExerciseSetId:first.id});assert.equal(resumed.status,200);assert.equal(resumed.data.mode,'cached');assert.equal(resumed.data.exerciseSet.id,pending.id);
  assert.equal((await f.exercise({adaptive:true})).data.exerciseSet.id,pending.id,'a page reload resumes the same pending question');
  const saved=await f.read();assert.ok(saved._private.exerciseSets.some(set=>set.id===first.id));assert.ok(saved._private.exerciseSets.some(set=>set.id===pending.id));assert.ok(!saved._private.exerciseSets.some(set=>set.id===legacy.data.exerciseSet.id));
 }finally{await f.close();}
});

test('single-question failure retains completed feedback and a later retry continues the same chain',async()=>{
 let failNext=true;
 const f=await fixture(payload=>payload.practiceRound===2&&failNext?{questions:questions([original[0]]),teachingIntent:'transfer',intentReason:'Try another situation.'}:adaptiveReply(payload));try{
  const first=(await f.exercise({adaptive:true})).data.exerciseSet;await f.submit(first);
  assert.equal((await f.exercise({adaptive:true,previousExerciseSetId:first.id})).status,502);
  const saved=await f.read();assert.equal(saved._private.exerciseSets.length,1);assert.equal(saved.quizPerformance.length,1);assert.equal(saved._private.exerciseRound,1);
  failNext=false;const next=await f.exercise({adaptive:true,previousExerciseSetId:first.id});assert.equal(next.status,200);assert.equal(next.data.exerciseSet.questionNumber,2);assert.notEqual(next.data.exerciseSet.questions[0].question,first.questions[0].question);
 }finally{await f.close();}
});

test('missing adaptive metadata is corrected once by the model using explicit validation feedback',async()=>{
 for(const omitted of ['intentReason','teachingIntent']){
  let calls=0;
  const f=await fixture(payload=>{const result=adaptiveReply(payload);if(++calls===1)delete result[omitted];return result;});try{
   const first=await f.exercise({adaptive:true});assert.equal(first.status,200);assert.equal(first.data.exerciseSet.teachingIntent,'foundation');assert.ok(first.data.exerciseSet.intentReason);
   const generations=f.calls.filter(call=>call.task==='exercises');assert.equal(generations.length,2);assert.equal(generations[0].validationFeedback,null);assert.deepEqual(generations[1].validationFeedback.requiredFields,['teachingIntent','intentReason','questions']);assert.deepEqual(generations[1].validationFeedback.allowedTeachingIntents,['foundation']);assert.equal(generations[1].practiceRound,1);
   const saved=await f.read();assert.equal(saved._private.exerciseSets.length,1);assert.equal(saved._private.exerciseRound,1);assert.deepEqual(saved.quizPerformance,[]);
  }finally{await f.close();}
 }
});

test('repeated missing adaptive metadata fails after two attempts and preserves the last checked question',async()=>{
 for(const omitted of ['intentReason','teachingIntent']){
  const f=await fixture(payload=>{const result=adaptiveReply(payload);if(payload.practiceRound>1)delete result[omitted];return result;});try{
   const first=(await f.exercise({adaptive:true})).data.exerciseSet;await f.submit(first);
   const failed=await f.exercise({adaptive:true,previousExerciseSetId:first.id});assert.equal(failed.status,502);assert.match(failed.data.error,omitted==='intentReason'?/incomplete next question reason/:/invalid next question/);
   const generations=f.calls.filter(call=>call.task==='exercises');assert.equal(generations.length,3);assert.deepEqual(generations.at(-1).validationFeedback.allowedTeachingIntents,['transfer','challenge','consolidate']);
   const saved=await f.read();assert.equal(saved._private.exerciseSets.length,1);assert.equal(saved._private.exerciseSets[0].id,first.id);assert.ok(saved._private.exerciseSets[0].measuredAt);assert.equal(saved._private.exerciseRound,1);assert.equal(saved.quizPerformance.length,1);assert.equal(saved.mastery.greetings.observations,1);
  }finally{await f.close();}
 }
});

test('eight checked single questions can raise or lower the teaching level without duplicate evidence',async()=>{
 for(const correct of [1,0]){
  const f=await fixture();try{
   let previous;
   for(let i=1;i<=8;i++){
    const generated=await f.exercise({adaptive:true,...(previous?{previousExerciseSetId:previous.id}:{})});assert.equal(generated.status,200);const set=generated.data.exerciseSet;assert.equal(set.questionNumber,i);
    const graded=await f.submit(set,correct);assert.equal(graded.status,200);assert.equal(graded.data.difficultyAdjustment.total,i);
    assert.equal(graded.data.difficultyAdjustment.level,i<8?'HSK 2':correct?'HSK 3':'HSK 1');
    if(i===8){assert.equal(graded.data.difficultyAdjustment.action,correct?'increase':'decrease');assert.equal(graded.data.difficultyAdjustment.attemptCount,8);const repeated=await f.submit(set,correct);assert.equal(repeated.data.alreadyMeasured,true);assert.equal(repeated.data.state.quizPerformance.length,8);assert.equal(repeated.data.mastery.observations,8);}
    previous=set;
   }
   const next=await f.exercise({adaptive:true,previousExerciseSetId:previous.id});assert.equal(next.data.exerciseSet.level,correct?'HSK 3':'HSK 1');
  }finally{await f.close();}
 }
});
