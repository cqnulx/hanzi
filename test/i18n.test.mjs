import test from 'node:test';
import assert from 'node:assert/strict';
import { translateText,getLanguage,setLanguage } from '../public/i18n.js';
import { LANGUAGES,normalizeLanguage,languageInfo } from '../public/languages.js';
import { locales } from '../public/locales.js';
import { lessons, getLocalizedLessons } from '../public/content.js';

test('interface language changes common labels and dynamic counters without changing unknown learner text',()=>{
 assert.equal(translateText('Writing desk','zh'),'互动写作');
 assert.equal(translateText('  Get feedback  ','zh'),'  获取写作反馈  ');
 assert.equal(translateText('24 Chinese characters','zh'),'24 个汉字');
 assert.equal(translateText('Hello, Alex.','zh'),'你好，Alex。');
 assert.equal(translateText('Writing desk','en'),'Writing desk');
 assert.equal(translateText('My original draft should stay unchanged.','zh'),'My original draft should stay unchanged.');
});
test('seven support languages translate navigation and preserve Chinese and learner text',()=>{
 assert.deepEqual(LANGUAGES.map(item=>item.code),['zh','en','es','fr','de','ja','ko']);
 for(const language of LANGUAGES){
  assert.equal(setLanguage(language.code),language.code);
  assert.equal(getLanguage(),language.code);
  assert.ok(languageInfo(language.code).locale);
  const label=translateText('Writing desk');
  assert.ok(label.length>0);
  if(language.code!=='en')assert.notEqual(label,'Writing desk');
  assert.equal(translateText('我喜欢学习中文。'), '我喜欢学习中文。');
  assert.equal(translateText('nǐ hǎo, Zhōngguó'), 'nǐ hǎo, Zhōngguó');
  assert.equal(translateText('My own sentence about Madrid 42.'),'My own sentence about Madrid 42.');
 }
 assert.equal(setLanguage('unsupported'),'en');
 assert.equal(normalizeLanguage(null),'en');
 assert.equal(translateText('Writing desk','unsupported'),'Writing desk');
});
test('additional languages preserve variable values while translating dynamic messages',()=>{
 for(const language of ['es','fr','de','ja','ko']){
  const greeting=translateText('Hello, Alex $&. ',language);
  assert.ok(greeting.includes('Alex $&'));
  assert.ok(greeting.endsWith(' '));
  assert.notEqual(greeting,'Hello, Alex $&. ');
  const counter=translateText('Phrase 3 of 17',language);
  assert.ok(counter.includes('3')&&counter.includes('17'));
  assert.notEqual(counter,'Phrase 3 of 17');
  const evidence=translateText('24 learning memories · 6 checked answers',language);
  assert.ok(evidence.includes('24')&&evidence.includes('6'));
  assert.ok(!evidence.includes('{'));
  const listen=translateText('Listen to 你好！',language);
  assert.ok(listen.includes('你好！'));
  assert.notEqual(listen,'Listen to 你好！');
 }
});
test('new language packs contain the same messages and preserve all template placeholders',()=>{
 const keys=Object.keys(locales.es);
 for(const [language,dictionary]of Object.entries(locales)){
  assert.deepEqual(Object.keys(dictionary),keys,language);
  for(const key of keys){
   assert.ok(dictionary[key]?.trim(),`${language}: ${key}`);
   const placeholders=value=>[...value.matchAll(/\{\w+\}/g)].map(match=>match[0]).sort();
   assert.deepEqual(placeholders(dictionary[key]),placeholders(key),`${language}: ${key}`);
  }
 }
});
test('bilingual lesson rendering preserves every answer index and skill identifier',()=>{
 const chinese=getLocalizedLessons('zh');
 assert.equal(chinese.length,6);
 for(let i=0;i<lessons.length;i++){
  const original=lessons[i],localized=chinese[i];
  assert.equal(localized.id,original.id);
  assert.notEqual(localized.title,original.title);
  assert.equal(localized.quizzes.length,4);
  assert.equal(localized.phrases[0].pinyin,original.phrases[0].pinyin);
  assert.equal(localized.phrases[0].english,original.phrases[0].english);
  for(let j=0;j<original.quizzes.length;j++){
   assert.equal(localized.quizzes[j].id,original.quizzes[j].id);
   assert.equal(localized.quizzes[j].answer,original.quizzes[j].answer);
   assert.equal(localized.quizzes[j].conceptId,original.quizzes[j].conceptId);
   assert.equal(localized.quizzes[j].options.length,original.quizzes[j].options.length);
  }
 }
 assert.equal(getLocalizedLessons('en')[0].title,lessons[0].title);
});

test('adaptive practice labels and continuation errors follow every support language',()=>{
 const messages=['ADAPTIVE PRACTICE','One question, then your next step.','Answered questions','Question','Transfer practice','Targeted support','Next question','Answer the current question before preparing the next one.','This practice has moved on. Continue with the latest question.','The learning service returned an invalid next question. Please prepare the practice again.'];
 for(const language of LANGUAGES){
  for(const message of messages){
   const translated=translateText(message,language.code);
   assert.ok(translated.trim(),`${language.code}: ${message}`);
   if(language.code==='en')assert.equal(translated,message);
   else if(!(language.code==='fr'&&message==='Question'))assert.notEqual(translated,message,`${language.code}: ${message}`);
  }
 }
 assert.equal(translateText('Question','zh'),'题目');
});
