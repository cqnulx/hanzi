import {splitLuluSpeech} from './public/lulu-speech.js';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const LANGUAGES=new Set(['zh','en','es','fr','de','ja','ko']);
const MAX_AUDIO_BYTES=20*1024*1024;

/** The reference recording and synthesis model stay behind this local adapter. */
export function createLuluVoice({origin='http://127.0.0.1:4187',fetchImpl=globalThis.fetch,timeoutMs=110000}={}){
 let address;try{address=new URL(origin);}catch{throw Error('Invalid local voice service origin.');}
 if(address.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(address.hostname)||address.username||address.password||address.pathname!=='/'||address.search||address.hash)throw Error('The voice service must use a local HTTP origin.');
 return async function synthesize(input,history=[]){
  if(typeof input.text!=='string'||!input.text.trim()||input.text.length>6000||!LANGUAGES.has(input.language))throw fail(400,'Choose an available Lulu reply and language.');
  const text=input.text.trim(),language=input.language;
  if(!history.some(item=>item.role==='assistant'&&item.content===text&&item.language===language))throw fail(400,'Only a Lulu reply from this learning session can be read aloud.');
  const segmented=input.segmentIndex!==undefined,segments=segmented?splitLuluSpeech(text,language):[text],segmentIndex=segmented?input.segmentIndex:0;
  if(!Number.isInteger(segmentIndex)||segmentIndex<0||segmentIndex>=segments.length)throw fail(400,'Choose an available speech segment.');
  let response;
  try{response=await fetchImpl(new URL('/synthesize',address),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:segments[segmentIndex],language}),redirect:'error',signal:AbortSignal.timeout(timeoutMs)});}
  catch{throw fail(503,'Lulu voice is temporarily unavailable. You can still read the reply.');}
  if(!response.ok)throw fail(503,'Lulu voice is still preparing or temporarily unavailable. You can still read the reply.');
  if(!/^audio\/(?:wav|x-wav)(?:;|$)/i.test(response.headers.get('content-type')||'')||Number(response.headers.get('content-length'))>MAX_AUDIO_BYTES)throw fail(502,'The voice service returned an invalid recording.');
  const chunks=[];let size=0;
  try{for await(const chunk of response.body){size+=chunk.length;if(size>MAX_AUDIO_BYTES)throw Error('Oversized recording');chunks.push(chunk);}}
  catch{throw fail(502,'The voice recording could not be received. Please try again.');}
  const audio=Buffer.concat(chunks);
  if(audio.length<44||audio.toString('ascii',0,4)!=='RIFF'||audio.toString('ascii',8,12)!=='WAVE')throw fail(502,'The voice service returned an invalid recording.');
  return{audio:{mime:'audio/wav',data:audio.toString('base64')},voice:'reference',language,bytes:audio.length,...(segmented?{segmentIndex,segmentCount:segments.length}:{})};
 };
}
