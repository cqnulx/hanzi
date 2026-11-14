import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture(){
 const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import .+;\r?\n/gm,'').replace(/populateLanguageSelectors\(\);\r?\nobserveTranslations\(\);\r?\ninit\(\);\s*$/,'');
 const handlers={},requests=[],responses=[],nodes=new Map();
 const lesson={id:'first-hello',title:'Greetings',level:'HSK 1',phrases:[{hanzi:'你好'}],writingPrompt:{}};
 nodes.set('#toast',{dataset:{},classList:{add(){},remove(){}}});
 nodes.set('#quiz-results',{scrollIntoView(){}});
 const document={querySelector:selector=>nodes.get(selector)||{addEventListener(){},classList:{add(){},remove(){}}},querySelectorAll:()=>[],addEventListener:(event,handler)=>{handlers[event]=handler;}};
 const context=vm.createContext({document,location:{hostname:'localhost'},window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},getLocalizedLessons:()=>[lesson],getLanguage:()=>'en',languageInfo:()=>({locale:'en',name:'English'}),translateText:value=>value,normalizeLanguage:value=>value,API_BASE_URL:'',Map,Set,Number,String,JSON,console,setTimeout:()=>1,clearTimeout(){},AbortController,queueMicrotask:task=>task(),FormData:class{constructor(form){this.form=form;}get(name){return this.form.answers[name];}},fetch:async(url,options)=>{requests.push({url,payload:JSON.parse(options.body)});const result=responses.shift();if(result instanceof Error)throw result;return{ok:result.ok!==false,status:result.status||200,headers:{get:()=>''},json:async()=>result.data};}});
 vm.runInContext(source,context);
 const run=code=>vm.runInContext(code,context);
 run(`render=()=>{};app.state={profile:{name:'Learner'},plan:[]};app.lessonId='first-hello';app.view='learn';app.lessonSessions.set('first-hello:en',{lesson:lessons[0]});`);
 const question=(id,wording)=>({id,lessonId:lesson.id,language:'en',level:'HSK 1',adaptive:true,questionNumber:id==='set-1'?1:2,teachingIntent:'transfer',intentReason:'Use a different setting.',questions:[{id:'shared-question-id',question:wording,options:['你好','谢谢','再见','不客气']}]});
 const button=()=>({disabled:false,innerHTML:'Start',isConnected:false});
 const answer=async set=>{
  const form={id:'quiz-form',dataset:{exerciseSetId:set},answers:{'shared-question-id':'0'},querySelector:()=>button()};
  await handlers.submit({target:form,preventDefault(){}});
 };
 return{run,responses,requests,question,answer,button};
}

test('each reviewed answer feeds the next single question and preserves an explicit review',async()=>{
 const f=fixture();
 f.responses.push({data:{exerciseSet:f.question('set-1','Greet a teacher.')}});
 await f.run('generateExercises') (f.button());
 assert.equal(f.requests[0].payload.adaptive,true);
 assert.equal(f.requests[0].payload.previousExerciseSetId,undefined);
 assert.equal((f.run('quizPanel(selectedLesson())').match(/<fieldset/g)||[]).length,1);
 const result={results:[{questionId:'shared-question-id',correct:true,explanation:'A greeting.'}],summary:'A good start.',state:{profile:{name:'Learner'},plan:[],learningDifficulty:{revision:1,language:'en',level:'HSK 1',action:'maintain',reason:'Limited evidence.'}}};
 f.responses.push({data:result});
 await f.answer('set-1');
 const reviewed=f.run('quizPanel(selectedLesson())');
 assert.ok(reviewed.includes('Next question')&&reviewed.includes('Completed practice review'));
 assert.ok(reviewed.includes('disabled')&&reviewed.includes('checked'));
 assert.ok(!reviewed.includes('type="submit"'));
 f.responses.push({data:{exerciseSet:f.question('set-2','Greet a new neighbour.')}});
 await f.run('generateExercises') (f.button());
 assert.equal(f.requests.at(-1).payload.adaptive,true,'the server continues from the latest checked answer');
 assert.equal(f.requests.filter(request=>request.url==='/api/lesson').length,0);
 const next=f.run('quizPanel(selectedLesson())');
 assert.ok(next.includes('Greet a new neighbour.')&&next.includes('Answered questions'));
 assert.ok(!next.includes(' checked'));
 assert.equal(f.run("app.practiceRuns.get('first-hello:en').history.length"),1);
 assert.equal(f.run('app.quizResult'),null);
});

test('a failed next-question request keeps the completed answer and allows a retry',async()=>{
 const f=fixture();
 f.responses.push({data:{exerciseSet:f.question('set-1','Greet a teacher.')}});
 await f.run('generateExercises') (f.button());
 f.responses.push({data:{results:[{questionId:'shared-question-id',correct:false,explanation:'Try a greeting.'}],summary:'Use a greeting.'}});
 await f.answer('set-1');
 f.responses.push({ok:false,status:502,data:{error:'The learning service repeated earlier questions. Please prepare a new practice set again.'}});
 await f.run('generateExercises') (f.button());
 assert.equal(f.run('app.completedQuiz.exerciseSet.id'),'set-1');
 assert.equal(f.run('app.quizResult.summary'),'Use a greeting.');
 assert.equal(f.run('app.exercisePending.size'),0);
 assert.ok(f.run('quizPanel(selectedLesson())').includes('Next question'));
 f.responses.push({data:{exerciseSet:f.question('set-2','Greet a new neighbour.')}});
 await f.run('generateExercises') (f.button());
 assert.equal(f.requests.at(-1).payload.adaptive,true);
 assert.equal(f.run("app.exerciseSets.get('first-hello:en').id"),'set-2');
});
