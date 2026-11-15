import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {LULU_SYSTEM,LULU_SECTIONS,luluActions} from './lulu-guide.mjs';

const LANGUAGES=new Set(['zh','en','es','fr','de','ja','ko']);
const FORMAT='lulu-standard-intro-v1';
const writes=new Map();
const invalid=message=>Object.assign(new Error(message),{status:502});
function selection(section,language){
 if(!Object.hasOwn(LULU_SECTIONS,section)||!LANGUAGES.has(language))throw Object.assign(new Error('Choose an available introduction and language.'),{status:400});
}

/** This payload deliberately contains no session, learner messages, history or profile. */
export function luluIntroRequest(section,language){
 selection(section,language);
 return{task:'lulu',mode:'intro',section,language,message:'',standardIntro:true,
  introductionScope:'Introduce the available feature for any learner. Do not invent or refer to a particular learner name, goals, scores, progress or memories. Give 2-3 short sentences, aiming for no more than 90 characters in Chinese, Japanese or Korean, or 55 words in other languages. Retain any capability limitation needed to avoid a misleading claim, and suggest one useful next action.',
  featureFacts:LULU_SECTIONS,sectionFacts:LULU_SECTIONS[section],
  capabilities:{supportLanguages:[...LANGUAGES],navigationViews:Object.keys(LULU_SECTIONS),character:'Shi Xiaolu (师小噜)',originalCharacterVoiceAvailable:false}};
}

export function createLuluIntroCatalog({directory,model}={}){
 if(typeof directory!=='string'||!directory||typeof model!=='string'||!model.trim())throw Error('An introduction directory and configured model are required.');
 const location=path.resolve(directory),pending=new Map();
 const file=(section,language)=>path.join(location,`${section}-${language}.json`);
 // This content identity invalidates generated assets when their authoritative facts change.
 const revision=(section,language)=>createHash('sha256').update(JSON.stringify({format:FORMAT,system:LULU_SYSTEM,request:luluIntroRequest(section,language),model})).digest('hex');
 function validated(result){
  if(!result||typeof result.reply!=='string'||!result.reply.trim()||result.reply.length>6000)throw invalid('The learning companion could not prepare an introduction. Please try again.');
  if(result.model!==undefined&&result.model!==model)throw invalid('The saved introduction uses a different model.');
  const generatedAt=result.generatedAt===undefined?new Date().toISOString():result.generatedAt;
  if(typeof generatedAt!=='string'||!Number.isFinite(Date.parse(generatedAt)))throw invalid('The saved introduction has an invalid generation date.');
  return{reply:result.reply.trim(),actions:luluActions(result.actions),generatedAt:new Date(generatedAt).toISOString(),model};
 }
 async function get(section,language){
  selection(section,language);
  let source;try{source=await fs.readFile(file(section,language),'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
  if(Buffer.byteLength(source)>32768)return null;
  let saved;try{saved=JSON.parse(source);}catch{return null;}
  if(saved?.format!==FORMAT||saved.section!==section||saved.language!==language||saved.revision!==revision(section,language)||saved.model!==model)return null;
  try{return validated(saved);}catch{return null;}
 }
 async function put(section,language,result){
  selection(section,language);const clean=validated(result);
  const saved={format:FORMAT,section,language,revision:revision(section,language),...clean};
  const target=file(section,language),previous=writes.get(target)||Promise.resolve();
  const operation=previous.catch(()=>{}).then(async()=>{
   await fs.mkdir(location,{recursive:true});const temporary=target+'.'+randomUUID()+'.tmp';
   try{
    await fs.writeFile(temporary,JSON.stringify(saved)+'\n',{encoding:'utf8',mode:0o600});
    for(let attempt=0;;attempt++){
     try{await fs.rename(temporary,target);break;}
     catch(error){if(attempt>=3||!['EPERM','EACCES','EBUSY'].includes(error.code))throw error;await new Promise(resolve=>setTimeout(resolve,20*(attempt+1)));}
    }
   }finally{await fs.rm(temporary,{force:true}).catch(()=>{});}
   return clean;
  });
  writes.set(target,operation);try{return await operation;}finally{if(writes.get(target)===operation)writes.delete(target);}
 }
 async function resolve(section,language,generate){
  selection(section,language);if(typeof generate!=='function')throw Error('An introduction generator is required.');
  const key=section+':'+language;
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{const saved=await get(section,language);if(saved)return{result:saved,cached:true};return{result:await put(section,language,await generate()),cached:false};})();
  pending.set(key,task);
  try{return await task;}finally{if(pending.get(key)===task)pending.delete(key);}
 }
 return{get,put,resolve};
}
