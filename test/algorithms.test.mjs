import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveMemories, updateBKT, updateReview, buildPlan } from '../algorithms.mjs';
import { lessons } from '../public/content.js';

test('relevant bilingual evidence ranks first and superseded facts are excluded',()=>{
  const now=new Date().toISOString();
  const memories=[{id:'unrelated',text:'Likes hiking',kind:'semantic',timestamp:now},{id:'relevant',text:'Confuses 了 and 过 when describing past experiences',kind:'episodic',timestamp:now},{id:'old',text:'Confuses 了 and 过',kind:'semantic',status:'superseded',timestamp:now}];
  const result=retrieveMemories(memories,'past experiences 了 过');
  assert.equal(result[0].id,'relevant');
  assert.ok(!result.some(m=>m.id==='old'));
});
test('BKT distinguishes correct and incorrect evidence without declaring one answer mastery',()=>{
  const first=updateBKT({},true);
  assert.equal(first.observations,1);
  assert.equal(first.status,'insufficient-evidence');
  assert.equal(first.calibrated,false);
  assert.ok(first.probability>0.2&&first.probability<1);
  const wrong=updateBKT(first,false);
  assert.ok(wrong.probability<first.probability);
  assert.equal(wrong.observations,2);
});
test('SM-2 lapse brings review back to one day and success expands interval',()=>{
  const first=updateReview({},4),next=updateReview(first,4),lapse=updateReview(next,1);
  assert.equal(first.interval,1);assert.equal(next.interval,6);
  assert.equal(lapse.interval,1);assert.equal(lapse.repetitions,0);
  assert.ok(lapse.ease>=1.3);
});
test('learning plan respects time budget and schedules missing prerequisites first',()=>{
  const state={profile:{dailyMinutes:25,goal:'restaurant food'},mastery:{},reviews:{}};
  const plan=buildPlan(state,lessons);
  assert.ok(plan.length>0);
  assert.ok(plan.reduce((n,p)=>n+p.duration,0)<=25);
  const encountered=new Set();
  for(const item of plan){const lesson=lessons.find(l=>l.id===item.lessonId);for(const prerequisite of lesson.prerequisites||[])assert.ok(encountered.has(prerequisite));encountered.add(item.lessonId);}
});
