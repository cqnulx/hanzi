import { getLocalizedLessons } from './content.js';
import { getLanguage, setLanguage, translateText, applyTranslations, observeTranslations } from './i18n.js';
import { LANGUAGES, normalizeLanguage, languageInfo } from './languages.js';
import { getSpeechSupport, speakChinese, stopSpeaking, startRecognition } from './speech.js';
import { createLessonVideo } from './lesson-video.js';
import { API_BASE_URL } from './deployment-config.js';
import { initializeLulu } from './lulu.js?v=music-2';
let luluGuide=null;
let lessons=getLocalizedLessons(getLanguage());

const localHost=['localhost','127.0.0.1','::1','[::1]'].includes(location.hostname);
const configuredBackend=localHost?'':String(API_BASE_URL||'').trim().replace(/\/+$/,'');
const staticPagesMode=location.hostname.endsWith('.github.io')&&!configuredBackend;
const serviceNotConnected='The learning service is not connected yet. You can use Chinese pronunciation now; guided lessons will be available when the service is connected.';
const serviceUnavailable='The learning service is temporarily offline. Please try again shortly. Chinese pronunciation is still available.';
// This installation keeps the same learning data when its public tunnel URL changes.
const remoteSessionKey='hanzi-session:qiuxicqu-hanzi-computer';
let remoteSession='';
try{if(configuredBackend){const saved=localStorage.getItem(remoteSessionKey)||'',legacy=localStorage.getItem(`hanzi-session:${configuredBackend}`)||'';remoteSession=/^[a-f0-9]{64}$/.test(saved)?saved:/^[a-f0-9]{64}$/.test(legacy)?legacy:'';if(remoteSession&&saved!==remoteSession)localStorage.setItem(remoteSessionKey,remoteSession);}}catch{}
function apiUrl(path){
 if(!configuredBackend)return `/api${path}`;
 let backend;try{backend=new URL(configuredBackend);}catch{throw new Error('The learning service address is unavailable.');}
 if(backend.protocol!=='https:'||backend.username||backend.password||backend.search||backend.hash||backend.pathname!=='/')throw new Error('The learning service address is unavailable.');
 return `${backend.origin}/api${path}`;
}
function emptyLearningState(){return {profile:{name:'Learner',nativeLanguage:'English',level:'HSK 1',dailyMinutes:15,goal:'Everyday conversation'},memories:[],activities:[],mastery:{},reviews:{},reflections:[],stats:{},plan:[]};}
function serviceNotice(){return staticPagesMode||app.serviceUnavailable?`<section class="notice service-notice" role="status"><span>${staticPagesMode?serviceNotConnected:serviceUnavailable}</span><button class="text-button" data-view="speak">Open pronunciation</button>${!staticPagesMode?'<button class="text-button" data-action="retry-service">Try again</button>':''}</section>`:'';}

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const supportText = item => item.translation || item.english || '';
const supportLocale = item => item.translation ? languageInfo(getLanguage()).locale : 'en';
function populateLanguageSelectors(){
 const options=valueKey=>LANGUAGES.map(item=>`<option value="${esc(item[valueKey])}" lang="${item.locale}" data-no-translate>${esc(item.nativeName)}</option>`).join('');
 const interfaceSelector=$('#interface-language'),supportSelector=$('#learner-language');
 if(interfaceSelector){interfaceSelector.innerHTML=options('code');interfaceSelector.value=getLanguage();}
 if(supportSelector){supportSelector.innerHTML=options('name');supportSelector.value=languageInfo(getLanguage()).name;}
}
function localizedCatalogue(){
 const language=getLanguage();
 return getLocalizedLessons(language).map(lesson=>({...lesson,...Object.fromEntries(['title','subtitle','category','description'].map(key=>[key,translateText(lesson[key],language)])),objectives:(lesson.objectives||[]).map(value=>translateText(value,language))}));
}
const icons = {
  arrow:'M5 12h14m-6-6 6 6-6 6',play:'m9 5 11 7-11 7V5Z',sound:'m11 5-6 4H2v6h3l6 4V5Zm4 3c2 2 2 6 0 8m3-11c4 4 4 10 0 14',
  check:'m5 12 4 4L19 6',spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  mic:'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a6 6 0 0 0 12 0m-6 6v4m-3 0h6',
  pen:'m4 16-1 5 5-1L20 8l-4-4L4 16Zm10-10 4 4',book:'M3 5c4-2 7-1 9 1 2-2 5-3 9-1v15c-4-2-7-1-9 1-2-2-5-3-9-1V5Zm9 1v15',
  clock:'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',memory:'M8 3H5v4M3 9V7m5 14H5v-4m14-10V3h-3m5 14v4h-5M8 9h8M8 13h8M8 17h5',
  leaf:'M20 3C8 2 2 8 5 15s15 3 15-12ZM4 21 16 8',send:'m3 3 18 9-18 9 4-9-4-9Zm4 9h14',close:'m6 6 12 12M6 18 18 6',
  refresh:'M20 7v5h-5M4 17v-5h5m-4-2a7 7 0 0 1 12-5l3 3M4 16l3 3a7 7 0 0 0 12-5',info:'M12 11v6m0-10v1m9 4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};
const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name] || icons.spark}"/></svg>`;
const app = {state:null,view:'overview',lessonId:null,phraseIndex:0,chat:[],writingResult:null,speakingResult:null,quizResult:null,writingText:localStorage.getItem('hanzi-writing-draft')||'',writingLessonId:null,videos:new Map(),recording:null,recordTimer:null,lessonSessions:new Map(),exerciseSets:new Map(),practiceRuns:new Map(),lessonPending:new Map(),lessonErrors:new Map(),exercisePending:new Set(),planPending:false};
let learningRevision=0,feedbackRevision=0,contentGeneration=0;
const difficultyRevision=state=>Number(state?.learningDifficulty?.revision)||0;
const localizedGuidance=record=>record?.translations?.[getLanguage()]||(record?.language===getLanguage()?record:null);
const guidancePlaceholder=()=>translateText('Preparing guidance in your language…');
const localizationRequests=new Map();
function localizationSignature(language){
 const state=app.state;if(!state)return null;
 const courses=(state.customLessons||[]).filter(item=>!item.translations?.[language]);
 const adaptation=state.planAdaptation,difficulty=state.learningDifficulty;
 const missingAdaptation=adaptation&&!adaptation.translations?.[language]&&adaptation.language!==language;
 const missingDifficulty=difficulty&&!difficulty.translations?.[language]&&difficulty.language!==language;
 if(!courses.length&&!missingAdaptation&&!missingDifficulty)return null;
 return JSON.stringify([language,courses.map(item=>[item.id,item.createdAt]),missingAdaptation?[adaptation.updatedAt,adaptation.reason,adaptation.levelReason]:null,missingDifficulty?[difficulty.revision,difficulty.reason,difficulty.focus]:null]);
}
async function ensureLocalizedLearning(retry=false){
 const language=getLanguage(),signature=localizationSignature(language),revision=learningRevision;
 if(!signature||(!retry&&localizationRequests.has(signature)))return;
 const pending=(async()=>{try{await post('/localize-learning',{language});if(revision===learningRevision&&language===getLanguage()){app.localizationError=false;render();}}catch(error){localizationRequests.delete(signature);if(revision===learningRevision&&language===getLanguage()){app.localizationError=true;render();notify(error.message,'error');}}})();
 localizationRequests.set(signature,pending);return pending;
}
function guidanceStatus(){return app.localizationError?'<div class="notice"><span>Guidance translation is unavailable.</span><button class="text-button" data-action="retry-guidance">Try again</button></div>':'';}
function completedStudy(id){const item=app.completedQuiz;return app.view==='learn'&&item?.lesson.id===id&&item.language===getLanguage()?item:null;}
function invalidateDifficultyContent(){
 if(app.view==='write')persistDraft();
 contentGeneration++;clearPracticeFeedback();app.lessonPending.clear();app.exercisePending.clear();
 for(const video of app.videos.values())video.dispose?.();
 app.videos.clear();app.lessonSessions.clear();app.exerciseSets.clear();app.lessonErrors.clear();app.completedQuiz=null;
}
function difficultyCard(record=app.state?.learningDifficulty,{button=true,nested=false}={}){
 if(!record?.level)return '';
 const current=app.state?.learningDifficulty;
 if(current&&record.revision===current.revision&&record.sourceExerciseSetId===current.sourceExerciseSetId)record=current;
 const targetLessonId=app.lessonId||app.state?.quizPerformance?.at(-1)?.lessonId||lessons[0]?.id;
 if(app.state?.plan?.some(step=>step.lessonId===targetLessonId)&&(Date.parse(app.state.planAdaptation?.updatedAt)||0)>(Date.parse(record.updatedAt)||0))return '';
 const direction={increase:'A little more challenge',decrease:'More support next time',maintain:'Keep this difficulty'}[record.action]||'Keep this difficulty';
 const translated=localizedGuidance(record),sourceLanguage=languageInfo(getLanguage()).locale,lessonId=app.lessonId||app.state?.quizPerformance?.at(-1)?.lessonId||lessons[0]?.id;
 const accuracy=Math.max(0,Math.min(100,Number(record.accuracy)||0));
 return `<section class="${nested?'':'card '}difficulty-card" aria-label="Next learning difficulty"><div class="difficulty-card-heading"><div><span class="eyebrow">YOUR NEXT LEARNING DIFFICULTY</span><h2>${direction}</h2></div><div class="difficulty-level"><span>Next practice</span><strong>${esc(record.level)}</strong>${record.previousLevel&&record.previousLevel!==record.level?`<small><span>Previous practice</span> ${esc(record.previousLevel)}</small>`:''}</div></div><div class="difficulty-evidence"><strong>${accuracy}%</strong><div><span>Recent first-attempt accuracy</span><small>${Number(record.correct)||0} / ${Number(record.total)||0} · ${Number(record.attemptCount)||0} <span>practice sets</span></small></div></div><p data-no-translate lang="${sourceLanguage}">${esc(translated?.reason||guidancePlaceholder())}</p>${translated?.focus?`<p class="difficulty-focus"><strong>Next focus:</strong> <span data-no-translate lang="${sourceLanguage}">${esc(translated.focus)}</span></p>`:''}<p class="muted small">Teaching difficulty suggestion, not a proficiency assessment.</p>${button?`<button class="button button-primary" data-action="start-next-learning" data-lesson-id="${esc(lessonId)}">Start next learning step ${icon('arrow',17)}</button>`:''}</section>`;
}
function clearPracticeFeedback(){feedbackRevision++;app.speakingResult=null;app.writingResult=null;}
function syncCatalogue(){
 const custom=(app.state?.customLessons||[]).filter(lesson=>lesson&&typeof lesson.id==='string'&&lesson.id.startsWith('custom-')).map(lesson=>({...lesson,...(lesson.translations?.[getLanguage()]||{title:translateText('Personalised lesson'),subtitle:guidancePlaceholder(),description:guidancePlaceholder(),objectives:[]}),phrases:[],vocabulary:[],videoFrames:[],personalized:true})).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 lessons=[...custom,...localizedCatalogue()];
 if(Object.hasOwn(app.state||{},'planAdaptation'))app.planAdaptation=app.state.planAdaptation;
 const preferred=app.planAdaptation?.selectedLessonId;
 if(!lessons.some(lesson=>lesson.id===app.lessonId))app.lessonId=lessons.some(lesson=>lesson.id===preferred)?preferred:custom[0]?.id||lessons[0].id;
 if(!lessons.some(lesson=>lesson.id===app.writingLessonId))app.writingLessonId=app.lessonId;
 if(!custom.some(lesson=>lesson.id===app.addedLessonId))app.addedLessonId=null;
}
function acceptAddedLesson(response){
 const feedbackText=app.planFeedbackText,feedbackResult=app.planFeedbackResult;
 if(app.view==='write')persistDraft();
 clearGeneratedLearning();app.planFeedbackText=feedbackText;app.planFeedbackResult=feedbackResult;
 app.planAdaptation=response.adaptation||null;
 app.addedLessonId=response.addedLesson?.id||null;
 syncCatalogue();
 const selectedId=response.addedLesson?.id||response.adaptation?.selectedLessonId;
 const lesson=lessons.find(item=>item.id===selectedId);if(!lesson)return;
 clearPracticeFeedback();app.lessonId=lesson.id;app.writingLessonId=lesson.id;app.phraseIndex=0;app.quizResult=null;
}
function addedLessonCard(){
 const adaptation=app.planAdaptation||app.state?.planAdaptation;if(!adaptation)return '';
 const lesson=lessons.find(item=>item.id===(adaptation.selectedLessonId||app.addedLessonId));
 const created=adaptation.action==='create-course'&&lesson?.personalized;
 const title=created?'New course added':adaptation.action==='use-existing'?'Existing course updated':'Practice plan updated';
 const translated=localizedGuidance(adaptation);
 return `<section class="card added-lesson-card" id="plan-adaptation-result" role="status"><div><span class="badge">${title}</span>${lesson?`<h2>${esc(lesson.title)}</h2>`:`<h2>${title}</h2>`}<p data-no-translate>${esc(translated?.reason||guidancePlaceholder())}</p>${created?`<p>${esc(lesson.description||lesson.subtitle)}</p><p class="added-lesson-request"><span>From your request:</span> <q data-no-translate>${esc(lesson.sourceFeedback||'')}</q></p><p class="small">Added to Choose a lesson, speaking and writing topics. Your new course is selected.</p>`:''}<p class="small"><strong>Practice difficulty:</strong> ${esc(adaptation.level||app.state.profile.level)}</p>${translated?.levelReason?`<p class="small" data-no-translate>${esc(translated.levelReason)}</p>`:''}</div>${lesson?`<button class="button button-primary" data-lesson="${esc(lesson.id)}">${created?'Start new course':'Start this lesson'} ${icon('arrow',17)}</button>`:''}</section>`;
}
const courseKey = (id,language=getLanguage()) => `${id}:${language}`;
const catalogueLesson = id => lessons.find(l=>l.id===id)||lessons[0];
const lessonFor = id => app.lessonSessions.get(courseKey(id))?.lesson||app.practiceRuns.get(courseKey(id))?.lesson||completedStudy(id)?.lesson||catalogueLesson(id);
const selectedLesson = () => lessonFor(app.lessonId||lessons[0].id);
const writingLesson = () => lessonFor(app.writingLessonId||app.lessonId||lessons[0].id);
const isLessonReady = id => app.lessonSessions.has(courseKey(id))||Boolean(app.practiceRuns.get(courseKey(id))?.lesson)||Boolean(completedStudy(id));
const currentStudyId = () => app.view==='write'?writingLesson().id:selectedLesson().id;
const livePlan = () => ['live','llm'].includes(app.state?.planMode)&&app.state?.planLanguage===getLanguage()&&(Number(app.state.planDifficultyRevision)||0)===difficultyRevision(app.state)?app.state.plan||[]:[];
const memoryKind = m => m.kind||m.category;
const activeMemories = () => (app.state?.memories||[]).filter(m=>!['archived','superseded','deleted'].includes(m.status));
const labels = {overview:'Your learning space',learn:'Video lessons',speak:'Speaking studio',write:'Writing workshop',path:'Your learning path',memory:'Learning memory'};
function notify(text,kind='info') {const t=$('#toast');t.textContent=text;t.dataset.kind=kind;t.classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.remove('visible'),5000);}
async function exportLearningData(){
 if(staticPagesMode){notify(serviceNotConnected);return;}
 try{
  if(!configuredBackend){location.href=apiUrl('/export');return;}
  const data=await api('/export'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');
  link.href=url;link.download='hanzi-learning-data.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){notify(error.message,'error');}
}
let serviceRequestSequence=0,serviceStatusSequence=0;
function updateServiceBadge(){
 const status=$('#api-status');if(!status)return;
 const offline=staticPagesMode||app.serviceUnavailable,configured=app.serviceConfigured!==false;
 status.innerHTML=`<span class="tiny-dot"></span>${offline?'Pronunciation available':configured?'Learning companion ready':'Companion setup needed'}`;
 status.title=offline?(staticPagesMode?serviceNotConnected:serviceUnavailable):configured?'Ready to connect when you request learning guidance.':'Set up your learning companion to get started.';
 status.classList.toggle('offline',Boolean(offline));status.classList.toggle('connected',!offline&&configured);applyTranslations();
}
function setServiceConnection(available,sequence){
 if(sequence<serviceStatusSequence)return;
 serviceStatusSequence=sequence;app.serviceUnavailable=!available;updateServiceBadge();
 if(available)document.querySelectorAll('.service-notice').forEach(notice=>notice.remove());
 else if(app.state&&!$('.service-notice')){$('#view-root')?.insertAdjacentHTML('afterbegin',serviceNotice());applyTranslations();}
}
async function api(path,options={}) {
  if(staticPagesMode)throw new Error(serviceNotConnected);
  const {timeoutMs=120000,skipLocalization=false,...requestOptions}=options;
  const revision=learningRevision,session=remoteSession,sequence=++serviceRequestSequence,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  let receivedResponse=false,adoptedSession='';
  const currentSession=()=>revision===learningRevision&&(!configuredBackend||remoteSession===session||(adoptedSession&&remoteSession===adoptedSession));
  try {
   const r=await fetch(apiUrl(path),{...requestOptions,credentials:configuredBackend?'omit':'same-origin',headers:{'Content-Type':'application/json',...requestOptions.headers,...(configuredBackend&&session?{'X-Hanzi-Session':session}:{})},signal:controller.signal});receivedResponse=true;
   const nextSession=r.headers.get('X-Hanzi-Session')||'';
   if(path!=='/health'&&configuredBackend&&revision===learningRevision&&remoteSession===session&&/^[a-f0-9]{64}$/.test(nextSession)){remoteSession=nextSession;adoptedSession=nextSession;try{localStorage.setItem(remoteSessionKey,nextSession);}catch{}}
   const data=await r.json().catch(()=>({error:'Unreadable server response.'}));
   if(!r.ok)throw Object.assign(new Error(data.error||`Request failed (${r.status}).`),{status:r.status,retryable:r.status>=500});
   const incomingState=data.state||(path==='/state'&&data.profile?data:null);
   if(path==='/state'&&!incomingState)throw new Error('Unreadable server response.');
   const resetsDifficulty=path==='/profile'||path==='/data'||(requestOptions.method==='DELETE'&&path.startsWith('/memory/'));
   const acceptsState=!incomingState||difficultyRevision(incomingState)>=difficultyRevision(app.state)||resetsDifficulty;
   if(currentSession()&&acceptsState){
    if(incomingState){const changed=difficultyRevision(incomingState)!==difficultyRevision(app.state);app.state=incomingState;if(changed)invalidateDifficultyContent();syncCatalogue();updateProfileBadge();if(!skipLocalization&&path!=='/localize-learning')queueMicrotask(()=>ensureLocalizedLearning());}
    if(path==='/health'){if(typeof data.configured==='boolean')app.serviceConfigured=data.configured;if(app.state)updateServiceBadge();}
    else setServiceConnection(true,sequence);
   }
   return data;
  }
  catch(e){
   const timedOut=e.name==='AbortError'||e.name==='TimeoutError',networkError=!receivedResponse&&e instanceof TypeError;
   if(currentSession()&&path!=='/health'&&(path==='/state'||timedOut||networkError))setServiceConnection(false,sequence);
   if(timedOut)throw Object.assign(new Error('This request took too long. Please try again.'),{retryable:true});
   if(networkError)throw Object.assign(new Error(configuredBackend?serviceUnavailable:e.message),{retryable:true});throw e;
  }finally{clearTimeout(timer);}
}
const post = (path,data) => api(path,{method:'POST',body:JSON.stringify({language:getLanguage(),...data})});
async function busy(button,task,label='Working…') {if(!button||button.disabled)return;const original=button.innerHTML;button.disabled=true;button.innerHTML=`<span class="spinner"></span>${esc(label)}`;try{return await task();}catch(e){notify(e.message,'error');}finally{if(button.isConnected){button.disabled=false;button.innerHTML=original;}}}
function heading(eyebrow,title,description,aside='') {return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="muted">${description}</p></div>${aside}</div>`;}
function illustration(kind='greeting',hero=false) {
  if(hero)return `<svg viewBox="0 0 420 290" role="img" aria-label="Chinese learning cards, a teacup and a leafy branch"><defs><filter id="card-shadow"><feDropShadow dx="0" dy="9" stdDeviation="10" flood-color="#1b493c" flood-opacity=".1"/></filter></defs><circle cx="250" cy="147" r="119" fill="#dbe4d6"/><path d="M38 232c55-16 94-50 120-105" fill="none" stroke="#aabf9e" stroke-width="2"/><path d="M98 202c-42-33-29-53-29-53 30 3 44 22 29 53m21-23c-4-38 13-47 13-47 22 23 17 41-13 47" fill="#8da57d"/><g transform="translate(161 42) rotate(12 89 92)" filter="url(#card-shadow)"><rect width="165" height="206" rx="15" fill="#b7c9b0"/></g><g transform="translate(117 37) rotate(-9 85 101)" filter="url(#card-shadow)"><rect width="166" height="208" rx="15" fill="#fffdf6"/><rect x="15" y="16" width="136" height="139" rx="7" fill="#f1efe5"/><path d="M83 22v128M20 85h127M22 24l122 122M145 24 22 145" stroke="#dcdccd" stroke-dasharray="3 5"/><text x="83" y="118" text-anchor="middle" font-family="KaiTi,STKaiti,serif" font-size="99" fill="#275242">汉</text><text x="83" y="180" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#426858">hàn · a world of words</text></g><circle cx="330" cy="70" r="25" fill="#d57b56"/><path d="m319 71 8 8 14-17" fill="none" stroke="#fff7eb" stroke-width="3" stroke-linecap="round"/><ellipse cx="324" cy="250" rx="57" ry="9" fill="#b8c9ae" opacity=".5"/><path d="M290 207h63l-6 31c-3 17-45 17-49 0l-8-31Z" fill="#e6a774"/><ellipse cx="321" cy="207" rx="32" ry="9" fill="#f8d7b3"/><ellipse cx="321" cy="207" rx="25" ry="6" fill="#92734e"/><path d="M351 212c30-7 29 27-1 21" fill="none" stroke="#d38f5c" stroke-width="7"/><path d="M311 188c-12-14 10-14 0-28m16 30c-12-14 10-14 0-28" fill="none" stroke="#8fa184" stroke-width="2" stroke-linecap="round"/><path d="M78 52v20m-10-10h20m273 78v17m-8-8h17" stroke="#b0bf9e" stroke-width="2"/></svg>`;
  const n=Math.max(0,lessons.findIndex(l=>l.id===kind||l.accent===kind));
  const palette=[['#dfe8d9','#315b4c','你好'],['#f3dfca','#b76f43','茶'],['#e4e6ed','#69769d','去'],['#eee2dc','#a56b62','过'],['#e4e8d5','#778653','请'],['#e5e1ed','#8a749f','早']];const [bg,fg,char]=palette[n%6];
  return `<svg viewBox="0 0 320 150" role="img" aria-label="Chinese lesson illustration"><rect width="320" height="150" fill="${bg}"/><circle cx="254" cy="20" r="84" fill="${fg}" opacity=".07"/><circle cx="43" cy="150" r="68" fill="${fg}" opacity=".07"/><g transform="translate(113 14) rotate(-7 48 60)"><rect width="100" height="124" rx="10" fill="#fffdf6"/><path d="M50 10v91M10 55h80" stroke="${fg}" stroke-opacity=".13" stroke-dasharray="3 4"/><text x="50" y="83" text-anchor="middle" font-family="KaiTi,STKaiti,serif" font-size="${n===0?39:65}" fill="${fg}">${char}</text><rect x="25" y="108" width="50" height="3" rx="1.5" fill="${fg}" opacity=".22"/></g><path d="M65 57v15m-7-7h15m174 27v13m-6-6h13" stroke="${fg}" stroke-opacity=".4" stroke-width="2"/><circle cx="239" cy="51" r="5" fill="${fg}" opacity=".3"/></svg>`;
}
function lessonCard(l) {return `<button class="lesson-card" data-lesson="${esc(l.id)}" aria-label="Open ${esc(l.title)}"><div class="lesson-art">${illustration(l.id)}</div><div class="lesson-content"><div class="lesson-meta"><span class="tag">${esc(l.level)}</span><span class="muted">${icon('clock',13)} ${l.duration} min</span></div><h3>${esc(l.title)}</h3><p>${esc(l.subtitle)}</p><span class="lesson-link">Start lesson ${icon('arrow',16)}</span></div></button>`;}
function todayMinutes() {return(app.state.activities||[]).filter(a=>(a.createdAt||a.timestamp||'').slice(0,10)===new Date().toISOString().slice(0,10)).reduce((n,a)=>n+(Number(a.minutes)||0),0);}
function renderOverview() {
 const p=app.state.profile,s=app.state.stats||{},minutes=todayMinutes(),goal=Number(p.dailyMinutes)||15,completed=new Set((app.state.activities||[]).filter(a=>a.type==='lesson'&&a.lessonId).map(a=>a.lessonId)),next=lessons.find(l=>!completed.has(l.id))||lessons[0];
 const planned=livePlan().slice(0,3);
 return `${heading('YOUR CHINESE JOURNEY',`Hello, ${esc(p.name)}. <span class="greeting-hanzi" lang="zh-CN">你好！</span>`,'A little practice today. A little more confidence tomorrow.',`<span class="date-label">${icon('leaf',17)} Grow at your own pace</span>`)}<section class="hero"><div class="hero-copy"><span class="eyebrow">A LANGUAGE. A CONNECTION.</span><h2>Small steps.<br><em>Real conversations.</em></h2><p>Learn Chinese for the moments that matter—with a companion that grows with you.</p><div class="hero-actions"><button class="button button-primary" data-lesson="${esc(next.id)}">Let's learn ${icon('arrow',18)}</button><button class="button button-ghost" data-view="path">Explore my path</button></div><div class="hero-note"><span class="tiny-dot"></span> ${esc(p.level)} · ${p.dailyMinutes} minutes a day · Your pace</div></div><div class="hero-art">${illustration('',true)}</div></section>
 <div class="dashboard-grid"><div class="dashboard-main"><section><div class="section-heading"><div><span class="eyebrow">FROM WORDS TO EVERYDAY LIFE</span><h2>Your next little adventure</h2></div><button class="text-button" data-view="learn">All lessons ${icon('arrow',16)}</button></div><div class="lesson-grid">${lessons.slice(0,3).map(lessonCard).join('')}</div></section><section class="practice-strip"><div class="practice-strip-icon">${icon('pen',24)}</div><div><h3>A blank page. Your own words.</h3><p>Turn what you've learned into a story, with a little guidance.</p></div><button class="button button-secondary" data-view="write">Start writing ${icon('arrow',16)}</button></section><section class="stats-grid"><div class="stat-card"><span>${icon('book',19)} Lessons explored</span><strong>${completed.size}<small> / ${lessons.length}</small></strong></div><div class="stat-card"><span>${icon('mic',19)} Speaking practices</span><strong>${Number(s.speakingCount)||0}</strong></div><div class="stat-card"><span>${icon('pen',19)} Writing sessions</span><strong>${Number(s.writingCount)||0}</strong></div></section></div><aside class="dashboard-aside"><section class="card daily-card"><div class="section-heading"><h3>Your daily rhythm</h3><span class="badge">${goal} min goal</span></div><div class="daily-progress"><strong>${minutes}<span> / ${goal} min</span></strong><span>${Math.min(100,Math.round(minutes/goal*100))}%</span></div><div class="progress-track"><span style="width:${Math.min(100,minutes/goal*100)}%"></span></div><p class="muted small">${minutes?'Every bit of practice counts.':'A fresh start. Make a little room for Chinese.'}</p><div class="daily-list">${planned.length?planned.map((v,i)=>`<button class="daily-item" ${v.view?`data-view="${v.view}"`:`data-lesson="${esc(v.lessonId||next.id)}"`}><span class="step-number">0${i+1}</span><span>${esc(v.title)}<small>${v.duration} min</small></span>${icon('arrow',15)}</button>`).join(''):`<div class="empty-state"><h3>Your learning plan starts here</h3><p>Your companion will choose your next steps from your learning evidence.</p><button class="button button-primary" data-action="generate-plan" ${app.planPending?'disabled':''}>${app.planPending?'Preparing your next step…':'Build my learning plan'}</button></div>`}</div></section><section class="card phrase-card"><div class="eyebrow">A PHRASE TO KEEP</div><div class="phrase-hanzi" lang="zh-CN">慢慢来</div><div class="pinyin">màn màn lái</div><p>Take your time.</p><div class="phrase-footer"><span class="muted small">Progress has its own pace.</span><button class="audio-button" data-say="慢慢来" aria-label="Hear màn màn lái">${icon('sound',19)}</button></div></section><section class="memory-peek"><span>${icon('memory',22)}</span><div><h3>Learning that remembers you.</h3><p>${activeMemories().length?`${activeMemories().length} learning memories help your companion understand your journey.`:'Your goals, discoveries and practice will shape your next steps.'}</p><button class="text-button" data-view="memory">Meet your learning memory ${icon('arrow',14)}</button></div></section></aside></div>`;
}
function lessonOptions(id) {return lessons.map(l=>`<option value="${esc(l.id)}" ${l.id===id?'selected':''}>${l.personalized?`${esc(translateText('Custom ·'))} `:''}${esc(l.title)} · ${esc(l.level)}</option>`).join('');}
function videoMarkup(video,l) {return `<video id="lesson-video" controls playsinline preload="metadata" aria-label="${esc(l.title)} captioned animated video"><source src="${esc(video.url)}" type="${esc(video.mimeType||'video/webm')}">Use the phrase cards below if playback is unavailable.</video><span class="video-kind">Captioned animation · listen to Mandarin below</span>`;}
function chatMarkup() {return app.chat.length?app.chat.map(m=>`<div class="message message-${m.role==='user'?'user':'assistant'}"><span class="message-label">${m.role==='user'?'YOU':'LEARNING COMPANION'}</span><p data-no-translate>${esc(m.content)}</p></div>`).join(''):`<div class="message message-assistant"><span class="message-label">LEARNING COMPANION</span><p>Hi ${esc(app.state.profile.name)}! Ask me about a phrase, try your own sentence, or tell me what feels tricky. We can take it step by step.</p></div>`;}
function renderLearn() {
 const l=selectedLesson(),v=app.videos.get(courseKey(l.id));
 return `${heading('LISTEN. NOTICE. DISCOVER.','Chinese for the everyday.','Short video lessons, useful phrases and a companion ready for your questions.',`<label class="lesson-select-label">Choose a lesson<select id="lesson-select" class="input">${lessonOptions(l.id)}</select></label>`)}${lessonProvenance(l)}<div class="video-layout"><div><section class="card video-card"><div id="video-container" class="video-frame">${v?videoMarkup(v,l):`<div class="video-poster">${illustration(l.id)}<div class="video-poster-copy"><span class="eyebrow">HANZI SHORT LESSON</span><h2>${esc(l.title)}</h2><p>${esc(l.subtitle)}</p><button class="button button-primary" data-action="prepare-video">${icon('play',18)} Play animated lesson</button><small>Captioned learning video · ready in about 15 seconds</small></div></div>`}</div><div class="video-caption"><div><span class="tag">${esc(l.level)}</span><h2>${esc(l.title)}</h2><p class="muted">${esc(l.description)}</p></div><button class="button button-secondary" data-action="complete-lesson">${icon('check',17)} Mark explored</button></div></section><section class="card phrase-section"><div class="section-heading"><h3>Listen, then make it yours.</h3><span class="muted small">Mandarin audio · tap to listen</span></div>${l.phrases.map((p,i)=>`<div class="transcript-line"><span class="phrase-number">${String(i+1).padStart(2,'0')}</span><div><strong lang="zh-CN">${esc(p.hanzi)}</strong><span class="pinyin" data-no-translate>${esc(p.pinyin)}</span><p lang="${supportLocale(p)}" data-no-translate>${esc(supportText(p))}</p></div><button class="audio-button" data-say="${esc(p.hanzi)}" aria-label="${esc(translateText('Listen'))}: ${esc(supportText(p))}">${icon('sound',19)}</button></div>`).join('')}<div class="lesson-bottom-actions"><button class="button button-secondary" data-view="speak">${icon('mic',17)} Practise speaking</button><button class="button button-ghost" data-view="write">Use it in writing ${icon('arrow',16)}</button></div></section>${quizPanel(l)}</div><aside class="chat-panel card"><div class="chat-panel-heading"><div class="companion-avatar">汉</div><div><h3>Your Chinese companion</h3><span class="muted small">Thoughtful guidance, one step at a time</span></div></div><div class="chat-context"><span>${icon('memory',15)} Learning with context</span><p>${activeMemories().length?`${activeMemories().length} memories · ${esc(app.state.profile.level)} · ${esc(app.state.profile.goal)}`:'Your companion will build context as you learn.'}</p></div><div id="chat-messages" class="chat-messages" aria-live="polite">${chatMarkup()}</div><div class="chat-suggestions"><button data-chat-prompt="Explain this lesson in simple ${languageInfo(getLanguage()).name}, with Chinese examples and pinyin.">Explain this lesson</button><button data-chat-prompt="Give me one short practice question about this lesson. Let me try before you give the answer.">Give me a challenge</button></div><form id="chat-form" class="chat-form"><label class="sr-only" for="chat-input">Ask your Chinese companion</label><textarea id="chat-input" rows="2" maxlength="3000" placeholder="Ask a question, or try a sentence…" required></textarea><button class="button button-primary icon-only" type="submit" aria-label="Send message">${icon('send',18)}</button></form><p class="chat-disclosure">Your learning companion · Check feedback as you learn.</p></aside></div>`;
}
function renderPronunciationPanel(){
 return `<section class="card pronunciation-panel"><div class="section-heading"><div><span class="eyebrow">YOUR WORDS, ALOUD</span><h2>Read any Chinese aloud</h2></div><span class="badge">Mandarin pronunciation</span></div><p>Type any Chinese character, word or sentence. Listen, slow it down and try it yourself.</p><form id="pronunciation-form"><label for="pronunciation-text">Chinese to read aloud</label><textarea id="pronunciation-text" class="textarea chinese-input" rows="3" maxlength="2000" placeholder="For example: 你好！我想学习中文。" required>${esc(app.pronunciationText||'')}</textarea><div class="audio-actions"><label for="pronunciation-rate">Playback speed</label><select id="pronunciation-rate" class="input" style="width:auto"><option value="0.6" ${app.pronunciationRate==='0.6'?'selected':''}>Slow</option><option value="0.8" ${!app.pronunciationRate||app.pronunciationRate==='0.8'?'selected':''}>Natural</option><option value="1" ${app.pronunciationRate==='1'?'selected':''}>Fluent</option></select><button class="button button-primary" type="submit">${icon('sound',18)} Read aloud</button><button class="button button-secondary" type="button" data-action="stop-pronunciation">Stop playback</button><button class="text-button" type="button" data-action="clear-pronunciation">Clear text</button></div><p id="pronunciation-status" class="muted small" role="status" aria-live="polite">Hear a character, word or sentence at your own pace.</p></form></section>`;
}
function pronunciationStatus(message){const status=$('#pronunciation-status');if(status){status.textContent=message;applyTranslations();}}
async function readPronunciation(button){
 const text=($('#pronunciation-text')?.value||'').trim();app.pronunciationText=text;app.pronunciationRate=$('#pronunciation-rate')?.value||'0.8';
 if(!/[\p{Script=Han}]/u.test(text)){pronunciationStatus('Enter at least one Chinese character to hear Mandarin pronunciation.');$('#pronunciation-text')?.focus();return;}
 const token=app.pronunciationToken=(app.pronunciationToken||0)+1;
 await busy(button,async()=>{pronunciationStatus('Preparing pronunciation…');try{await speakChinese(text,{rate:Number(app.pronunciationRate),onEnd:()=>{if(app.pronunciationToken===token)pronunciationStatus('Playback finished.');},onError:error=>{if(app.pronunciationToken===token)pronunciationStatus(error.message);}});if(app.pronunciationToken!==token){stopSpeaking();return;}pronunciationStatus('Playing Mandarin pronunciation.');}catch(error){if(app.pronunciationToken===token)pronunciationStatus(error.message);throw error;}},'Preparing pronunciation…');
}
function resetPronunciation(clear=false){app.pronunciationToken=(app.pronunciationToken||0)+1;stopSpeaking();if(clear){app.pronunciationText='';const field=$('#pronunciation-text');if(field){field.value='';field.focus();}pronunciationStatus('Your text is cleared. Enter Chinese to begin.');}else pronunciationStatus('Playback stopped.');}
function renderSpeak() {
 const l=selectedLesson(),p=l.phrases[app.phraseIndex%l.phrases.length],support=getSpeechSupport();
 return `${heading('FIND YOUR VOICE','A little braver, out loud.','Listen to Mandarin, try a phrase, then compare what was recognised.',`<label class="lesson-select-label">Practice topic<select id="lesson-select" class="input">${lessonOptions(l.id)}</select></label>`)}${renderPronunciationPanel()}<div class="two-column speaking-layout"><section class="card practice-card"><div class="section-heading"><span class="tag">${esc(l.category)}</span><span class="muted small">Phrase ${app.phraseIndex%l.phrases.length+1} of ${l.phrases.length}</span></div><div class="speaking-illustration">${illustration(l.id)}</div><div class="phrase-display" lang="zh-CN">${esc(p.hanzi)}</div><div class="pinyin" data-no-translate>${esc(p.pinyin)}</div><p class="translation" lang="${supportLocale(p)}" data-no-translate>${esc(supportText(p))}</p><div class="audio-actions"><button class="button button-secondary" data-say="${esc(p.hanzi)}">${icon('sound',18)} Listen</button><button class="button button-ghost" data-say="${esc(p.hanzi)}" data-rate="0.6">Listen slowly</button></div><div class="recording-area"><button class="record-button" id="record-button" data-action="record" aria-label="Start Mandarin speech recognition">${icon('mic',28)}</button><p id="recording-status">${support.recognition?'Tap the microphone and give it a try.':'Microphone transcription is unavailable in this browser.'}</p><span class="muted small">${support.recognition?'Recognition uses your browser’s speech service.':'Try Chrome or Edge, or enter your transcript below.'}</span></div><button class="text-button" data-action="next-phrase">Try another phrase ${icon('arrow',16)}</button></section><aside><section class="card transcript-card"><span class="eyebrow">YOUR WORDS, HEARD BACK</span><h2>Let's see what came through.</h2><form id="speaking-form"><label for="spoken-transcript">Recognised words / manual transcript</label><textarea id="spoken-transcript" class="textarea chinese-input" rows="4" maxlength="1000" placeholder="Your recognised Chinese appears here. You can also type it." required></textarea><button class="button button-primary" type="submit">Get speaking feedback ${icon('arrow',16)}</button></form><div id="speaking-result" aria-live="polite">${app.speakingResult?speakingResults(app.speakingResult):''}</div></section><section class="card tip-card"><span class="tip-icon">${icon('info',21)}</span><h3>One phrase, a few small steps.</h3><ol><li>Listen once without reading.</li><li>Listen again and follow the pinyin.</li><li>Speak slowly, then try a natural rhythm.</li></ol><p class="muted small">Transcript matching checks recognised characters. It does not measure tones or provide a pronunciation score.</p></section></aside></div>`;
}
function speakingResults(r) {return `<div class="speaking-feedback"><span class="badge">Learning companion</span><span class="eyebrow">TRANSCRIPT MATCH</span><div class="match-value">${Math.round(Number(r.accuracy)||0)}<small>%</small></div><p data-no-translate>${esc(r.feedback)}</p>${r.nextStep?`<div class="next-step"><span class="eyebrow">YOUR NEXT SMALL STEP</span><p data-no-translate>${esc(r.nextStep)}</p></div>`:''}<span class="muted small">${r.matchedCharacters} / ${r.totalCharacters} target characters matched</span></div>`;}
const countCharacters = text => (String(text).match(/[\p{Script=Han}]/gu)||[]).length;
function renderWrite() {
 const l=writingLesson(),p=l.writingPrompt;
 return `${heading('YOUR IDEAS, IN CHINESE','Every story starts somewhere.','Try a sentence, build a paragraph, and find your own way to say it.',`<label class="lesson-select-label">Writing topic<select id="writing-topic" class="input">${lessonOptions(l.id)}</select></label>`)}<div class="writing-layout"><div><section class="prompt-card"><span class="eyebrow">TODAY'S INVITATION</span><h2>${esc(p.title)}</h2><p>${esc(p.instruction)}</p><span class="prompt-tip">${icon('spark',16)} ${esc(p.tip)}</span></section><section class="card writing-editor"><div class="editor-toolbar"><span>${icon('pen',17)} Your writing space</span><span id="writing-count">${countCharacters(app.writingText)} Chinese characters</span></div><label class="sr-only" for="writing-text">Write your Chinese response</label><textarea id="writing-text" class="chinese-input" rows="11" maxlength="10000" placeholder="${esc(p.starter)}">${esc(app.writingText)}</textarea><div class="editor-tools"><button class="text-button" data-action="insert-starter">Start with a hint</button><span class="muted small">Draft saved in this browser</span></div><div class="editor-footer"><div><span class="muted small">Feedback in your support language · corrections in Chinese</span><small>Your writing is used to prepare feedback when you request it.</small></div><button class="button button-primary" data-action="review-writing">${icon('spark',17)} Get feedback</button></div></section><div class="writing-assist"><span>Need a word?</span>${l.vocabulary.slice(0,5).map(v=>`<button data-no-translate data-insert="${esc(v.hanzi)}" title="${esc(v.pinyin)} · ${esc(supportText(v))}"><span lang="zh-CN">${esc(v.hanzi)}</span> <small lang="${supportLocale(v)}">${esc(supportText(v))}</small></button>`).join('')}</div></div><aside class="card writing-feedback"><div class="section-heading"><h3>A little guidance</h3><span>${icon('leaf',21)}</span></div><div id="writing-feedback" aria-live="polite">${app.writingResult?writingResults(app.writingResult):`<div class="feedback-empty"><div class="feedback-illustration">文</div><h3>Your words come first.</h3><p>Write a little, then ask for feedback. We'll look at what works, explain useful changes, and suggest one next step.</p><div class="feedback-points"><span>${icon('check',15)} Grammar & word choice</span><span>${icon('check',15)} Clear explanations in your support language</span><span>${icon('check',15)} Keep your own voice</span></div></div>`}</div></aside></div>`;
}
function writingResults(r) {return `<div class="writing-feedback-content"><p data-no-translate>${esc(r.overallFeedback)}</p>${r.strengths?.length?`<div class="strengths"><span class="eyebrow">WHAT'S WORKING</span>${r.strengths.map(s=>`<p data-no-translate>${icon('check',15)} ${esc(s)}</p>`).join('')}</div>`:''}<div class="corrections"><span class="eyebrow">SMALL CHANGES, CLEARER MEANING</span>${r.corrections?.length?r.corrections.map((c,i)=>`<div class="correction-card"><div><del lang="zh-CN">${esc(c.original)}</del>${icon('arrow',14)}<strong lang="zh-CN">${esc(c.suggestion)}</strong></div><p data-no-translate>${esc(c.explanation)}</p><button class="text-button" data-correction="${i}">Apply this change ${icon('check',13)}</button></div>`).join(''):'<p>No specific corrections suggested. Try expanding your idea with another sentence.</p>'}</div>${r.correctedText?`<div class="suggested-version"><span class="eyebrow">A SUGGESTED VERSION</span><p lang="zh-CN">${esc(r.correctedText)}</p><div class="audio-actions"><button class="text-button" data-say="${esc(r.correctedText)}">${icon('sound',15)} Hear it</button><button class="text-button" data-action="apply-all">Use this version</button></div></div>`:''}<div class="next-step"><span class="eyebrow">YOUR NEXT SMALL STEP</span><p data-no-translate>${esc(r.nextStep)}</p></div><div class="feedback-response"><span class="muted small">Was the feedback useful?</span><button class="text-button" data-feedback="The writing feedback was too advanced. Please use simpler ${languageInfo(getLanguage()).name} and focus on one correction at a time.">Too advanced</button><button class="text-button" data-feedback="I already understand these corrections. Please suggest a more challenging next writing task.">Ready for more</button></div></div>`;}
function renderPath() {
 const plan=livePlan(),mastery=app.state.mastery||{};
 return `${heading('A PATH THAT GROWS WITH YOU','Your next steps, thoughtfully chosen.','A plan informed by your goals, checked practice and what comes before what.',`<button class="button button-primary" data-action="generate-plan">${icon('refresh',17)} ${app.planPending?'Preparing your next step…':plan.length?'Refresh my plan':'Build my learning plan'}</button>`)}${addedLessonCard()}<div class="two-column path-layout"><section><div class="card path-summary"><span class="tag">${esc(app.state.profile.level)}</span><h2 data-no-translate>${esc(app.state.profile.goal)}</h2><p>${app.state.profile.dailyMinutes} minutes a day · ${plan.length?'Your current learning plan':'Start with a gentle check-in'}</p>${plan.length?`<span class="badge">Personalised learning plan</span><p data-no-translate>${esc(app.state.planSummary||'')}</p>`:''}<div class="path-summary-note">${icon('memory',18)} ${activeMemories().length} learning memories · ${Object.values(mastery).reduce((n,v)=>n+(Number(v.observations)||0),0)} checked answers</div></div><div class="path-list">${plan.length?plan.map((p,i)=>`<article class="path-step"><span class="path-step-number">${String(i+1).padStart(2,'0')}</span><div class="card"><span class="eyebrow">${esc(p.type||'LEARNING STEP')} · ${p.duration} MIN</span><h2>${esc(p.title)}</h2><p>${esc(p.reason)}</p><div class="path-step-footer"><span class="tag">${esc(p.difficulty||app.state.profile.level)}</span><button class="button button-secondary" data-lesson="${esc(p.lessonId||lessons[0].id)}">Let's try it ${icon('arrow',15)}</button></div></div></article>`).join(''):`<section class="card empty-state"><span class="empty-icon">${icon('leaf',38)}</span><h2>A fresh path begins here.</h2><p>Tell us your goals in your profile, then build a plan. As you complete short check-ins, it will adapt to the evidence.</p><button class="button button-primary" data-action="generate-plan">Build my learning plan ${icon('arrow',16)}</button></section>`}</div><section class="card plan-feedback"><h3>How is the pace?</h3><p class="muted">Tell your companion what needs to change.</p><form id="plan-feedback-form"><textarea id="plan-feedback-text" class="textarea" name="feedback" rows="2" maxlength="1000" placeholder="For example: I need easier practice, and more time on word order." required>${esc(app.planFeedbackText||'')}</textarea><button class="button button-secondary" type="submit">Adjust my path ${icon('arrow',16)}</button></form><div id="plan-feedback-result" aria-live="polite">${app.planFeedbackResult?`<div class="notice"><span data-no-translate>${esc(app.planFeedbackResult.attribution)} ${esc(app.planFeedbackResult.action)}</span></div>`:''}</div></section></section><aside><section class="card mastery-card"><span class="eyebrow">EVIDENCE, NOT ASSUMPTIONS</span><h2>Your skills in progress</h2><p class="muted small">Estimates update from checked lesson answers. They are not exam scores.</p>${lessons.map(l=>{const m=mastery[l.id];return `<div class="mastery-row"><div><strong>${esc(l.title)}</strong><span>${m?.observations?`${m.observations} checked answers`:'Not assessed yet'}</span></div>${m?.observations?`<div class="progress-track"><span style="width:${Math.round(Number(m.probability)*100)}%"></span></div><small>${Math.round(Number(m.probability)*100)}% BKT estimate · ${esc(m.status)}</small>`:'<div class="progress-track"><span style="width:0%"></span></div>'}</div>`;}).join('')}</section><section class="card algorithm-card"><h3>How your path takes shape</h3><p>Your companion creates your learning plan. Knowledge tracing, prerequisite relationships and spaced-review evidence inform its decisions.</p><p class="muted small">Starting parameters are not calibrated to a learner population. More evidence makes a more useful picture.</p><button class="text-button" data-action="algorithm-info">Explore the methods ${icon('arrow',15)}</button></section></aside></div>`;
}
function formatDate(v) {const d=new Date(v);return Number.isNaN(d.valueOf())?'Just added':d.toLocaleDateString(languageInfo(getLanguage()).locale,{month:'short',day:'numeric',year:'numeric'});}
function memoryCards(memories) {
 if(!memories.length)return `<section class="card empty-state"><span class="empty-icon">${icon('memory',38)}</span><h2>Your story starts with your first step.</h2><p>Practise a lesson, talk to your companion, or add a goal above. Your learning memories will appear here.</p><button class="button button-secondary" data-view="learn">Explore a lesson ${icon('arrow',16)}</button></section>`;
 return [...memories].reverse().map(m=>`<article class="card memory-card ${['superseded','archived'].includes(m.status)?'memory-inactive':''}"><div class="section-heading"><span class="tag">${memoryKind(m)==='semantic'?'Long-term insight':'Learning experience'}</span><button class="icon-button" data-delete-memory="${esc(m.id)}" aria-label="Delete this learning memory">${icon('close',16)}</button></div><p data-no-translate>${esc(m.text)}</p><div class="memory-evidence"><span>${esc(typeof m.source==='object'?JSON.stringify(m.source):m.source||'Learning interaction')}</span>${m.confidence!==undefined?`<span>${Math.round(Number(m.confidence)*100)}% confidence</span>`:''}</div><div class="memory-footer"><time>${formatDate(m.createdAt||m.timestamp)}</time><span>${esc(m.status||'active')}</span></div></article>`).join('');
}
function renderMemory() {
 const all=app.state.memories||[],active=activeMemories(),semantic=active.filter(m=>memoryKind(m)==='semantic');
 return `${heading('A COMPANION WITH CONTEXT','Your learning, remembered.','See the experiences and insights that help shape your next lesson.',`<button class="button button-secondary" data-action="export">Export my learning data ${icon('arrow',16)}</button>`)}<div class="stats-grid memory-stats"><div class="stat-card"><span>Active memories</span><strong>${active.length}</strong></div><div class="stat-card"><span>Longer-term insights</span><strong>${semantic.length}</strong></div><div class="stat-card"><span>Learning experiences</span><strong>${active.length-semantic.length}</strong></div></div><div class="notice">${icon('info',18)} <span>Memories are visible and removable by you. New evidence may update an older insight; uncertain inferences stay labelled.</span></div><section class="card add-memory"><form id="memory-form"><label for="memory-text">Something you'd like your companion to remember?</label><div><input id="memory-text" class="input" maxlength="1000" placeholder="For example: I want to order food confidently when I travel." required><button class="button button-primary" type="submit">${icon('memory',17)} Remember this</button></div></form></section><div class="section-heading memory-section-heading"><h2>A journal of your learning</h2><select id="memory-filter" class="input" aria-label="Filter learning memories"><option value="all">All memories</option><option value="semantic">Long-term insights</option><option value="episodic">Learning experiences</option><option value="superseded">Updated / archived</option></select></div><div class="memory-grid" id="memory-list">${memoryCards(all)}</div>`;
}
function quizResults(r) {const pending=app.exercisePending.has(courseKey(r.lessonId||selectedLesson().id));const correct=(r.results||[]).filter(item=>item.correct).length,total=(r.results||[]).length;return `<div class="quiz-results"><div class="quiz-next-step" role="status"><div><h3>Answer reviewed.</h3><p>The next question will respond to this answer and use a different example.</p></div><button class="button button-primary" data-action="generate-exercises" ${pending?'disabled':''}>Next question ${icon('arrow',17)}</button></div><div class="quiz-score"><div><span>This practice accuracy</span><strong>${total?Math.round(correct/total*100):0}%</strong></div><span>${correct} / ${total} <span>correct answers</span></span></div>${difficultyCard(r.difficultyAdjustment||app.state?.learningDifficulty,{nested:true,button:false})}<span class="badge">Companion feedback</span>${r.summary?`<p data-no-translate>${esc(r.summary)}</p>`:''}${(r.results||[]).map(v=>`<div class="quiz-result ${v.correct?'correct':'needs-work'}"><strong>${v.correct?'✓ Nice work.':'A good thing to revisit.'}</strong><p data-no-translate>${esc(v.explanation||v.feedback||'')}</p></div>`).join('')}${r.nextStep?`<div class="next-step"><span class="eyebrow">YOUR NEXT SMALL STEP</span><p data-no-translate>${esc(r.nextStep)}</p></div>`:''}<p class="muted small">${r.alreadyMeasured?'These questions were already measured; repeating them will not inflate your skill estimate.':'This practice is one piece of evidence. Your companion won’t assume mastery from a single answer.'}</p><button class="text-button" data-view="path">See my learning picture ${icon('arrow',15)}</button></div>`;}
function lessonProvenance(lesson){
 const key=courseKey(lesson.id),record=app.lessonSessions.get(key),pending=app.lessonPending.has(key);
 return `<div class="section-heading"><span class="badge">${pending?'Preparing your next step…':record?.mode==='cached'?'Saved personalised lesson':'Personalised lesson'}</span><button class="text-button" data-action="refresh-lesson" ${pending?'disabled':''}>${icon('refresh',15)} New personalised lesson</button></div>`;
}
function renderLessonGate(id){
 const lesson=catalogueLesson(id),key=courseKey(id),pending=app.lessonPending.has(key),error=app.lessonErrors.get(key);
 const outline=lesson.personalized?`<div class="custom-lesson-outline"><p>${esc(lesson.description||lesson.subtitle)}</p><ul>${(lesson.objectives||[]).map(objective=>`<li>${esc(objective)}</li>`).join('')}</ul><p class="added-lesson-request"><span>From your request:</span> <q data-no-translate>${esc(lesson.sourceFeedback||'')}</q></p></div>`:'';
 return heading('YOUR LEARNING COMPANION',esc(lesson.title),lesson.personalized?esc(lesson.subtitle):'Your lesson, examples, writing prompt and video scenes are tailored to your current learning context.',`<label class="lesson-select-label">Choose a lesson<select id="${app.view==='write'?'writing-topic':'lesson-select'}" class="input">${lessonOptions(id)}</select></label>`)+`<section class="card empty-state"><div class="speaking-illustration">${illustration(id)}</div><span class="badge">${lesson.personalized?'Custom course':'Learning companion'}</span><h2>${pending?'Preparing your next step…':lesson.personalized?esc(lesson.title):'A lesson made for this step.'}</h2>${outline}<p>${error?esc(error):'Generate a lesson using your goals, learning memory and checked practice. Exercises are generated separately when you are ready.'}</p>${pending?'<span class="spinner"></span>':`<button class="button button-primary" data-action="generate-lesson">${icon('spark',17)} ${error?'Try again':'Prepare my lesson'}</button>`}<p class="muted small">Content is prepared on request. If the learning service is unavailable, retry when you are ready.</p></section>`;
}
async function loadLesson(id,refresh=false){
 const language=getLanguage(),key=courseKey(id,language),revision=learningRevision,generation=contentGeneration;
 if(app.lessonPending.has(key))return app.lessonPending.get(key);
 if(!refresh&&app.lessonSessions.has(key)){render();return app.lessonSessions.get(key);}
 if(refresh)clearPracticeFeedback();
 app.lessonErrors.delete(key);
 const promise=(async()=>{
   try{
     const result=await post('/lesson',{lessonId:id,language,refresh});
     if(revision!==learningRevision||generation!==contentGeneration)return;
     if(!result.lesson?.phrases?.length||!result.lesson?.writingPrompt)throw new Error('The lesson is incomplete. Please try again.');
     app.lessonSessions.set(key,result);if(app.practiceRuns.has(key))app.practiceRuns.get(key).lesson=result.lesson;
     if(refresh){app.completedQuiz=null;app.videos.get(key)?.dispose?.();app.videos.delete(key);app.exerciseSets.delete(key);if(app.quizResult?.lessonId===id)app.quizResult=null;if(writingLesson().id===id)app.writingResult=null;}
     return result;
   }catch(error){if(revision===learningRevision&&generation===contentGeneration){app.lessonErrors.set(key,error.message);notify(error.message,'error');}}
   finally{if(app.lessonPending.get(key)===promise)app.lessonPending.delete(key);if(revision===learningRevision&&generation===contentGeneration&&['learn','speak','write'].includes(app.view)&&currentStudyId()===id&&getLanguage()===language)render();}
 })();
 app.lessonPending.set(key,promise);render();return promise;
}
function quizPanel(lesson){
 const key=courseKey(lesson.id),review=completedStudy(lesson.id),set=app.exerciseSets.get(key)||review?.exerciseSet,pending=app.exercisePending.has(key),result=app.quizResult?.exerciseSetId===set?.id&&app.quizResult?.language===getLanguage()?app.quizResult:null;
 const answers=result&&review?.exerciseSet.id===set.id?review.answers||[]:[];
 const history=(app.practiceRuns.get(key)?.history||[]).filter(item=>item.exerciseSet.id!==set?.id);
 const intent={foundation:'Foundation check',transfer:'Transfer practice',consolidate:'Targeted support',challenge:'A little more challenge'}[set?.teachingIntent];
 return `<section class="card quiz-card"><div class="section-heading"><div><span class="eyebrow">ADAPTIVE PRACTICE</span><h3>One question, then your next step.</h3></div><span class="badge">Companion practice</span></div><p class="practice-intro">Each answer shapes the next question. Apply what you learn in a different situation.</p>${history.length?`<details class="practice-history"><summary><span>Answered questions</span> (${history.length})</summary>${history.map(item=>`<article><strong><span>${item.result.results.every(answer=>answer.correct)?'Correct':'Needs practice'}</span> · ${esc(item.exerciseSet.level)}</strong>${item.exerciseSet.questions.map(q=>`<p data-no-translate>${esc(q.question)}</p><p data-no-translate>${esc(q.options[item.answers.find(answer=>answer.questionId===q.id)?.answer]||'')}</p>`).join('')}<p data-no-translate>${esc(item.result.summary||'')}</p></article>`).join('')}</details>`:''}${set?`<div class="practice-question-meta"><span class="badge"><span>Question</span> ${Number(set.questionNumber)||history.length+1}</span><span class="badge">${esc(set.level)}</span>${intent?`<span class="badge">${intent}</span>`:''}</div>${set.intentReason?`<p class="practice-intent" data-no-translate>${esc(set.intentReason)}</p>`:''}<div id="quiz-results" aria-live="polite">${result?quizResults(result):''}</div>${result?'<h3 class="quiz-review-heading">Completed practice review</h3>':''}<form id="quiz-form" data-exercise-set-id="${esc(set.id)}">${set.questions.map((q,i)=>`<fieldset class="quiz-question" ${result?'disabled':''}><legend data-no-translate>${set.questions.length>1?`${i+1}. `:''}${esc(q.question)}</legend>${q.options.map((option,index)=>`<label class="quiz-option"><input type="radio" name="${esc(q.id)}" value="${index}" ${answers.some(answer=>answer.questionId===q.id&&answer.answer===index)?'checked':''} required><span data-no-translate>${esc(option)}</span></label>`).join('')}</fieldset>`).join('')}${result?'':`<button class="button button-primary" type="submit">Check my answers ${icon('arrow',16)}</button>`}</form>`:`<div class="empty-state"><h3>Fresh practice, shaped around you.</h3><p>Answer one question at a time. Your companion will use your answer to choose a new situation or targeted support.</p><button class="button button-primary" data-action="generate-exercises" ${pending?'disabled':''}>${pending?'Preparing your next step…':'Start adaptive practice'}</button></div>`}</section>`;
}
async function generateExercises(button){
 const id=selectedLesson().id,language=getLanguage();
 if(!isLessonReady(id)){await loadLesson(id);if(language!==getLanguage()||!isLessonReady(id))return;}
 const lesson=selectedLesson(),key=courseKey(lesson.id,language),revision=learningRevision,generation=contentGeneration;
 if(app.exercisePending.has(key))return;
 const run=app.practiceRuns.get(key)||{lesson,history:[]};
 app.exercisePending.add(key);
 await busy(button,async()=>{
   const result=await post('/exercises',{lessonId:lesson.id,language,adaptive:true});
   if(revision!==learningRevision||generation!==contentGeneration||language!==getLanguage())return;
   if(result.exerciseSet?.questions?.length!==1)throw new Error('The practice set is incomplete. Please try again.');
   app.practiceRuns.set(key,run);
   app.exerciseSets.set(key,result.exerciseSet);app.quizResult=null;app.completedQuiz=null;
 },'Preparing your next step…');
 if(revision===learningRevision&&generation===contentGeneration)app.exercisePending.delete(key);
 if(revision===learningRevision&&generation===contentGeneration&&app.view==='learn'&&selectedLesson().id===lesson.id&&getLanguage()===language)render();
}
function showCoach(title,feedback,nextStep){
 if(!feedback&&!nextStep){notify('Your learning update is saved.');return;}
 showInfo(title,`<span class="badge">Companion feedback</span>${feedback?`<p data-no-translate>${esc(feedback)}</p>`:''}${nextStep?`<div class="next-step"><span class="eyebrow">YOUR NEXT SMALL STEP</span><p data-no-translate>${esc(nextStep)}</p></div>`:''}`);
}
function clearGeneratedLearning(){
 luluGuide?.resetContext();
 clearPracticeFeedback();
 app.planFeedbackResult=null;app.planFeedbackText='';app.planAdaptation=null;app.addedLessonId=null;
 learningRevision++;contentGeneration++;app.completedQuiz=null;app.localizationError=false;app.lessonPending.clear();app.exercisePending.clear();
 for(const video of app.videos.values())video.dispose?.();
 app.videos.clear();app.lessonSessions.clear();app.exerciseSets.clear();app.practiceRuns.clear();app.lessonErrors.clear();app.quizResult=null;app.speakingResult=null;app.writingResult=null;
}
function updateProfileBadge() {const name=app.state?.profile?.name||'Alex';if($('#profile-name'))$('#profile-name').textContent=name;if($('#profile-avatar'))$('#profile-avatar').textContent=name.charAt(0).toUpperCase();if($('#profile-level'))$('#profile-level').textContent=app.state?.profile?.level||'HSK 2';}
function stopRecording() {if(app.recording){app.recording.cancel();app.recording=null;}clearTimeout(app.recordTimer);}
function render() {if(!app.state)return;stopRecording();stopSpeaking();app.pronunciationToken=(app.pronunciationToken||0)+1;const root=$('#view-root'),previousQuizId=$('#quiz-form')?.dataset.exerciseSetId,quizChoices=[...root.querySelectorAll('#quiz-form input[type="radio"]')].map(e=>({name:e.name,value:e.value,checked:e.checked})),drafts=[...root.querySelectorAll('textarea,input:not([type="radio"]):not([type="checkbox"])')].filter(e=>e.id).map(e=>({id:e.id,value:e.value}));const renderers={overview:renderOverview,learn:renderLearn,speak:renderSpeak,write:renderWrite,path:renderPath,memory:renderMemory};const study=['learn','speak','write'].includes(app.view),id=study?currentStudyId():null;root.innerHTML=serviceNotice()+guidanceStatus()+(['overview','path','learn'].includes(app.view)?difficultyCard():[]) +(app.view==='path'&&app.state.plan?.length&&!livePlan().length&&(Number(app.state.planDifficultyRevision)||0)!==difficultyRevision(app.state)?'<div class="notice">Your results changed. Refresh your plan to use the new difficulty.</div>':'')+(study&&(!isLessonReady(id)||app.lessonPending.has(courseKey(id)))?(app.view==='speak'?renderPronunciationPanel():'')+renderLessonGate(id):(renderers[app.view]||renderOverview)());for(const field of drafts){const target=document.getElementById(field.id);if(target&&field.id!=='writing-text')target.value=field.value;}for(const field of (previousQuizId&&previousQuizId===$('#quiz-form')?.dataset.exerciseSetId?quizChoices:[])){const target=[...root.querySelectorAll('#quiz-form input[type="radio"]')].find(e=>e.name===field.name&&e.value===field.value);if(target)target.checked=field.checked;}$('#breadcrumb').textContent=labels[app.view];document.querySelectorAll('nav [data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===app.view);if(b.dataset.view===app.view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});updateProfileBadge();applyTranslations();}
function switchLanguage(language){
 language=normalizeLanguage(language);
 if($('#interface-language'))$('#interface-language').value=language;
 if(language===getLanguage())return;
 if(app.view==='write')persistDraft();
 clearPracticeFeedback();
 const fields=[...$('#view-root').querySelectorAll('input,textarea,select')].map(e=>({id:e.id,name:e.name,value:e.value,checked:e.checked,type:e.type}));
 app.exerciseSets.clear();app.completedQuiz=null;app.quizResult=null;
 setLanguage(language);syncCatalogue();render();
 for(const field of fields){const element=field.id?document.getElementById(field.id):[...$('#view-root').querySelectorAll('input')].find(e=>e.name===field.name&&e.value===field.value);if(!element)continue;if(field.type==='radio'||field.type==='checkbox')element.checked=field.checked;else element.value=field.value;}
 applyTranslations();luluGuide?.refreshLanguage();ensureLocalizedLearning();
}
function persistDraft() {if($('#writing-text'))app.writingText=$('#writing-text').value;try{localStorage.setItem('hanzi-writing-draft',app.writingText);}catch{}}
function navigate(view,id) {if(app.view==='write')persistDraft();if(view==='write'&&app.view==='learn')app.writingLessonId=selectedLesson().id;if(id){clearPracticeFeedback();app.completedQuiz=null;app.lessonId=id;app.writingLessonId=id;app.phraseIndex=0;app.quizResult=null;app.speakingResult=null;}app.view=labels[view]?view:'overview';const hash=`#${app.view}${id?'/'+encodeURIComponent(id):''}`;if(location.hash!==hash)history.pushState(null,'',hash);render();luluGuide?.notifyView(app.view);window.scrollTo({top:0,behavior:'instant'});}
function restoreRoute() {const[view,id]=location.hash.slice(1).split('/');navigate(labels[view]?view:'overview',lessons.some(l=>l.id===id)?id:undefined);}
function showInfo(title,content) {$('#content-dialog-body').innerHTML=`<span class="eyebrow">HANZI LEARNING SPACE</span><h2>${esc(title)}</h2>${content}`;$('#content-dialog').showModal();}
function openSettings() {const form=$('#profile-form');for(const[k,v]of Object.entries(app.state.profile))if(form.elements[k])form.elements[k].value=v;const selected=LANGUAGES.find(item=>item.name===app.state.profile.nativeLanguage||item.code===app.state.profile.nativeLanguage);$('#learner-language').value=(selected||languageInfo(getLanguage())).name;$('#settings-dialog').showModal();}
async function sendChat(message,button) {
 message=String(message).trim();if(!message)return;
 await busy(button,async()=>{const revision=learningRevision,history=app.chat.slice(-12);app.chat.push({role:'user',content:message});$('#chat-messages').innerHTML=chatMarkup();$('#chat-input').value='';const pending=document.createElement('div');pending.className='message message-assistant loading';pending.textContent='Your companion is thinking…';$('#chat-messages').append(pending);pending.scrollIntoView({block:'nearest'});try{const result=await post('/chat',{message,history,lessonId:selectedLesson().id});if(revision===learningRevision)app.chat.push({role:'assistant',content:result.reply});}catch(e){if(revision===learningRevision)app.chat.push({role:'assistant',content:`I couldn't reach the learning service: ${e.message} Your lesson and phrase practice are still available.`});throw e;}finally{if(revision===learningRevision&&$('#chat-messages')){$('#chat-messages').innerHTML=chatMarkup();$('#chat-messages').scrollTop=$('#chat-messages').scrollHeight;}}},'Thinking…');
}
async function prepareVideo(button) {
 const l=selectedLesson(),language=getLanguage(),revision=learningRevision,generation=contentGeneration,key=courseKey(l.id,language),target=$('#video-container');await busy(button,async()=>{const progress=document.createElement('div');progress.className='video-progress';progress.setAttribute('role','status');progress.textContent='Preparing your animated lesson…';target?.append(progress);try{const video=await createLessonVideo(l,{onProgress:n=>{if(progress.isConnected)progress.textContent=`Preparing your animated lesson… ${Math.round(n*100)}%`;}});if(revision!==learningRevision||generation!==contentGeneration||app.lessonSessions.get(key)?.lesson!==l){video.dispose?.();return;}app.videos.get(key)?.dispose?.();app.videos.set(key,video);const liveTarget=$('#video-container');if(liveTarget&&app.view==='learn'&&selectedLesson().id===l.id&&getLanguage()===language){liveTarget.innerHTML=videoMarkup(video,l);const player=liveTarget.querySelector('video');if(player)player.play().catch(()=>{});}}finally{progress.remove();}},'Preparing video…');
}
function invalidateWritingFeedback(){if(!app.writingResult)return;app.writingResult=null;if($('#writing-feedback'))$('#writing-feedback').innerHTML='<div class="feedback-empty"><h3>Your draft has changed.</h3><p>Request fresh feedback when you are ready. Your new words are safely kept.</p></div>';}
function updateDraft(text,keepFeedback=false) {if(!keepFeedback)invalidateWritingFeedback();app.writingText=text;if($('#writing-text')){$('#writing-text').value=text;$('#writing-count').textContent=`${countCharacters(text)} Chinese characters`;}persistDraft();}
async function record(button) {
 if(app.recording){app.recording.stop();return;}if(!getSpeechSupport().recognition){notify('Use Chrome or Edge for microphone transcription, or type your transcript.');$('#spoken-transcript').focus();return;}
 try{app.recording=startRecognition({onResult:text=>{if($('#spoken-transcript'))$('#spoken-transcript').value=text||'';},onError:e=>notify(typeof e==='string'?e:e.message||'Speech recognition could not start.','error'),onEnd:()=>{app.recording=null;clearTimeout(app.recordTimer);button.classList.remove('recording');button.setAttribute('aria-label','Start Mandarin speech recognition');if($('#recording-status'))$('#recording-status').textContent='Ready when you are. You can edit the transcript before comparing.';}});button.classList.add('recording');button.setAttribute('aria-label','Stop speech recognition');$('#recording-status').textContent='Listening… speak your Chinese phrase.';app.recordTimer=setTimeout(()=>app.recording?.stop(),20000);}catch(e){notify(e.message,'error');}
}
async function generatePlan(button,feedback='') {
 if(app.planPending)return;app.planPending=true;
 const revision=learningRevision,language=getLanguage();
 await busy(button,async()=>{const r=await post('/plan',{feedback});if(revision!==learningRevision||language!==getLanguage())return;acceptAddedLesson(r);notify(r.addedLesson?translateText('Your new course was added and selected.'):r.summary||'Your learning plan is ready.');render();},'Preparing your next step…');
 app.planPending=false;render();
}
document.addEventListener('click',async event=>{
 const b=event.target.closest('button,a');if(!b)return;
 if(b.dataset.language){switchLanguage(b.dataset.language);return;}
 if(b.dataset.view){event.preventDefault();navigate(b.dataset.view);return;}
 if(b.dataset.lesson){navigate('learn',b.dataset.lesson);await loadLesson(b.dataset.lesson);return;}
 if(b.hasAttribute('data-close-dialog')){b.closest('dialog')?.close();return;}
 if(b.dataset.say){await busy(b,async()=>{await speakChinese(b.dataset.say,{rate:Number(b.dataset.rate)||.8,onError:e=>notify(typeof e==='string'?e:e.message,'error')});},'');return;}
 if(b.dataset.chatPrompt){await sendChat(b.dataset.chatPrompt,$('#chat-form button'));return;}
 if(b.dataset.insert){const e=$('#writing-text'),start=e.selectionStart,end=e.selectionEnd;updateDraft(e.value.slice(0,start)+b.dataset.insert+e.value.slice(end));e.focus();e.setSelectionRange(start+b.dataset.insert.length,start+b.dataset.insert.length);return;}
 if(b.dataset.correction!==undefined){const c=app.writingResult?.corrections?.[Number(b.dataset.correction)];if(!c)return;persistDraft();if(!app.writingText.includes(c.original)){notify('That phrase is no longer in your draft.');return;}updateDraft(app.writingText.replace(c.original,c.suggestion),true);b.textContent='Applied';b.disabled=true;return;}
 if(b.dataset.feedback){await busy(b,async()=>{const r=await post('/feedback',{message:b.dataset.feedback,context:app.view});showInfo('A thoughtful adjustment',`<p>${esc(r.attribution)}</p><p>${esc(r.action)}</p><p class="muted small">This is a provisional interpretation. Your next practice can help verify it.</p>`);},'Adjusting…');return;}
 if(b.dataset.deleteMemory){await busy(b,async()=>{await api(`/memory/${encodeURIComponent(b.dataset.deleteMemory)}`,{method:'DELETE'});clearGeneratedLearning();render();notify('Memory removed.');},'Removing…');return;}
 const action=b.dataset.action;
 if(action==='retry-service')await init();
 else if(action==='stop-pronunciation')resetPronunciation(false);
 else if(action==='clear-pronunciation')resetPronunciation(true);
 else if(action==='retry-guidance')await ensureLocalizedLearning(true);
 else if(action==='start-next-learning'){const id=b.dataset.lessonId||selectedLesson().id,language=getLanguage(),revision=learningRevision;navigate('learn',id);await loadLesson(id,true);if(revision===learningRevision&&language===getLanguage()&&app.view==='learn'&&selectedLesson().id===id&&app.lessonSessions.has(courseKey(id)))await generateExercises($('[data-action="generate-exercises"]'));}
 else if(action==='generate-lesson')await loadLesson(currentStudyId(),false);
 else if(action==='refresh-lesson')await loadLesson(currentStudyId(),true);
 else if(action==='generate-exercises')await generateExercises(b);
 else if(action==='prepare-video')await prepareVideo(b);
 else if(action==='complete-lesson')await busy(b,async()=>{const r=await post('/activity',{type:'lesson',title:selectedLesson().title,lessonId:selectedLesson().id,minutes:Number(selectedLesson().duration)||5});showCoach('Your lesson reflection',r.stepFeedback||r.reflection,r.nextStep);},'Saving…');
 else if(action==='next-phrase'){app.phraseIndex++;app.speakingResult=null;render();}
 else if(action==='record')await record(b);
 else if(action==='review-writing'){persistDraft();if(!app.writingText.trim()){notify('Write a sentence first. A small start is enough.');$('#writing-text').focus();return;}await busy(b,async()=>{const l=writingLesson(),snapshot=app.writingText,language=getLanguage(),revision=learningRevision,context=feedbackRevision;const result=await post('/writing',{text:snapshot,prompt:l.writingPrompt.instruction,level:l.level,lessonId:l.id,language});if(revision!==learningRevision||context!==feedbackRevision)return;if(app.writingText!==snapshot||writingLesson().id!==l.id||getLanguage()!==language){notify('Your draft changed while feedback was being prepared. Request fresh feedback for your new words.');return;}app.writingResult=result;if($('#writing-feedback'))$('#writing-feedback').innerHTML=writingResults(result);notify('Your writing feedback is ready.');},'Reading your words…');}
 else if(action==='insert-starter'){const l=writingLesson();if(!app.writingText.trim())updateDraft(l.writingPrompt.starter);$('#writing-text').focus();}
 else if(action==='apply-all'&&app.writingResult){updateDraft(app.writingResult.correctedText,true);notify('Suggested version added to your draft.');}
 else if(action==='generate-plan')await generatePlan(b);
 else if(action==='export')exportLearningData();
 else if(action==='algorithm-info')showInfo('The methods behind your learning path',`<p>Original implementations of published algorithms, informed by these open-source references. No third-party project code is bundled.</p><ul><li><strong>BM25 retrieval:</strong> ranks memories with recency and confidence. Reference: <a href="https://github.com/dorianbrown/rank_bm25" target="_blank" rel="noopener noreferrer">rank_bm25</a> (Apache-2.0).</li><li><strong>Bayesian Knowledge Tracing:</strong> updates skill estimates from checked answers. Reference: <a href="https://github.com/CAHLR/pyBKT" target="_blank" rel="noopener noreferrer">pyBKT</a> (MIT).</li><li><strong>SM-2:</strong> schedules reviews. <a href="https://super-memory.com/english/ol/sm2.htm" target="_blank" rel="noopener noreferrer">Published algorithm</a>.</li><li><strong>Prerequisite graph:</strong> orders foundation topics before dependent skills.</li></ul><p class="muted">BKT parameters are starting assumptions, not calibrated proficiency measurements. Companion feedback and attribution are provisional.</p>`);
});
document.addEventListener('submit',async event=>{
 const f=event.target;event.preventDefault();const b=f.querySelector('button[type="submit"]')||f.querySelector('button');
 if(f.id==='pronunciation-form')await readPronunciation(b);
 else if(f.id==='chat-form')await sendChat($('#chat-input').value,b);
 else if(f.id==='speaking-form')await busy(b,async()=>{const transcript=$('#spoken-transcript').value.trim(),l=selectedLesson(),index=app.phraseIndex,language=getLanguage(),revision=learningRevision,context=feedbackRevision,p=l.phrases[index%l.phrases.length];const result=await post('/speaking',{expected:p.hanzi,transcript,lessonId:l.id,language});if(revision===learningRevision&&context===feedbackRevision&&app.view==='speak'&&selectedLesson().id===l.id&&app.phraseIndex===index&&getLanguage()===language&&$('#speaking-result')){app.speakingResult=result;$('#speaking-result').innerHTML=speakingResults(result);}},'Reviewing your practice…');
 else if(f.id==='quiz-form')await busy(b,async()=>{
   const l=selectedLesson(),language=getLanguage(),revision=learningRevision,set=app.exerciseSets.get(courseKey(l.id,language))||completedStudy(l.id)?.exerciseSet;
   if(!set||f.dataset.exerciseSetId!==set.id)throw new Error('Create a practice set before checking your answers.');
   const data=new FormData(f),answers=set.questions.map(q=>({questionId:q.id,answer:Number(data.get(q.id))}));
   const result={...await post('/quiz',{exerciseSetId:set.id,lessonId:l.id,answers,language}),lessonId:l.id,exerciseSetId:set.id,language};
   if(revision!==learningRevision)return;
   const key=courseKey(l.id,language),run=app.practiceRuns.get(key)||{lesson:l,history:[]},completed={lesson:l,exerciseSet:set,result,answers,language};
   if(!run.history.some(item=>item.exerciseSet.id===set.id))run.history.push(completed);
   run.history=run.history.slice(-30);app.practiceRuns.set(key,run);app.quizResult=result;app.completedQuiz=completed;
   if(app.view==='learn'&&selectedLesson().id===l.id&&getLanguage()===language){render();$('#quiz-results')?.scrollIntoView({block:'start',behavior:'smooth'});}
   notify('Your practice evidence has been saved.');
 },'Reviewing your practice…');
 else if(f.id==='profile-form')await busy(b,async()=>{const data=Object.fromEntries(new FormData(f));data.dailyMinutes=Number(data.dailyMinutes);const language=(LANGUAGES.find(item=>item.name===data.nativeLanguage)||languageInfo(getLanguage())).code;const r=await api('/profile',{method:'PUT',body:JSON.stringify({...data,language})});clearGeneratedLearning();$('#settings-dialog').close();if(language!==getLanguage())switchLanguage(language);else render();showCoach('Your learning profile',r.profileInsight,r.recommendedFocus||r.nextStep);},'Saving…');
 else if(f.id==='memory-form')await busy(b,async()=>{const r=await post('/memory',{text:$('#memory-text').value,category:'goal'});render();showCoach('Your learning memory',r.reflection||r.stepFeedback,r.nextStep);},'Remembering…');
 else if(f.id==='plan-feedback-form'){
   if(app.planPending)return;
   const message=String(new FormData(f).get('feedback')||'').trim(),language=getLanguage();let revision=learningRevision;if(!message)return;
   app.planFeedbackText=message;app.planPending=true;
   try{await busy(b,async()=>{
     const feedback=await post('/feedback',{message,context:'learning path',language});if(revision!==learningRevision)return;
     const result=await post('/plan',{feedback:message,language});if(revision!==learningRevision)return;
     acceptAddedLesson(result);revision=learningRevision;app.planFeedbackResult=feedback;
     if(language===getLanguage()){render();notify(result.addedLesson?translateText('Your new course was added and selected.'):'Your learning path has been adjusted.');}
   },'Reviewing your request…');}finally{app.planPending=false;if(revision===learningRevision)render();}
 }
});
document.addEventListener('change',e=>{if(e.target.id==='interface-language'){switchLanguage(e.target.value);return;}if(e.target.id==='pronunciation-rate'){app.pronunciationRate=e.target.value;return;}if(e.target.id==='lesson-select'){app.lessonId=e.target.value;app.phraseIndex=0;app.completedQuiz=null;app.quizResult=null;app.speakingResult=null;render();}else if(e.target.id==='writing-topic'){persistDraft();app.writingLessonId=e.target.value;app.writingResult=null;render();}else if(e.target.id==='memory-filter'){const filter=e.target.value,all=app.state.memories||[];$('#memory-list').innerHTML=memoryCards(filter==='all'?all:filter==='superseded'?all.filter(m=>['superseded','archived'].includes(m.status)):all.filter(m=>memoryKind(m)===filter&&!['superseded','archived'].includes(m.status)));}});
document.addEventListener('input',e=>{if(e.target.id==='plan-feedback-text'){app.planFeedbackText=e.target.value;return;}if(e.target.id==='pronunciation-text'){app.pronunciationText=e.target.value;return;}if(e.target.id==='writing-text'){invalidateWritingFeedback();app.writingText=e.target.value;$('#writing-count').textContent=`${countCharacters(app.writingText)} Chinese characters`;persistDraft();}});
document.addEventListener('keydown',e=>{if(e.target.id==='chat-input'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#chat-form').requestSubmit();}});
$('#settings-button').addEventListener('click',openSettings);
$('#profile-open')?.addEventListener('click',openSettings);
$('#export-data')?.addEventListener('click',exportLearningData);
$('#reset-data')?.addEventListener('click',()=>{$('#settings-dialog').close();showInfo('Start a fresh learning space?',`<p>This removes your local memories, profile, practice evidence, plans and browser writing draft. Export your learning data first if you'd like to keep a copy.</p><div class="dialog-actions"><button class="button button-secondary" data-close-dialog>Keep my learning data</button><button class="button button-danger" id="confirm-reset">Remove my local learning data</button></div>`);$('#confirm-reset').addEventListener('click',e=>busy(e.currentTarget,async()=>{await api('/data',{method:'DELETE'});localStorage.removeItem('hanzi-writing-draft');app.writingText='';app.chat=[];clearGeneratedLearning();$('#content-dialog').close();navigate('overview');notify('Your local learning space has been reset.');},'Removing…'));});
window.addEventListener('popstate',restoreRoute);
window.addEventListener('beforeunload',()=>{persistDraft();stopRecording();stopSpeaking();for(const v of app.videos.values())v.dispose?.();});
let connectionPromise=null;
function init(){if(connectionPromise)return connectionPromise;connectionPromise=connectLearningService().finally(()=>{connectionPromise=null;});return connectionPromise;}
async function readLearningState(){
 for(let attempt=0;attempt<2;attempt++)try{return await api('/state',{timeoutMs:12000,skipLocalization:true});}catch(error){if(attempt||!error.retryable)throw error;}
}
async function connectLearningService() {
 const hadState=Boolean(app.state),revision=learningRevision;
 if(!hadState){$('#view-root').innerHTML='<div class="app-loading"><span class="spinner"></span><p>Making a little room for Chinese…</p></div>';applyTranslations();}
 if(staticPagesMode){app.state=app.state||emptyLearningState();syncCatalogue();updateServiceBadge();if(!hadState)restoreRoute();return;}
 try{
  await readLearningState();if(revision!==learningRevision)return;
  // Establish the learning session before checking setup. Health remains
  // optional and cannot replace that session or discard a valid profile.
  void api('/health',{timeoutMs:10000,skipLocalization:true}).catch(()=>{});
  if(hadState)render();else{restoreRoute();ensureLocalizedLearning();}
 }catch(error){
  if(revision!==learningRevision)return;
  if(!app.state){app.state=emptyLearningState();syncCatalogue();restoreRoute();}
 }
}
function recoverLearningService(){if(app.serviceUnavailable&&!staticPagesMode)return init();}
window.addEventListener('online',recoverLearningService);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')return recoverLearningService();});
if(document.body)luluGuide=initializeLulu({request:payload=>post('/lulu',payload),requestVoice:payload=>post('/lulu/voice',payload),getLanguage,getView:()=>app.view,navigate:view=>navigate(view)});
populateLanguageSelectors();
observeTranslations();
init();
