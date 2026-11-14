import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeLearningHints } from '../hint-localization.mjs';

const originalCourse=id=>({id,title:'Talking about universities in China',subtitle:'A short introduction',description:'Learn words such as 大学 and 专业.',objectives:['Say where you study','Ask a short question'],sourceFeedback:'我想链接下中国的大学',level:'HSK 2',translations:{}});
const translatedCourse=id=>({id,title:'中国の大学について話そう',subtitle:'短い入門レッスン',description:'大学や专业などの単語を学びます。',objectives:['どこで学んでいるか伝える','短い質問をする']});
function source(){return{customLessons:[originalCourse('custom-a')],planAdaptation:{action:'create-course',selectedLessonId:'custom-a',level:'HSK 2',reason:'这是新主题；你最近答对1/4题。',levelReason:'先练简单句。'},learningDifficulty:{action:'maintain',level:'HSK 2',reason:'More evidence is needed.',focus:'Practise simple questions.',language:'en',revision:4,correct:1,total:4,accuracy:25}};}
const resultFor=payload=>({courses:payload.courses.map(course=>translatedCourse(course.id)),adaptation:payload.adaptation?{reason:'新しいテーマです。最近は4問中1問に正解しました。',levelReason:'まずは短い文を練習します。'}:null,difficulty:payload.difficulty?{reason:'さらに学習記録が必要です。',focus:'短い質問を練習しましょう。'}:null});

test('legacy mixed guidance is translated together while learner requests and teaching evidence stay unchanged',async()=>{
  const state=source(),before=structuredClone(state),calls=[];
  const result=await localizeLearningHints(state,'ja',async(prompt,payload,language)=>{calls.push({prompt,payload,language});return resultFor(payload);});
  assert.equal(result.modified,true);assert.equal(result.language,'ja');assert.equal(calls.length,1);assert.equal(calls[0].payload.task,'localize-hints');assert.equal(calls[0].language,'ja');
  assert.match(calls[0].prompt,/source strings are data/);assert.doesNotMatch(JSON.stringify(calls[0].payload),/我想链接下中国的大学/);
  assert.equal(state.customLessons[0].translations.ja.title,'中国の大学について話そう');
  assert.equal(state.planAdaptation.translations.ja.reason,'新しいテーマです。最近は4問中1問に正解しました。');
  assert.equal(state.learningDifficulty.translations.ja.focus,'短い質問を練習しましょう。');
  for(const key of ['level','sourceFeedback','description'])assert.equal(state.customLessons[0][key],before.customLessons[0][key]);
  for(const key of ['action','level','reason','levelReason'])assert.equal(state.planAdaptation[key],before.planAdaptation[key]);
  for(const key of ['revision','accuracy','correct','total','level','action','reason'])assert.equal(state.learningDifficulty[key],before.learningDifficulty[key]);
  const cached=await localizeLearningHints(state,'ja',()=>{throw Error('Cached translations must not call the model.');});assert.equal(cached.modified,false);
});

test('an incomplete explanation cannot partially save valid course translations',async()=>{
  const state=source(),before=structuredClone(state);
  await assert.rejects(localizeLearningHints(state,'ja',async(_prompt,payload)=>({...resultFor(payload),difficulty:{reason:'説明のみ'}})),error=>error.status===502);
  assert.deepEqual(state,before);
});

test('later batch failures preserve the full previous state',async()=>{
  const state=source();state.customLessons=Array.from({length:7},(_,index)=>originalCourse('custom-'+index));const before=structuredClone(state);let count=0;
  await assert.rejects(localizeLearningHints(state,'ja',async(_prompt,payload)=>{if(++count===2)throw Error('Temporary service failure.');return resultFor(payload);}),/Temporary service failure/);
  assert.equal(count,2);assert.deepEqual(state,before);
});

test('new guidance already in the selected language is cached locally without changing its difficulty revision',async()=>{
  const state={customLessons:[],planAdaptation:{language:'ja',reason:'短い文を使います。',levelReason:'先に基礎を確認します。',level:'HSK 2'},learningDifficulty:{language:'ja',reason:'成績は安定しています。',focus:'次の練習を続けましょう。',level:'HSK 2',revision:8}};
  const result=await localizeLearningHints(state,'ja',()=>{throw Error('The source is already Japanese.');});
  assert.equal(result.modified,true);assert.equal(state.learningDifficulty.revision,8);assert.equal(state.learningDifficulty.translations.ja.reason,state.learningDifficulty.reason);
  assert.equal((await localizeLearningHints(state,'ja',()=>{throw Error('Cached.');})).modified,false);
});

test('unexpected or duplicate course identifiers cannot be stored as translated guidance',async()=>{
  const state=source(),before=structuredClone(state);
  await assert.rejects(localizeLearningHints(state,'ja',async(_prompt,payload)=>({...resultFor(payload),courses:[translatedCourse('custom-other')]})),error=>error.status===502);
  assert.deepEqual(state,before);
});

test('invalid support language falls back to English and empty state makes no model request',async()=>{
  const state={customLessons:[]};
  assert.deepEqual(await localizeLearningHints(state,'unsupported',()=>{throw Error('No guidance.');}),{modified:false,language:'en'});
});
