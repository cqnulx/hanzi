/**
 * Original, dependency-free implementations of published algorithms.
 * BM25: Robertson & Zaragoza (2009), Foundations and Trends in IR.
 * BKT: Corbett & Anderson (1994), User Modeling and User-Adapted Interaction.
 * SM-2: Piotr Wozniak (1987), https://super-memory.com/english/ol/sm2.htm
 * Related open-source references (not vendored): rank_bm25 (Apache-2.0),
 * pyBKT (MIT), Anki (AGPL-3.0). No code from those projects is copied.
 * Default BKT parameters are uncalibrated starting assumptions, not validated
 * estimates of a learner's proficiency. Evidence and uncertainty remain visible.
 */
const DAY = 86400000;
export const ALGORITHM_INFO = {
  memory: 'BM25 + recency, retrieval count and evidence confidence',
  mastery: 'Bayesian Knowledge Tracing (BKT), uncalibrated defaults',
  planning: 'Prerequisite graph + BKT estimates + SM-2 review schedule',
  references: [
    {name:'rank_bm25',url:'https://github.com/dorianbrown/rank_bm25',license:'Apache-2.0'},
    {name:'pyBKT',url:'https://github.com/CAHLR/pyBKT',license:'MIT'},
    {name:'SM-2 specification',url:'https://super-memory.com/english/ol/sm2.htm',license:'Published algorithm specification'},
  ],
};
export function tokenize(text = '') {
  const normalized = String(text).normalize('NFKC').toLowerCase();
  const words = normalized.match(/[a-z0-9]+/g) || [];
  for (const run of normalized.match(/[\p{Script=Han}]+/gu) || []) {
    const chars = Array.from(run);
    words.push(...chars);
    for (let i=0;i<chars.length-1;i++) words.push(chars[i]+chars[i+1]);
  }
  return words;
}
const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
export function retrieveMemories(memories = [], query = '', limit = 6) {
  const documents = memories.filter(m => !['superseded','archived','deleted'].includes(m.status));
  if (!documents.length) return [];
  const tokens = documents.map(m => tokenize([m.text,m.category,m.conceptId].filter(Boolean).join(' ')));
  const averageLength = tokens.reduce((sum,t)=>sum+t.length,0)/tokens.length || 1;
  const queryTokens = [...new Set(tokenize(query))];
  const df = new Map();
  for (const terms of tokens) for(const term of new Set(terms)) df.set(term,(df.get(term)||0)+1);
  const now = Date.now();
  return documents.map((memory,i)=>{
    const counts = new Map();
    for(const term of tokens[i]) counts.set(term,(counts.get(term)||0)+1);
    let lexical = 0;
    for(const term of queryTokens) {
      const tf = counts.get(term)||0;
      if(!tf) continue;
      const idf = Math.log(1+(documents.length-(df.get(term)||0)+0.5)/((df.get(term)||0)+0.5));
      lexical += idf*(tf*2.5)/(tf+1.5*(0.25+0.75*tokens[i].length/averageLength));
    }
    const date = Date.parse(memory.updatedAt || memory.createdAt || memory.timestamp || '') || now;
    const ageDays = Math.max(0,(now-date)/DAY);
    const stability = (memory.kind || memory.category)==='semantic' ? 60 : 21;
    const recency = Math.exp(-ageDays/stability);
    const confidence = clamp(Number(memory.confidence ?? 0.65),0,1);
    const frequency = Math.min(1,Math.log1p(Number(memory.retrievalCount)||0)/5);
    return {...memory,retrievalScore:Number((lexical+0.25*recency+0.15*confidence+0.08*frequency).toFixed(4)),lexicalMatch:lexical>0};
  }).filter(m=>m.lexicalMatch || (m.kind || m.category)==='semantic')
    .sort((a,b)=>b.retrievalScore-a.retrievalScore).slice(0,limit);
}
export function updateBKT(previous = {}, correct, parameters = {}) {
  const p = clamp(Number(previous.probability ?? previous.pKnown ?? 0.2),0.001,0.999);
  const slip = clamp(Number(parameters.slip ?? 0.1),0.001,0.49);
  const guess = clamp(Number(parameters.guess ?? 0.25),0.001,0.49);
  const learn = clamp(Number(parameters.learn ?? 0.1),0,0.3);
  const posterior = correct ? p*(1-slip)/(p*(1-slip)+(1-p)*guess) : p*slip/(p*slip+(1-p)*(1-guess));
  const probability = clamp(posterior+(1-posterior)*learn,0.001,0.999);
  const observations = (Number(previous.observations)||0)+1;
  return {
    probability:Number(probability.toFixed(4)),observations,
    correctCount:(Number(previous.correctCount)||0)+(correct?1:0),
    status:observations<3?'insufficient-evidence':probability>=0.85?'likely-mastered':probability>=0.5?'developing':'needs-practice',
    updatedAt:new Date().toISOString(),parameters:{slip,guess,learn},
    method:'BKT',calibrated:false,
  };
}
export function updateReview(previous = {}, quality = 3) {
  quality = clamp(Math.round(Number(quality)||0),0,5);
  let repetitions = Number(previous.repetitions)||0;
  let ease = Number(previous.ease)||2.5;
  let interval = Number(previous.interval)||0;
  if(quality<3) { repetitions=0;interval=1; }
  else { interval=repetitions===0?1:repetitions===1?6:Math.max(1,Math.round(interval*ease));repetitions++; }
  ease=Math.max(1.3,ease+0.1-(5-quality)*(0.08+(5-quality)*0.02));
  return {interval,repetitions,ease:Number(ease.toFixed(2)),dueAt:new Date(Date.now()+interval*DAY).toISOString(),method:'SM-2'};
}
export function buildPlan(state = {}, lessons = [], feedback = '') {
  const mastery = state.mastery||{};
  const reviews = state.reviews||{};
  const dailyMinutes = clamp(Number(state.profile?.dailyMinutes)||15,5,60);
  const goal = String(state.profile?.goal||'Everyday conversation').toLowerCase();
  const feedbackLower = String(feedback).toLowerCase();
  const wantsEasier = /too hard|too difficult|easier|slow|struggl/.test(feedbackLower);
  const now = Date.now();
  const candidates = lessons.map((lesson,index)=>{
    const entry=mastery[lesson.id]||{};
    const probability=Number(entry.probability)||0;
    const prereqs=lesson.prerequisites||[];
    const missing=prereqs.filter(id=>(Number(mastery[id]?.probability)||0)<0.5);
    const review=reviews[lesson.id]||{};
    const due=review.dueAt && Date.parse(review.dueAt)<=now;
    const goalMatch=tokenize(`${lesson.title} ${lesson.category} ${lesson.description}`).some(t=>goal.includes(t));
    const score=(due?7:0)+(1-probability)*3+(goalMatch?1.5:0)-missing.length*6-index*0.02+(wantsEasier?Math.max(0,3-index)*0.5:0);
    return {lesson,entry,missing,due,score};
  }).sort((a,b)=>b.score-a.score);
  // Every selected lesson has its prerequisite scheduled first, even before any
  // measurements exist. This is an order constraint, not a claim of mastery.
  const ordered=[];
  const visited=new Set();
  function add(candidate,stack=new Set()) {
    if(!candidate || visited.has(candidate.lesson.id) || stack.has(candidate.lesson.id)) return;
    stack.add(candidate.lesson.id);
    for(const id of candidate.missing) add(candidates.find(c=>c.lesson.id===id),new Set(stack));
    visited.add(candidate.lesson.id);ordered.push(candidate);
  }
  for(const c of candidates) add(c);
  let remaining=dailyMinutes;
  const plan=[];
  for(const c of ordered) {
    if(remaining<3 || plan.length>=4) break;
    const duration=Math.min(remaining,wantsEasier?5:Math.max(4,Math.min(8,Number(c.lesson.duration)||6)));
    const observations=Number(c.entry.observations)||0;
    const reason=c.due?'Your spaced review is due.':observations?`Based on ${observations} checked practice answers; revisit this skill before moving on.`:c.missing.length?'Build the foundations for the next step.':'Start with a short check-in; there is not enough practice evidence yet.';
    plan.push({id:`plan-${c.lesson.id}`,title:c.due?`Review: ${c.lesson.title}`:c.lesson.title,reason,duration,lessonId:c.lesson.id,difficulty:wantsEasier?'gentle':c.lesson.level||'HSK 2',type:c.due?'review':'lesson',method:'Prerequisite graph + BKT + SM-2'});
    remaining-=duration;
  }
  return plan;
}
