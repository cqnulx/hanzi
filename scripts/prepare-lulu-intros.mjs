import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {LULU_SECTIONS,LULU_SYSTEM} from '../lulu-guide.mjs';
import {createLuluIntroCatalog,luluIntroRequest} from '../lulu-intros.mjs';
import {LANGUAGES,languageInfo} from '../public/languages.js';
import {splitLuluSpeech} from '../public/lulu-speech.js';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args=process.argv.slice(2),validFlags=new Set(['--text-only','--voice-only','--languages','--sections']);
function choice(flag,allowed){
 const at=args.indexOf(flag);if(at<0)return allowed;
 const values=(args[at+1]||'').split(',').filter(Boolean);
 if(!values.length||values.some(value=>!allowed.includes(value)))throw Error('Invalid '+flag+' selection.');
 return [...new Set(values)];
}
for(let index=0;index<args.length;index++){
 if(!validFlags.has(args[index]))throw Error('Unknown preparation option.');
 if(['--languages','--sections'].includes(args[index]))index++;
}
if(args.includes('--text-only')&&args.includes('--voice-only'))throw Error('Choose one preparation stage.');
try{process.loadEnvFile(path.join(root,'.env'));}catch(error){if(error.code!=='ENOENT')throw Error('The local configuration could not be read.');}
const model=process.env.DEEPSEEK_MODEL||'deepseek-chat';
const catalog=createLuluIntroCatalog({directory:path.join(root,'data','lulu-intros'),model});
const languages=choice('--languages',LANGUAGES.map(item=>item.code));
const sections=choice('--sections',Object.keys(LULU_SECTIONS));
const pairs=languages.flatMap(language=>sections.map(section=>({section,language})));
const failed=[];
async function generate(section,language){
 if(!process.env.DEEPSEEK_API_KEY)throw Error('The learning model is not configured.');
 const support=language==='zh'?'simplified Chinese':languageInfo(language).name;
 const system=LULU_SYSTEM+`\nWrite the entire reply and action labels in ${support}. Generate a reusable standard introduction for any learner, with no personal profile, name, progress or achievements. Use two or three short natural spoken sentences, at most 90 characters for Chinese/Japanese/Korean or 55 words for other languages. Include the essential limitation of transcript-only feedback when introducing speaking, and one concrete next step. Do not mention AI, vendors, models, APIs or technical implementation. Return the required JSON object only.`;
 for(let attempt=0;attempt<3;attempt++){
  let response;
  try{response=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.DEEPSEEK_API_KEY}`},body:JSON.stringify({model,temperature:.4,max_tokens:900,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(luluIntroRequest(section,language))}]}),signal:AbortSignal.timeout(55000)});}
  catch{if(attempt===2)throw Error('The learning model could not be reached.');continue;}
  if(!response.ok){if(response.status>=500&&attempt<2)continue;throw Error('The learning model returned status '+response.status+'.');}
  let result;
  try{const payload=await response.json();result=JSON.parse((payload.choices?.[0]?.message?.content||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim());}
  catch{if(attempt<2)continue;throw Error('The generated introduction was incomplete.');}
  return catalog.put(section,language,{...result,generatedAt:new Date().toISOString(),model});
 }
}
async function prepareText(pair){
 const {section,language}=pair,started=performance.now();
 try{
  let result=await catalog.get(section,language),cached=Boolean(result);
  if(!result){if(args.includes('--voice-only'))throw Error('Generate the introduction text first.');result=await generate(section,language);}
  console.log(JSON.stringify({stage:'text',section,language,cached,elapsedMs:Math.round(performance.now()-started)}));
  return {...pair,result};
 }catch(error){failed.push({stage:'text',section,language,error:error.message});return null;}
}
const prepared=[];let cursor=0;
await Promise.all(Array.from({length:Math.min(4,pairs.length)},async()=>{
 while(cursor<pairs.length){const pair=pairs[cursor++],result=await prepareText(pair);if(result)prepared.push(result);}
}));
if(!args.includes('--text-only')){
 const health=await fetch('http://127.0.0.1:4187/health',{signal:AbortSignal.timeout(5000)}).then(response=>response.json()).catch(()=>null);
 if(health?.status!=='ready')throw Error('Start the local reference voice service before preparing speech.');
 for(const {section,language,result}of prepared){
  const segments=splitLuluSpeech(result.reply,language);
  for(let segmentIndex=0;segmentIndex<segments.length;segmentIndex++){
   const started=performance.now();
   try{
    const response=await fetch('http://127.0.0.1:4187/synthesize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:segments[segmentIndex],language,cache:'standard-intro'}),signal:AbortSignal.timeout(110000)});
    if(!response.ok)throw Error('Reference voice returned status '+response.status+'.');
    const wav=Buffer.from(await response.arrayBuffer());
    if(wav.length<44||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('The prepared voice was not a WAV recording.');
    console.log(JSON.stringify({stage:'voice',section,language,segmentIndex,segmentCount:segments.length,elapsedMs:Math.round(performance.now()-started),bytes:wav.length}));
   }catch(error){failed.push({stage:'voice',section,language,segmentIndex,error:error.message});}
  }
 }
}
const summary={prepared:prepared.length,requested:pairs.length,stage:args.includes('--text-only')?'text':'text-and-voice',failed};
await fs.mkdir(path.join(root,'runtime'),{recursive:true});
await fs.writeFile(path.join(root,'runtime','lulu-intro-preparation.json'),JSON.stringify({...summary,completedAt:new Date().toISOString()},null,2)+'\n');
console.log(JSON.stringify(summary));
if(failed.length)process.exitCode=1;
