import test from 'node:test';
import assert from 'node:assert/strict';
import {createLuluConversation,createLuluVoicePlayback,normalizeGuideSection,voiceForLanguage,clampLuluPosition,luluAnchorPosition,luluPanelPlacement} from '../public/lulu.js';
import {splitLuluSpeech} from '../public/lulu-speech.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};

test('drag positions stay visible and saved anchors preserve their relative place after resize',()=>{
 const size={width:200,height:180},large={width:1400,height:900},small={width:600,height:400};
 assert.deepEqual(clampLuluPosition({x:-100,y:9000},large,size),{x:12,y:708});
 const pixel={x:1188,y:708},anchor=luluAnchorPosition(pixel,large,size,{normalise:true});assert.deepEqual(anchor,{x:1,y:1});
 assert.deepEqual(luluAnchorPosition(anchor,small,size),{x:388,y:208});
 assert.deepEqual(luluAnchorPosition({x:9,y:-4},small,size),{x:388,y:12});
 const middle=luluAnchorPosition({x:.5,y:.5},large,size);assert.deepEqual(luluAnchorPosition(middle,large,size,{normalise:true}),{x:.5,y:.5});
});

test('guide dialogs choose above, below or side space and stay inside the viewport without covering the character',()=>{
 const size={width:200,height:180},viewport={width:1400,height:900};
 for(const [position,expected] of [[{x:12,y:12},'below'],[{x:1188,y:708},'above'],[{x:12,y:360},'right'],[{x:1188,y:360},'left']]){
  const panel=luluPanelPlacement(position,size,viewport);assert.equal(panel.side,expected);
  assert.ok(panel.x>=12&&panel.y>=12);assert.ok(panel.x+panel.width<=viewport.width-12);assert.ok(panel.y+panel.maxHeight<=viewport.height-12);
  assert.ok(panel.x+panel.width<=position.x||panel.x>=position.x+size.width||panel.y+panel.maxHeight<=position.y||panel.y>=position.y+size.height,'panel and character do not overlap');
 }
 const compact=luluPanelPlacement({x:100,y:12},size,{width:360,height:600});assert.equal(compact.width,336);assert.ok(compact.x+compact.width<=348);assert.ok(compact.y+compact.maxHeight<=588);
});
test('guide requests carry the selected section and language, accept safe actions, and wait for explicit interaction',async()=>{
 const calls=[],replies=[];
 const guide=createLuluConversation({getLanguage:()=>'zh',getView:()=>'write',request:async payload=>{calls.push(payload);return{reply:'我们可以一起修改中文句子。',actions:[{view:'write',label:'去写作'},{view:'https://example.com',label:'Outside'},{view:'learn',label:4}]};},onReply:(...args)=>replies.push(args)});
 assert.equal(calls.length,0,'mounting a guide does not spend a model request');
 await guide.ask('chat',' 我想修改句子。 ');
 assert.deepEqual(calls,[{mode:'chat',section:'write',language:'zh',message:'我想修改句子。'}]);
 assert.deepEqual(guide.state.actions,[{view:'write',label:'去写作'}]);
 assert.deepEqual(replies,[['我们可以一起修改中文句子。','zh']]);
 assert.equal(guide.state.pending,false);assert.equal(guide.state.error,false);
});

test('a reply from an old section, language or disposed guide cannot replace the current content or be spoken',async()=>{
 for(const change of ['section','language','dispose']){
  const waiting=deferred(),spoken=[];let lang='en';
  const guide=createLuluConversation({getLanguage:()=>lang,getView:()=>'learn',request:()=>waiting.promise,onReply:reply=>spoken.push(reply)});
  const request=guide.ask('intro');
  if(change==='section')guide.selectSection('memory');
  else if(change==='language'){lang='ja';guide.refreshLanguage();}
  else guide.dispose();
  waiting.resolve({reply:'An outdated reply',actions:[]});
  assert.equal(await request,null);assert.equal(guide.state.reply,'');assert.deepEqual(spoken,[]);assert.equal(guide.state.pending,false);
 }
});

