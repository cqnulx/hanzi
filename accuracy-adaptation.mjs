/** Bounded evidence for model-selected teaching difficulty, never a proficiency score. */
const levelNumber=value=>Number(String(value||'').match(/^HSK ([1-6])$/)?.[1]||String(value||'').match(/HSK ([1-6])/)?.[1]||2);
export const difficultyRevision=state=>Number(state.learningDifficulty?.revision)||0;
export function teachingLevel(state,outline){
 const manual=state.plan?.some(step=>step.lessonId===outline.id)?state.planAdaptation:null;
 const adaptive=state.learningDifficulty;
 if(manual?.level&&(!adaptive||Date.parse(manual.updatedAt||'')>Date.parse(adaptive.updatedAt||'')))return `HSK ${levelNumber(manual.level)}`;
 return adaptive?.level||manual?.level||outline.level||state.profile?.level||'HSK 2';
}
export function performanceEvidence(state,exerciseSet,results,baseLevel){
 const current={exerciseSetId:exerciseSet.id,lessonId:exerciseSet.lessonId,level:`HSK ${levelNumber(exerciseSet.level||baseLevel)}`,correct:results.filter(item=>item.correct).length,total:results.length,timestamp:new Date().toISOString()};
 current.accuracy=Math.round(current.correct/current.total*100);
 const previous=(state.quizPerformance||[]).filter(item=>item.exerciseSetId!==exerciseSet.id);
 const history=[...previous,current].slice(-30),recent=history.slice(-5);
 const total=recent.reduce((sum,item)=>sum+item.total,0),correct=recent.reduce((sum,item)=>sum+item.correct,0),accuracy=Math.round(correct/total*100);
 const level=levelNumber(baseLevel),atCurrentLevel=recent.filter(item=>levelNumber(item.level)===level);
 const currentTotal=atCurrentLevel.reduce((sum,item)=>sum+item.total,0),currentCorrect=atCurrentLevel.reduce((sum,item)=>sum+item.correct,0);
 const canIncrease=level<6&&recent.length>=2&&total>=8&&correct/total>=0.85&&atCurrentLevel.length>=2&&currentTotal>=8&&currentCorrect/currentTotal>=0.85;
 const canDecrease=level>1&&total>=4&&correct/total<=0.5&&currentTotal>=4&&currentCorrect/currentTotal<=0.5;
 const sustainedLow=canDecrease&&atCurrentLevel.length>=2&&currentTotal>=8;
 const allowedActions=canIncrease?['increase']:sustainedLow?['decrease']:['maintain',...(canDecrease?['decrease']:[])];
 return {history,current,evidence:{currentLevel:`HSK ${level}`,correct,total,accuracy,attemptCount:recent.length,recentAttempts:recent,currentLevelAttemptCount:atCurrentLevel.length,currentLevelQuestions:currentTotal,allowedActions,allowedLevels:allowedActions.map(action=>`HSK ${level+(action==='increase'?1:action==='decrease'?-1:0)}`),note:'First answers only. At most five recent sets. At least two sets/eight questions at the current level with 85% accuracy both overall and at that level requires a one-step increase. At least two sets/eight questions at the current level with 50% or less accuracy both overall and at that level requires a one-step decrease. A single low set of at least four answers permits either maintenance or a decrease. Obey the sole allowed action when only one is supplied; do not use insufficient-sample reasoning to maintain after the sustained-evidence threshold. HSK 1 and HSK 6 remain boundaries, and unknown topics still need a foundation check.'}};
}
export function validateDifficultyAdjustment(value,evidence,previous,sourceExerciseSetId,language){
 const invalid=()=>Object.assign(new Error('The learning service returned an invalid difficulty adjustment. Please try again.'),{status:502});
 const base=levelNumber(evidence.currentLevel),delta=value?.action==='increase'?1:value?.action==='decrease'?-1:0;
 if(!evidence.allowedActions.includes(value?.action)||value.level!==`HSK ${base+delta}`||typeof value.reason!=='string'||!value.reason.trim()||typeof value.focus!=='string'||!value.focus.trim())throw invalid();
 return {action:value.action,previousLevel:evidence.currentLevel,level:value.level,reason:value.reason.trim().slice(0,2000),focus:value.focus.trim().slice(0,1500),correct:evidence.correct,total:evidence.total,accuracy:evidence.accuracy,attemptCount:evidence.attemptCount,language,updatedAt:new Date().toISOString(),revision:(Number(previous?.revision)||0)+1,sourceExerciseSetId};
}
