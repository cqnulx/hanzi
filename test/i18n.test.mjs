import test from 'node:test';
import assert from 'node:assert/strict';
import { translateText } from '../public/i18n.js';
import { lessons, getLocalizedLessons } from '../public/content.js';

test('interface language changes common labels and dynamic counters without changing unknown learner text',()=>{
 assert.equal(translateText('Writing desk','zh'),'互动写作');
 assert.equal(translateText('  Get feedback  ','zh'),'  获取写作反馈  ');
 assert.equal(translateText('24 Chinese characters','zh'),'24 个汉字');
 assert.equal(translateText('Hello, Alex.','zh'),'你好，Alex。');
 assert.equal(translateText('Writing desk','en'),'Writing desk');
 assert.equal(translateText('My original draft should stay unchanged.','zh'),'My original draft should stay unchanged.');
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