test('failed guide requests expose a retry state without inventing a response or replaying automatically',async()=>{
 const calls=[];let fail=true;
 const guide=createLuluConversation({getLanguage:()=>'es',getView:()=>'path',request:async payload=>{calls.push(payload);if(fail)throw Error('Temporary connection failure');return{reply:'Tu plan se adapta a tu aprendizaje.',actions:[]};}});
 await guide.ask('intro');assert.equal(calls.length,1);assert.equal(guide.state.error,true);assert.equal(guide.state.reply,'');
 fail=false;await guide.retry();assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.equal(guide.state.error,false);assert.equal(guide.state.reply,'Tu plan se adapta a tu aprendizaje.');
});

test('voice selection follows all seven support languages and never reads with an unrelated voice',()=>{
 const languages=['zh','en','es','fr','de','ja','ko'];
 const voices=languages.map(code=>({name:code+' device voice',lang:code==='zh'?'zh-CN':code}));
 for(const code of languages)assert.equal(voiceForLanguage(voices,code).lang.split('-')[0],code);
 assert.equal(voiceForLanguage([{name:'English only',lang:'en-US'}],'zh'),null);
 assert.equal(normalizeGuideSection('javascript:alert(1)'),'overview');
 assert.equal(normalizeGuideSection('memory'),'memory');
});

const generatedVoice=(language='zh')=>({voice:'reference',language,audio:{mime:'audio/wav',data:'UklGRg=='}});
function audioDouble({play=async()=>{}}={}){return{src:'',pauseCount:0,loadCount:0,async play(){this.onplay?.();await play();},pause(){this.pauseCount++;},load(){this.loadCount++;},removeAttribute(){this.src='';}};}

test('reference playback ignores a completed synthesis after Stop and releases a playing clip on a new page',async()=>{
 const waiting=deferred(),clips=[],urls=[],revoked=[],states=[];
 const playback=createLuluVoicePlayback({requestVoice:()=>waiting.promise,onState:state=>states.push(state),createAudio:()=>{const clip=audioDouble();clips.push(clip);return clip;},createUrl:()=>{const url='blob:'+urls.length;urls.push(url);return url;},revokeUrl:url=>revoked.push(url)});
 const old=playback.play('第一段回答','zh');playback.stop();waiting.resolve(generatedVoice());
 assert.equal(await old,false);assert.equal(clips.length,0);assert.deepEqual(urls,[]);
 assert.equal(await playback.play('当前回答','zh'),true);assert.equal(states.at(-1),'playing');
 playback.stop();assert.equal(clips[0].pauseCount,1);assert.equal(clips[0].src,'');assert.deepEqual(revoked,['blob:0']);assert.equal(states.at(-1),'idle');
 playback.dispose();
});

test('blocked autoplay keeps one generated response for explicit replay without another synthesis request',async()=>{
 let calls=0;const clips=[],states=[],revoked=[];
 const playback=createLuluVoicePlayback({requestVoice:async payload=>{calls++;assert.deepEqual(payload,{text:'Hello from Lulu',language:'en',segmentIndex:0});return generatedVoice('en');},onState:state=>states.push(state),createAudio:()=>{const clip=audioDouble({play:async()=>{if(!clips.length)throw Object.assign(Error('gesture required'),{name:'NotAllowedError'});}});clips.push(clip);if(clips.length===1)clip.play=async()=>{throw Object.assign(Error('gesture required'),{name:'NotAllowedError'});};return clip;},createUrl:()=>`blob:${clips.length}`,revokeUrl:url=>revoked.push(url)});
 assert.equal(await playback.play('Hello from Lulu','en'),false);assert.equal(states.at(-1),'blocked');assert.equal(calls,1);
 assert.equal(await playback.play('Hello from Lulu','en'),true);assert.equal(calls,1);assert.equal(states.at(-1),'playing');
 clips[1].onended();assert.equal(states.at(-1),'idle');assert.deepEqual(revoked,['blob:0','blob:1']);playback.dispose();
});

test('reference voice failures stay explicit and unrelated language audio is never played',async()=>{
 for(const requestVoice of [async()=>{throw Error('offline');},async()=>generatedVoice('en')]){
  const states=[];let played=0;
  const playback=createLuluVoicePlayback({requestVoice,onState:state=>states.push(state),createAudio:()=>{played++;return audioDouble();},createUrl:()=>{throw Error('Should not decode');}});
  assert.equal(await playback.play('中文回答','zh'),false);assert.equal(states.at(-1),'unavailable');assert.equal(played,0);playback.dispose();
 }
});

test('clearing the learning context cancels the old reply and discards its cached recording',async()=>{
 const waiting=deferred(),spoken=[];
 const guide=createLuluConversation({request:()=>waiting.promise,getLanguage:()=>'zh',getView:()=>'overview',onReply:value=>spoken.push(value)});
 const pending=guide.ask('intro');guide.refreshLanguage();waiting.resolve({reply:'A reply from a deleted context',actions:[]});
 assert.equal(await pending,null);assert.deepEqual(spoken,[]);assert.equal(guide.state.lastRequest,null);assert.equal(guide.state.reply,'');
 let requests=0;
 const playback=createLuluVoicePlayback({requestVoice:async()=>{requests++;return generatedVoice();},createAudio:()=>audioDouble(),createUrl:()=>`blob:${requests}`,revokeUrl:()=>{}});
 await playback.play('同一句话','zh');playback.reset();await playback.play('同一句话','zh');assert.equal(requests,2);playback.dispose();
});

const progressiveText='你好，我是师小噜，很高兴陪你学习中文。我们可以一起练习口语和互动写作。接下来看看适合你的学习计划。'.repeat(3);
const segmentVoice=(index,count)=>({...generatedVoice(),segmentIndex:index,segmentCount:count});
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('the first segment plays before later synthesis finishes, with only one segment prefetched and cached replay',async()=>{
 const count=splitLuluSpeech(progressiveText,'zh').length;assert.ok(count>=3);
 const waiting=Array.from({length:count},deferred),calls=[],clips=[],states=[],revoked=[];
 let pending=0,maxPending=0;
 const playback=createLuluVoicePlayback({requestVoice:async payload=>{calls.push(payload);pending++;maxPending=Math.max(maxPending,pending);try{return await waiting[payload.segmentIndex].promise;}finally{pending--;}},onState:state=>states.push(state),createAudio:()=>{const clip=audioDouble();clips.push(clip);return clip;},createUrl:()=>`blob:${clips.length}`,revokeUrl:url=>revoked.push(url)});
 const first=playback.play(progressiveText,'zh');await flush();assert.deepEqual(calls.map(call=>call.segmentIndex),[0]);
 waiting[0].resolve(segmentVoice(0,count));assert.equal(await first,true);await flush();
 assert.equal(clips.length,1);assert.equal(states.at(-1),'playing');assert.deepEqual(calls.map(call=>call.segmentIndex),[0,1]);assert.equal(pending,1);
 const advance=clips[0].onended();assert.equal(states.at(-1),'loading');assert.equal(clips.length,1);
 waiting[1].resolve(segmentVoice(1,count));assert.equal(await advance,true);await flush();assert.equal(clips.length,2);assert.equal(states.at(-1),'playing');assert.deepEqual(calls.map(call=>call.segmentIndex),[0,1,2]);
 for(let index=2;index<count;index++){waiting[index].resolve(segmentVoice(index,count));await clips[index-1].onended();await flush();}
 clips.at(-1).onended();assert.equal(states.at(-1),'idle');assert.equal(maxPending,1);assert.equal(revoked.length,count);
 const before=calls.length;assert.equal(await playback.play(progressiveText,'zh'),true);
 for(let index=0;index<count;index++)await clips[count+index].onended();
 assert.equal(calls.length,before,'replay uses the one cached reply, including all its segments');assert.equal(states.at(-1),'idle');assert.ok(calls.every(call=>call.text===progressiveText&&call.language==='zh'));playback.dispose();
});

test('stopping during prefetch never starts an old segment or schedules the following segment',async()=>{
 const count=splitLuluSpeech(progressiveText,'zh').length,waiting=deferred(),clips=[],calls=[];
 const playback=createLuluVoicePlayback({requestVoice:async payload=>{calls.push(payload.segmentIndex);return payload.segmentIndex===0?segmentVoice(0,count):waiting.promise;},createAudio:()=>{const clip=audioDouble();clips.push(clip);return clip;},createUrl:()=>`blob:${clips.length}`,revokeUrl:()=>{}});
 await playback.play(progressiveText,'zh');await flush();assert.deepEqual(calls,[0,1]);
 const ended=clips[0].onended;playback.stop();waiting.resolve(segmentVoice(1,count));await flush();await ended();
 assert.equal(clips.length,1);assert.deepEqual(calls,[0,1]);assert.equal(clips[0].pauseCount,1);
 // The completed prefetch may be reused, but Stop never starts it by itself.
 await playback.play(progressiveText,'zh');await flush();assert.deepEqual(calls,[0,1]);assert.equal(clips.length,2);playback.dispose();
});

test('prefetch starts on playback even when the media play promise stays pending until the clip ends',async()=>{
 const count=splitLuluSpeech(progressiveText,'zh').length,calls=[],clips=[],playSettled=[],events=[];
 const playback=createLuluVoicePlayback({requestVoice:async payload=>{calls.push(payload.segmentIndex);return segmentVoice(payload.segmentIndex,count);},onState:(state,progress)=>events.push({state,progress}),createAudio:()=>{const waiting=deferred();playSettled.push(waiting);const clip=audioDouble({play:()=>waiting.promise});clips.push(clip);return clip;},createUrl:()=>`blob:${clips.length}`,revokeUrl:()=>{}});
 const first=playback.play(progressiveText,'zh');await flush();
 assert.equal(clips.length,1);assert.deepEqual(calls,[0,1],'the second request begins while the opening play promise is still pending');
 assert.deepEqual(events.at(-1),{state:'playing',progress:{segmentIndex:0,segmentCount:count}});
 const second=clips[0].onended();playSettled[0].resolve();await first;await flush();
 assert.equal(clips.length,2);assert.deepEqual(calls,[0,1,2],'each playing clip prepares only its immediate successor');
 assert.deepEqual(events.at(-1),{state:'playing',progress:{segmentIndex:1,segmentCount:count}});
 const stalePlay=clips[1].onplay;playback.stop();stalePlay();playSettled[1].resolve();await second;
 assert.equal(events.at(-1).state,'idle');assert.deepEqual(calls,[0,1,2]);playback.dispose();
});

test('replaying while the next segment is preparing resumes it instead of repeating the opening',async()=>{
 const count=splitLuluSpeech(progressiveText,'zh').length,waiting=deferred(),calls=[],clips=[];
 const playback=createLuluVoicePlayback({requestVoice:async payload=>{calls.push(payload.segmentIndex);return payload.segmentIndex===1?waiting.promise:segmentVoice(payload.segmentIndex,count);},createAudio:()=>{const clip=audioDouble();clips.push(clip);return clip;},createUrl:()=>`blob:${clips.length}`,revokeUrl:()=>{}});
 await playback.play(progressiveText,'zh');const advancing=clips[0].onended();const resumed=playback.play(progressiveText,'zh');
 waiting.resolve(segmentVoice(1,count));assert.equal(await advancing,false);assert.equal(await resumed,true);await flush();
 assert.equal(clips.length,2);assert.deepEqual(calls,[0,1,2],'the opening is neither requested nor played again');playback.dispose();
});

test('autoplay blocking between segments resumes that cached segment without repeating the opening',async()=>{
 const count=splitLuluSpeech(progressiveText,'zh').length,calls=[],clips=[],states=[];
 const playback=createLuluVoicePlayback({requestVoice:async payload=>{calls.push(payload.segmentIndex);return segmentVoice(payload.segmentIndex,count);},onState:state=>states.push(state),createAudio:()=>{const clip=audioDouble();if(clips.length===1)clip.play=async()=>{throw Object.assign(Error('gesture required'),{name:'NotAllowedError'});};clips.push(clip);return clip;},createUrl:()=>`blob:${clips.length}`,revokeUrl:()=>{}});
 await playback.play(progressiveText,'zh');await flush();assert.equal(await clips[0].onended(),false);assert.equal(states.at(-1),'blocked');assert.deepEqual(calls,[0,1]);
 assert.equal(await playback.play(progressiveText,'zh'),true);await flush();assert.equal(clips.length,3);assert.deepEqual(calls,[0,1,2]);assert.equal(states.at(-1),'playing');playback.dispose();
});
