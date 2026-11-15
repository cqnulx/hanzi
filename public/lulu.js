import {splitLuluSpeech} from './lulu-speech.js?v=voice-fast-1';
const SECTIONS=['overview','learn','speak','write','path','memory'];
const LOCALES={zh:'zh-CN',en:'en-US',es:'es-ES',fr:'fr-FR',de:'de-DE',ja:'ja-JP',ko:'ko-KR'};
const COPY={
 zh:{name:'师小噜',open:'找师小噜帮忙',close:'收起师小噜',title:'师小噜陪你学中文',hello:'你好，我是师小噜！想了解哪个功能，或和我聊聊你的学习？',sections:['学习首页','视频课堂','口语练习','互动写作','学习计划','学习记忆'],intro:'介绍当前功能',tour:'带我参观',previous:'上一站',next:'下一站',finish:'结束参观',send:'发送',placeholder:'问问师小噜，或试着写一句中文…',input:'和师小噜说点什么',thinking:'师小噜正在准备回答…',voice:'朗读回答',voiceNote:'卡通音色 · 使用设备语音',play:'再听一遍',stop:'停止朗读',mic:'用语音输入',listening:'正在听，请说话…',micUnavailable:'当前浏览器暂不支持语音输入，请直接打字。',micError:'没有听清或未获得麦克风权限，请重试或打字。',noVoice:'当前设备没有此语言的语音，仍可阅读文字。',speechError:'朗读暂未完成，可再次点击播放。',error:'师小噜暂时没有连上伴学服务，请稍后重试。',retry:'重试',languageChanged:'语言已切换，可以重新介绍或继续聊天。',viewChanged:'想了解这个页面？点击“介绍当前功能”。',you:'你',actions:'接下来可以',current:'当前功能',tourStep:'参观进度',empty:'先写点什么，再发给师小噜。'},
 en:{name:'Shi Xiaolu',open:'Ask Shi Xiaolu',close:'Minimize Shi Xiaolu',title:'Learn Chinese with Shi Xiaolu',hello:'Hi, I’m Shi Xiaolu! Which feature would you like to explore, or what are you learning?',sections:['Overview','Video lessons','Speaking studio','Writing workshop','Learning plan','Learning memory'],intro:'Explain this feature',tour:'Show me around',previous:'Previous',next:'Next stop',finish:'Finish tour',send:'Send',placeholder:'Ask Shi Xiaolu, or try a sentence in Chinese…',input:'Talk with Shi Xiaolu',thinking:'Shi Xiaolu is preparing a reply…',voice:'Read replies aloud',voiceNote:'Cartoon voice · device speech',play:'Listen again',stop:'Stop reading',mic:'Speak your message',listening:'Listening…',micUnavailable:'Voice input is unavailable in this browser. Please type your message.',micError:'No clear speech or microphone permission. Try again or type.',noVoice:'This device has no voice for this language. You can still read the text.',speechError:'Playback could not finish. Try listening again.',error:'Shi Xiaolu could not reach the learning service. Please try again shortly.',retry:'Try again',languageChanged:'Language changed. Ask for a new introduction or continue chatting.',viewChanged:'Want to explore this page? Choose “Explain this feature”.',you:'You',actions:'You can try',current:'Current feature',tourStep:'Tour progress',empty:'Write a message for Shi Xiaolu first.'},
 es:{name:'Shi Xiaolu',open:'Pregúntale a Shi Xiaolu',close:'Minimizar a Shi Xiaolu',title:'Aprende chino con Shi Xiaolu',hello:'¡Hola, soy Shi Xiaolu! ¿Qué función quieres conocer o qué estás aprendiendo?',sections:['Inicio','Clases en vídeo','Práctica oral','Taller de escritura','Plan de aprendizaje','Memoria de aprendizaje'],intro:'Explicar esta función',tour:'Mostrarme la web',previous:'Anterior',next:'Siguiente parada',finish:'Terminar visita',send:'Enviar',placeholder:'Pregunta a Shi Xiaolu o escribe una frase en chino…',input:'Habla con Shi Xiaolu',thinking:'Shi Xiaolu está preparando una respuesta…',voice:'Leer las respuestas',voiceNote:'Voz de dibujo animado · voz del dispositivo',play:'Escuchar otra vez',stop:'Detener lectura',mic:'Dictar un mensaje',listening:'Escuchando…',micUnavailable:'Este navegador no admite dictado. Escribe tu mensaje.',micError:'No se oyó con claridad o falta permiso. Inténtalo otra vez o escribe.',noVoice:'Este dispositivo no tiene una voz para este idioma. Puedes leer el texto.',speechError:'La lectura no pudo terminar. Intenta escuchar otra vez.',error:'Shi Xiaolu no pudo conectar con el servicio. Inténtalo de nuevo en unos instantes.',retry:'Reintentar',languageChanged:'Idioma cambiado. Pide otra introducción o sigue conversando.',viewChanged:'Para conocer esta página, elige «Explicar esta función».',you:'Tú',actions:'Puedes probar',current:'Función actual',tourStep:'Progreso de la visita',empty:'Primero escribe un mensaje para Shi Xiaolu.'},
 fr:{name:'Shi Xiaolu',open:'Demander à Shi Xiaolu',close:'Réduire Shi Xiaolu',title:'Apprenez le chinois avec Shi Xiaolu',hello:'Bonjour, je suis Shi Xiaolu ! Quelle fonction souhaitez-vous découvrir, ou que voulez-vous apprendre ?',sections:['Accueil','Cours vidéo','Pratique orale','Atelier d’écriture','Plan d’apprentissage','Mémoire d’apprentissage'],intro:'Présenter cette fonction',tour:'Me faire visiter',previous:'Précédent',next:'Étape suivante',finish:'Terminer la visite',send:'Envoyer',placeholder:'Posez une question à Shi Xiaolu ou écrivez une phrase en chinois…',input:'Parler avec Shi Xiaolu',thinking:'Shi Xiaolu prépare une réponse…',voice:'Lire les réponses',voiceNote:'Voix de dessin animé · voix de l’appareil',play:'Réécouter',stop:'Arrêter la lecture',mic:'Dicter un message',listening:'À l’écoute…',micUnavailable:'La saisie vocale est indisponible ici. Écrivez votre message.',micError:'Parole peu claire ou autorisation refusée. Réessayez ou écrivez.',noVoice:'Cet appareil ne possède pas de voix pour cette langue. Le texte reste disponible.',speechError:'La lecture n’a pas pu se terminer. Réessayez.',error:'Shi Xiaolu ne peut pas joindre le service. Réessayez dans un instant.',retry:'Réessayer',languageChanged:'Langue modifiée. Demandez une nouvelle présentation ou poursuivez la conversation.',viewChanged:'Pour découvrir cette page, choisissez « Présenter cette fonction ».',you:'Vous',actions:'Vous pouvez essayer',current:'Fonction actuelle',tourStep:'Progression de la visite',empty:'Écrivez d’abord un message à Shi Xiaolu.'},
 de:{name:'Shi Xiaolu',open:'Shi Xiaolu fragen',close:'Shi Xiaolu minimieren',title:'Mit Shi Xiaolu Chinesisch lernen',hello:'Hallo, ich bin Shi Xiaolu! Welche Funktion möchtest du entdecken oder was möchtest du lernen?',sections:['Übersicht','Videolektionen','Sprechübungen','Schreibwerkstatt','Lernplan','Lerngedächtnis'],intro:'Diese Funktion erklären',tour:'Rundgang starten',previous:'Zurück',next:'Nächste Station',finish:'Rundgang beenden',send:'Senden',placeholder:'Frag Shi Xiaolu oder schreibe einen Satz auf Chinesisch…',input:'Mit Shi Xiaolu sprechen',thinking:'Shi Xiaolu bereitet eine Antwort vor…',voice:'Antworten vorlesen',voiceNote:'Comicstimme · Gerätestimme',play:'Noch einmal hören',stop:'Vorlesen stoppen',mic:'Nachricht diktieren',listening:'Ich höre zu…',micUnavailable:'Spracheingabe ist hier nicht verfügbar. Bitte tippe deine Nachricht.',micError:'Nicht deutlich verstanden oder kein Mikrofonzugriff. Erneut versuchen oder tippen.',noVoice:'Dieses Gerät hat keine Stimme für diese Sprache. Der Text bleibt lesbar.',speechError:'Die Wiedergabe wurde unterbrochen. Bitte erneut starten.',error:'Shi Xiaolu erreicht den Lerndienst gerade nicht. Bitte gleich erneut versuchen.',retry:'Erneut versuchen',languageChanged:'Sprache geändert. Bitte erneut vorstellen lassen oder weiterfragen.',viewChanged:'Wähle „Diese Funktion erklären“, um diese Seite kennenzulernen.',you:'Du',actions:'Das kannst du versuchen',current:'Aktuelle Funktion',tourStep:'Fortschritt',empty:'Schreibe zuerst eine Nachricht an Shi Xiaolu.'},
 ja:{name:'師小ルー',open:'師小ルーに聞く',close:'師小ルーを閉じる',title:'師小ルーと中国語を学ぼう',hello:'こんにちは、師小ルーです！どの機能を知りたいですか？学習の相談もできます。',sections:['学習ホーム','動画レッスン','発音・会話練習','作文ワークショップ','学習計画','学習メモリー'],intro:'この機能を紹介',tour:'サイトを案内して',previous:'前へ',next:'次の案内へ',finish:'案内を終える',send:'送信',placeholder:'師小ルーに質問するか、中国語で一文書いてみましょう…',input:'師小ルーに話す',thinking:'師小ルーが回答を準備しています…',voice:'回答を読み上げる',voiceNote:'アニメ風の音色 · 端末の音声',play:'もう一度聞く',stop:'読み上げを停止',mic:'音声で入力',listening:'聞いています…',micUnavailable:'このブラウザーでは音声入力が使えません。文字で入力してください。',micError:'音声が不明瞭か、マイクの許可がありません。再試行するか入力してください。',noVoice:'この端末には選択言語の音声がありません。文字は読めます。',speechError:'読み上げが完了しませんでした。もう一度お試しください。',error:'学習サービスにつながりません。少し待って再試行してください。',retry:'再試行',languageChanged:'言語を切り替えました。もう一度紹介を頼むか、会話を続けてください。',viewChanged:'このページを知りたいときは「この機能を紹介」を選んでください。',you:'あなた',actions:'次にできること',current:'現在の機能',tourStep:'案内の進み具合',empty:'まず師小ルーに送る内容を書いてください。'},
 ko:{name:'스샤오루',open:'스샤오루에게 물어보기',close:'스샤오루 접기',title:'스샤오루와 함께 중국어 배우기',hello:'안녕, 나는 스샤오루예요! 어떤 기능을 살펴볼까요? 학습에 관해서도 물어보세요.',sections:['학습 홈','동영상 수업','말하기 연습','쓰기 연습','학습 계획','학습 기억'],intro:'이 기능 소개',tour:'둘러보기',previous:'이전',next:'다음 안내',finish:'안내 마치기',send:'보내기',placeholder:'스샤오루에게 물어보거나 중국어 문장을 써 보세요…',input:'스샤오루와 대화하기',thinking:'스샤오루가 답변을 준비하고 있어요…',voice:'답변 읽어 주기',voiceNote:'만화 캐릭터 음색 · 기기 음성',play:'다시 듣기',stop:'읽기 중지',mic:'음성으로 입력',listening:'듣고 있어요…',micUnavailable:'이 브라우저에서는 음성 입력을 사용할 수 없어요. 직접 입력해 주세요.',micError:'잘 듣지 못했거나 마이크 권한이 없어요. 다시 시도하거나 입력해 주세요.',noVoice:'기기에 이 언어의 음성이 없어요. 글은 계속 읽을 수 있어요.',speechError:'읽기를 마치지 못했어요. 다시 재생해 주세요.',error:'학습 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',retry:'다시 시도',languageChanged:'언어를 바꿨어요. 소개를 다시 요청하거나 대화를 이어 가세요.',viewChanged:'이 페이지를 알아보려면 ‘이 기능 소개’를 눌러 주세요.',you:'나',actions:'다음으로 할 수 있는 일',current:'현재 기능',tourStep:'안내 진행',empty:'먼저 스샤오루에게 보낼 내용을 써 주세요.'},
};
const VOICE_COPY={
 zh:{voiceNote:'参考音色 · 合成语音',deviceVoiceNote:'卡通音色 · 使用设备语音',voiceLoading:'正在准备师小噜的声音…',voiceUnavailable:'师小噜的语音服务暂时不可用。可以重试，或选择设备卡通音色。',voiceBlocked:'语音已准备好，请点击“再听一遍”播放。',deviceVoice:'使用设备卡通音色'},
 en:{voiceNote:'Reference voice · generated speech',deviceVoiceNote:'Cartoon voice · device speech',voiceLoading:'Preparing Shi Xiaolu’s voice…',voiceUnavailable:'Shi Xiaolu’s voice service is unavailable. Retry or choose the device cartoon voice.',voiceBlocked:'The voice is ready. Choose “Listen again” to play it.',deviceVoice:'Use device cartoon voice'},
 es:{voiceNote:'Voz de referencia · audio generado',deviceVoiceNote:'Voz de dibujo animado · voz del dispositivo',voiceLoading:'Preparando la voz de Shi Xiaolu…',voiceUnavailable:'La voz de Shi Xiaolu no está disponible. Reintenta o elige la voz de dibujo animado del dispositivo.',voiceBlocked:'El audio está listo. Pulsa «Escuchar otra vez» para reproducirlo.',deviceVoice:'Usar voz de dibujo animado del dispositivo'},
 fr:{voiceNote:'Voix de référence · parole générée',deviceVoiceNote:'Voix de dessin animé · voix de l’appareil',voiceLoading:'Préparation de la voix de Shi Xiaolu…',voiceUnavailable:'La voix de Shi Xiaolu est indisponible. Réessayez ou choisissez la voix de dessin animé de l’appareil.',voiceBlocked:'La voix est prête. Choisissez « Réécouter » pour la lancer.',deviceVoice:'Utiliser la voix de dessin animé de l’appareil'},
 de:{voiceNote:'Referenzstimme · erzeugte Sprache',deviceVoiceNote:'Comicstimme · Gerätestimme',voiceLoading:'Shi Xiaolus Stimme wird vorbereitet…',voiceUnavailable:'Shi Xiaolus Sprachdienst ist nicht verfügbar. Erneut versuchen oder die Comicstimme des Geräts wählen.',voiceBlocked:'Die Aufnahme ist bereit. Wähle „Noch einmal hören“, um sie abzuspielen.',deviceVoice:'Comicstimme des Geräts verwenden'},
 ja:{voiceNote:'参考音声の声質 · 合成音声',deviceVoiceNote:'アニメ風の音色 · 端末の音声',voiceLoading:'師小ルーの音声を準備しています…',voiceUnavailable:'師小ルーの音声サービスが利用できません。再試行するか、端末のアニメ風音声を選んでください。',voiceBlocked:'音声の準備ができました。「もう一度聞く」を押してください。',deviceVoice:'端末のアニメ風音声を使う'},
 ko:{voiceNote:'참고 음색 · 합성 음성',deviceVoiceNote:'만화 캐릭터 음색 · 기기 음성',voiceLoading:'스샤오루의 목소리를 준비하고 있어요…',voiceUnavailable:'스샤오루의 음성 서비스를 사용할 수 없어요. 다시 시도하거나 기기의 만화 음색을 선택해 주세요.',voiceBlocked:'음성이 준비되었어요. ‘다시 듣기’를 눌러 주세요.',deviceVoice:'기기의 만화 음색 사용'},
};
const VOICE_PROGRESS={
 zh:{voiceFirst:'正在准备声音',voiceNext:'正在准备下一段',voiceReading:'正在朗读'},
 en:{voiceFirst:'Preparing the voice',voiceNext:'Preparing the next part',voiceReading:'Reading aloud'},
 es:{voiceFirst:'Preparando la voz',voiceNext:'Preparando la siguiente parte',voiceReading:'Leyendo en voz alta'},
 fr:{voiceFirst:'Préparation de la voix',voiceNext:'Préparation de la partie suivante',voiceReading:'Lecture en cours'},
 de:{voiceFirst:'Stimme wird vorbereitet',voiceNext:'Nächster Abschnitt wird vorbereitet',voiceReading:'Wird vorgelesen'},
 ja:{voiceFirst:'音声を準備しています',voiceNext:'次の部分の音声を準備しています',voiceReading:'読み上げ中'},
 ko:{voiceFirst:'음성을 준비하고 있어요',voiceNext:'다음 부분의 음성을 준비하고 있어요',voiceReading:'읽어 주고 있어요'},
};
for(const code of Object.keys(COPY))Object.assign(COPY[code],VOICE_COPY[code],VOICE_PROGRESS[code]);
const DRAG_HINT={zh:'拖动师小噜调整位置，单击打开对话',en:'Drag Shi Xiaolu to move; click to chat',es:'Arrastra a Shi Xiaolu para moverlo; haz clic para conversar',fr:'Déplacez Shi Xiaolu en le faisant glisser ; cliquez pour discuter',de:'Shi Xiaolu zum Verschieben ziehen; zum Chatten anklicken',ja:'師小ルーをドラッグして移動、クリックして会話',ko:'스샤오루를 끌어서 이동하고 클릭해서 대화해 보세요'};
const POSITION_KEY='hanzi-shixiaolu-position';
export const normalizeGuideSection=value=>SECTIONS.includes(value)?value:'overview';
const language=value=>Object.hasOwn(COPY,value)?value:'en';
const between=(value,min,max)=>Math.max(min,Math.min(Math.max(min,max),Number.isFinite(value)?value:min));
export function clampLuluPosition(position,viewport,size){
 const margin=Math.min(12,Math.max(0,Math.min(viewport.width,viewport.height)/4));
 return{x:between(position.x,margin,viewport.width-size.width-margin),y:between(position.y,margin,viewport.height-size.height-margin)};
}
export function luluAnchorPosition(position,viewport,size,{normalise=false}={}){
 const margin=Math.min(12,Math.max(0,Math.min(viewport.width,viewport.height)/4)),travelX=Math.max(0,viewport.width-size.width-margin*2),travelY=Math.max(0,viewport.height-size.height-margin*2);
 if(normalise){const p=clampLuluPosition(position,viewport,size);return{x:travelX?(p.x-margin)/travelX:0,y:travelY?(p.y-margin)/travelY:0};}
 return clampLuluPosition({x:margin+between(position.x,0,1)*travelX,y:margin+between(position.y,0,1)*travelY},viewport,size);
}
/** Choose usable space around the character, then constrain the entire dialog to the viewport. */
export function luluPanelPlacement(position,size,viewport){
 const margin=Math.min(12,Math.max(0,Math.min(viewport.width,viewport.height)/4)),gap=12,width=Math.min(440,Math.max(1,viewport.width-margin*2)),height=Math.min(740,Math.max(1,viewport.height-margin*2));
 const above=Math.max(0,position.y-gap-margin),below=Math.max(0,viewport.height-position.y-size.height-gap-margin),left=position.x-gap-margin,right=viewport.width-position.x-size.width-gap-margin;
 const sideFits=Math.max(left,right)>=width;
 let side,x,y,maxHeight;
 if(Math.max(above,below)>=Math.min(380,height)||!sideFits){
  side=above>=below?'above':'below';maxHeight=Math.min(height,Math.max(Math.min(120,height),side==='above'?above:below));
  x=position.x+size.width-width;y=side==='above'?position.y-gap-maxHeight:position.y+size.height+gap;
 }else{
  side=right>=left?'right':'left';maxHeight=height;x=side==='right'?position.x+size.width+gap:position.x-gap-width;y=position.y+size.height/2-maxHeight/2;
 }
 return{side,x:between(x,margin,viewport.width-width-margin),y:between(y,margin,viewport.height-maxHeight-margin),width,maxHeight};
}
export function voiceForLanguage(voices,code){
 const prefix=language(code),matching=voices.filter(voice=>String(voice.lang||'').toLowerCase().replaceAll('_','-').split('-')[0]===prefix);
 return matching.find(voice=>/xiaoxiao|xiaoyi|aria|jenny|samantha|susan|amelie|elvira|nanami|sunhi/i.test(voice.name||''))||matching.find(voice=>voice.default)||matching[0]||null;
}

/** Plays the opening sentence immediately, preparing only the next segment while it is heard. */
export function createLuluVoicePlayback({requestVoice,onState=()=>{},createAudio=()=>new Audio(),createUrl=audio=>URL.createObjectURL(new Blob([Uint8Array.from(atob(audio.data),c=>c.charCodeAt(0))],{type:audio.mime})),revokeUrl=url=>URL.revokeObjectURL(url)}){
 let generation=0,current=null,source=null,cached=null,disposed=false;
 function clear(){if(current){const previous=current;current=null;previous.onplay=previous.onended=previous.onerror=null;previous.pause();previous.removeAttribute('src');previous.load();}if(source){revokeUrl(source);source=null;}}
 function stop(){generation++;clear();onState('idle');}
 async function play(text,language){
  stop();if(disposed)return false;
  const sequence=generation,key=language+'\n'+text;
  if(cached?.key!==key)cached={key,count:Math.max(1,splitLuluSpeech(text,language).length),segments:new Map(),pending:new Map(),failures:new Map(),blockedIndex:null};
  const entry=cached;entry.failures.clear();
  const active=()=>!disposed&&sequence===generation;
  async function segment(index){
   if(entry.segments.has(index))return entry.segments.get(index);
   if(entry.failures.has(index))throw entry.failures.get(index);
   if(entry.pending.has(index))return entry.pending.get(index);
   let response;try{response=requestVoice({text,language,segmentIndex:index});}catch(error){entry.failures.set(index,error);throw error;}
   const pending=Promise.resolve(response).then(result=>{
    if(result?.voice!=='reference'||result.language!==language||result.audio?.mime!=='audio/wav'||typeof result.audio.data!=='string'||!result.audio.data||(result.segmentIndex!==undefined&&result.segmentIndex!==index)||(result.segmentCount!==undefined&&result.segmentCount!==entry.count))throw Error('Invalid reference speech');
    if(cached===entry)entry.segments.set(index,result);
    return result;
   }).catch(error=>{if(cached===entry)entry.failures.set(index,error);throw error;}).finally(()=>entry.pending.delete(index));
   entry.pending.set(index,pending);return pending;
  }
  async function start(index){
   if(!active())return false;
   const progress={segmentIndex:index,segmentCount:entry.count};
   entry.blockedIndex=index;
   onState('loading',progress);
   try{
    const result=await segment(index);if(!active())return false;
    source=createUrl(result.audio);const clip=createAudio();current=clip;clip.src=source;
    clip.onplay=()=>{
     if(!active()||current!==clip)return;
     entry.blockedIndex=null;
     onState('playing',progress);
     // Some media hosts settle play() only after playback. Prefetch on the
     // playback event so the next request always overlaps the current clip.
     if(index+1<entry.count)void segment(index+1).catch(()=>{});
    };
    clip.onended=()=>{
     if(!active()||current!==clip)return;
     clear();
     if(index+1<entry.count)return start(index+1);
     entry.blockedIndex=null;onState('idle');
    };
    clip.onerror=()=>{if(active()&&current===clip){entry.blockedIndex=index;clear();onState('unavailable');}};
    try{await clip.play();}
    catch(error){if(!active())return false;entry.blockedIndex=index;clear();onState(error?.name==='NotAllowedError'?'blocked':'unavailable');return false;}
    if(!active())return false;
    return true;
   }catch{if(active()){entry.blockedIndex=index;clear();onState('unavailable');}return false;}
  }
  return start(entry.blockedIndex??0);
 }
 return{play,stop,reset(){stop();cached=null;},dispose(){disposed=true;stop();cached=null;}};
}

/** Request state lives outside the page renderer, so guide replies cannot reset a quiz. */
export function createLuluConversation({request,getLanguage,getView,onChange=()=>{},onReply=()=>{}}){
 let generation=0,disposed=false;
 const state={section:normalizeGuideSection(getView()),reply:'',actions:[],pending:false,error:false,lastRequest:null};
 const cancel=()=>{generation++;state.pending=false;};
 async function ask(mode,message=''){
  const sequence=++generation,lang=language(getLanguage()),section=state.section;
  const payload={mode:mode==='chat'?'chat':'intro',section,language:lang,...(mode==='chat'?{message:String(message).trim().slice(0,2000)}:{})};
  state.pending=true;state.error=false;state.lastRequest=payload;onChange(state);
  try{
   const result=await request(payload);
   if(disposed||sequence!==generation||lang!==language(getLanguage())||section!==state.section)return null;
   if(typeof result.reply!=='string'||!result.reply.trim())throw Error('Incomplete reply');
   state.reply=result.reply.trim();state.actions=(Array.isArray(result.actions)?result.actions:[]).filter(action=>SECTIONS.includes(action?.view)&&typeof action.label==='string'&&action.label.trim()).slice(0,3).map(action=>({view:action.view,label:action.label.slice(0,80)}));
   state.pending=false;onChange(state);onReply(state.reply,lang);return result;
  }catch(error){if(!disposed&&sequence===generation){state.pending=false;state.error=true;onChange(state);}return null;}
 }
 return{state,ask,retry:()=>state.lastRequest?ask(state.lastRequest.mode,state.lastRequest.message):null,selectSection(section){cancel();state.section=normalizeGuideSection(section);state.reply='';state.actions=[];state.error=false;onChange(state);},refreshLanguage(){cancel();state.reply='';state.actions=[];state.error=false;state.lastRequest=null;onChange(state);},dispose(){disposed=true;cancel();}};
}

export function initializeLulu({request,requestVoice=async()=>{throw Error('Voice service is unavailable');},getLanguage,getView,navigate}){
 const root=document.createElement('aside');root.className='lulu-guide';root.dataset.noTranslate='';root.setAttribute('aria-label','Shi Xiaolu');
 root.innerHTML=`<button class="lulu-launcher" type="button" aria-expanded="false" aria-controls="lulu-panel"><span class="lulu-character"><img src="${new URL('./lulu-avatar.png?v=shixiaolu-drag-1',import.meta.url).href}" alt="" draggable="false"><span class="lulu-mouth" aria-hidden="true"></span></span><span class="lulu-launcher-label"></span></button><section class="lulu-panel" id="lulu-panel" role="dialog" aria-labelledby="lulu-title" hidden><header class="lulu-panel-header"><div><h2 id="lulu-title"></h2><p class="lulu-context"></p></div><button type="button" class="lulu-close">×</button></header><div class="lulu-panel-body"><label class="lulu-section-label"><span></span><select class="lulu-section"></select></label><div class="lulu-guide-buttons"><button type="button" class="lulu-intro"></button><button type="button" class="lulu-tour"></button></div><div class="lulu-tour-controls" hidden><span class="lulu-tour-step"></span><div><button type="button" class="lulu-previous"></button><button type="button" class="lulu-next"></button><button type="button" class="lulu-tour-finish"></button></div></div><div class="lulu-reply" aria-live="polite" aria-atomic="true"></div><div class="lulu-actions"></div><div class="lulu-error" role="alert" hidden><span></span><button class="lulu-retry" type="button"></button></div><div class="lulu-audio"><label><input class="lulu-audio-toggle" type="checkbox" checked><span></span></label><div><button class="lulu-replay" type="button"></button><button class="lulu-stop" type="button"></button></div><small class="lulu-voice-note"></small><p class="lulu-audio-status" role="status"></p></div><form class="lulu-chat"><label class="lulu-input-label" for="lulu-input"></label><textarea id="lulu-input" rows="2" maxlength="2000"></textarea><div><button class="lulu-mic" type="button"></button><button class="lulu-send" type="submit"></button></div><p class="lulu-input-status" role="status"></p></form></div></section>`;
 document.body.append(root);
 const find=selector=>root.querySelector(selector),panel=find('.lulu-panel'),launcher=find('.lulu-launcher'),input=find('#lulu-input'),reply=find('.lulu-reply');
 const deviceVoiceButton=document.createElement('button');deviceVoiceButton.className='lulu-device-voice';deviceVoiceButton.type='button';deviceVoiceButton.hidden=true;find('.lulu-audio').append(deviceVoiceButton);
 let opened=false,tourIndex=null,notice='',utterance=null,recognition=null,speechGeneration=0,disposed=false;
 let anchor=null,drag=null,suppressClick=false;
 try{const saved=JSON.parse(window.localStorage.getItem(POSITION_KEY));if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))anchor={x:between(saved.x,0,1),y:between(saved.y,0,1)};}catch{}
 const copy=()=>COPY[language(getLanguage())];
 const viewport=()=>({width:window.innerWidth,height:window.innerHeight});
 const launcherSize=()=>{const box=launcher.getBoundingClientRect();return{width:box.width,height:box.height};};
 function positionPanel(){
  if(!opened)return;
  const box=launcher.getBoundingClientRect(),layout=luluPanelPlacement({x:box.left,y:box.top},{width:box.width,height:box.height},viewport()),base=root.getBoundingClientRect();
  Object.assign(panel.style,{left:(layout.x-base.left)+'px',top:(layout.y-base.top)+'px',right:'auto',bottom:'auto',width:layout.width+'px',maxHeight:layout.maxHeight+'px'});panel.dataset.side=layout.side;
 }
 function applyPosition(position,{save=false}={}){
  const size=launcherSize(),screen=viewport(),point=clampLuluPosition(position,screen,size);
  Object.assign(root.style,{left:point.x+'px',top:point.y+'px',right:'auto',bottom:'auto'});anchor=luluAnchorPosition(point,screen,size,{normalise:true});
  if(save)try{window.localStorage.setItem(POSITION_KEY,JSON.stringify(anchor));}catch{}
  positionPanel();
 }
 function refreshPosition(){if(anchor)applyPosition(luluAnchorPosition(anchor,viewport(),launcherSize()));else positionPanel();}
 function finishDrag(event){
  if(!drag||event.pointerId!==drag.pointerId)return;
  const ended=drag;drag=null;root.classList.remove('is-dragging');
  if(launcher.hasPointerCapture?.(ended.pointerId))launcher.releasePointerCapture(ended.pointerId);
  if(ended.moved){suppressClick=true;const box=launcher.getBoundingClientRect();applyPosition({x:box.left,y:box.top},{save:true});if(event.cancelable)event.preventDefault();}
 }
 const referenceVoice=createLuluVoicePlayback({requestVoice,onState:(status,{segmentIndex,segmentCount}={})=>{
  root.classList.toggle('is-speaking',status==='playing');deviceVoiceButton.hidden=status!=='unavailable';
  const c=copy(),progress=Number.isInteger(segmentIndex)&&Number.isInteger(segmentCount)&&segmentIndex>=0&&segmentCount>segmentIndex?` (${segmentIndex+1}/${segmentCount})`:'';
  find('.lulu-audio-status').textContent=({loading:(segmentIndex>0?c.voiceNext:c.voiceFirst)+progress,playing:c.voiceReading+progress,unavailable:c.voiceUnavailable,blocked:c.voiceBlocked})[status]||'';
 }});
 function stopAudio(){speechGeneration++;referenceVoice.stop();if(utterance&&window.speechSynthesis)window.speechSynthesis.cancel();utterance=null;root.classList.remove('is-speaking');}
 function stopMicrophone(){if(recognition){const current=recognition;recognition=null;current.abort();}find('.lulu-input-status').textContent='';find('.lulu-mic').classList.remove('is-listening');}
 async function play(text,lang=language(getLanguage())){
  stopAudio();find('.lulu-voice-note').textContent=copy().voiceNote;
  if(!opened||disposed)return;
  await referenceVoice.play(text,lang);
 }
 async function playDeviceVoice(text,lang=language(getLanguage())){
  stopAudio();find('.lulu-audio-status').textContent='';
  find('.lulu-voice-note').textContent=copy().deviceVoiceNote;
  const sequence=speechGeneration,synth=window.speechSynthesis;
  if(!synth||!window.SpeechSynthesisUtterance){find('.lulu-audio-status').textContent=copy().noVoice;return;}
  let voices=synth.getVoices();
  if(!voices.length)voices=await new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);synth.removeEventListener('voiceschanged',done);resolve(synth.getVoices());};synth.addEventListener('voiceschanged',done,{once:true});timer=setTimeout(done,1400);});
  if(disposed||sequence!==speechGeneration||lang!==language(getLanguage())||!opened)return;
  const voice=voiceForLanguage(voices,lang);
  if(!voice){find('.lulu-audio-status').textContent=copy().noVoice;return;}
  utterance=new window.SpeechSynthesisUtterance(text.slice(0,4000));const current=utterance;
  current.lang=voice.lang;current.voice=voice;current.pitch=1.3;current.rate=.95;
  current.onstart=()=>{if(utterance===current)root.classList.add('is-speaking');};
  current.onend=()=>{if(utterance===current){utterance=null;root.classList.remove('is-speaking');}};
  current.onerror=event=>{if(utterance!==current)return;utterance=null;root.classList.remove('is-speaking');if(!['canceled','interrupted'].includes(event.error))find('.lulu-audio-status').textContent=copy().speechError;};
  try{synth.speak(current);}catch{utterance=null;root.classList.remove('is-speaking');find('.lulu-audio-status').textContent=copy().speechError;}
 }
 const conversation=createLuluConversation({request,getLanguage,getView,onChange:render,onReply:(text,lang)=>{if(opened&&find('.lulu-audio-toggle').checked)void play(text,lang);}});
 function render(){
  if(disposed)return;
  const c=copy(),s=conversation?.state;
  root.lang=LOCALES[language(getLanguage())];root.setAttribute('aria-label',c.name);launcher.setAttribute('aria-label',c.open);launcher.title=DRAG_HINT[language(getLanguage())];launcher.setAttribute('aria-expanded',String(opened));panel.hidden=!opened;
  find('.lulu-launcher-label').textContent=c.name;find('#lulu-title').textContent=c.title;find('.lulu-close').setAttribute('aria-label',c.close);find('.lulu-context').textContent=c.sections[SECTIONS.indexOf(s.section)];
  find('.lulu-section-label>span').textContent=c.current;
  const select=find('.lulu-section');select.replaceChildren(...SECTIONS.map((view,index)=>{const option=document.createElement('option');option.value=view;option.textContent=c.sections[index];return option;}));select.value=s.section;
  for(const [selector,key]of Object.entries({'.lulu-intro':'intro','.lulu-tour':'tour','.lulu-previous':'previous','.lulu-next':'next','.lulu-tour-finish':'finish','.lulu-retry':'retry','.lulu-replay':'play','.lulu-stop':'stop','.lulu-mic':'mic','.lulu-send':'send','.lulu-input-label':'input'}))find(selector).textContent=c[key];
  find('.lulu-audio label span').textContent=c.voice;find('.lulu-voice-note').textContent=c.voiceNote;deviceVoiceButton.textContent=c.deviceVoice;input.placeholder=c.placeholder;
  reply.textContent=s.pending?c.thinking:s.reply||notice||c.hello;reply.classList.toggle('is-pending',s.pending);
  const controls=find('.lulu-tour-controls');controls.hidden=tourIndex===null;find('.lulu-tour-step').textContent=tourIndex===null?'':`${c.tourStep} ${tourIndex+1} / ${SECTIONS.length}`;find('.lulu-previous').disabled=s.pending||tourIndex===0;find('.lulu-next').disabled=s.pending||tourIndex===SECTIONS.length-1;
  for(const button of root.querySelectorAll('.lulu-intro,.lulu-tour,.lulu-send,.lulu-retry'))button.disabled=s.pending;
  select.disabled=s.pending;find('.lulu-error').hidden=!s.error;find('.lulu-error span').textContent=c.error;
  find('.lulu-replay').disabled=!s.reply||s.pending;
  find('.lulu-actions').replaceChildren(...s.actions.map(action=>{const button=document.createElement('button');button.type='button';button.textContent=action.label;button.addEventListener('click',()=>{stopAudio();navigate(action.view);});return button;}));
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;find('.lulu-mic').hidden=!Recognition;
  refreshPosition();
 }
 function setOpen(value){opened=value;if(!value){stopAudio();stopMicrophone();launcher.focus();}render();if(value)input.focus();}
 function introduce(){notice='';stopAudio();stopMicrophone();void conversation.ask('intro');}
 function moveTour(index){tourIndex=Math.max(0,Math.min(SECTIONS.length-1,index));const section=SECTIONS[tourIndex];conversation.selectSection(section);navigate(section);introduce();}
 launcher.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.isPrimary===false||drag)return;
  suppressClick=false;const box=launcher.getBoundingClientRect();drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x:box.left,y:box.top,moved:false};
  launcher.setPointerCapture?.(event.pointerId);
 });
 launcher.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointerId)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  if(!drag.moved&&Math.hypot(dx,dy)<6)return;
  drag.moved=true;root.classList.add('is-dragging');if(event.cancelable)event.preventDefault();applyPosition({x:drag.x+dx,y:drag.y+dy});
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])launcher.addEventListener(type,finishDrag);
 launcher.addEventListener('dragstart',event=>event.preventDefault());
 launcher.addEventListener('click',event=>{if(suppressClick&&event.detail!==0){suppressClick=false;event.preventDefault();return;}suppressClick=false;setOpen(!opened);});find('.lulu-close').addEventListener('click',()=>setOpen(false));
 find('.lulu-intro').addEventListener('click',introduce);
 find('.lulu-tour').addEventListener('click',()=>moveTour(0));find('.lulu-previous').addEventListener('click',()=>moveTour(tourIndex-1));find('.lulu-next').addEventListener('click',()=>moveTour(tourIndex+1));find('.lulu-tour-finish').addEventListener('click',()=>{tourIndex=null;stopAudio();render();});
 find('.lulu-section').addEventListener('change',event=>{tourIndex=null;notice='';stopAudio();conversation.selectSection(event.target.value);});
 find('.lulu-retry').addEventListener('click',()=>{stopAudio();void conversation.retry();});find('.lulu-replay').addEventListener('click',()=>void play(conversation.state.reply));find('.lulu-stop').addEventListener('click',stopAudio);find('.lulu-audio-toggle').addEventListener('change',event=>{if(!event.target.checked)stopAudio();});
 deviceVoiceButton.addEventListener('click',()=>void playDeviceVoice(conversation.state.reply));
 find('.lulu-chat').addEventListener('submit',event=>{event.preventDefault();if(conversation.state.pending)return;const text=input.value.trim();if(!text){find('.lulu-input-status').textContent=copy().empty;input.focus();return;}notice='';stopAudio();stopMicrophone();void conversation.ask('chat',text).then(result=>{if(result&&input.value.trim()===text)input.value='';});});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();find('.lulu-chat').requestSubmit();}});
 find('.lulu-mic').addEventListener('click',()=>{
  if(recognition){stopMicrophone();return;}stopAudio();const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){find('.lulu-input-status').textContent=copy().micUnavailable;return;}
  const active=new Recognition();recognition=active;active.lang=LOCALES[language(getLanguage())];active.interimResults=false;active.continuous=false;
  active.onresult=event=>{if(recognition!==active)return;const text=event.results?.[event.resultIndex||0]?.[0]?.transcript;if(text)input.value=(input.value.trim()?input.value.trim()+' ':'')+text;};
  active.onerror=()=>{if(recognition===active)find('.lulu-input-status').textContent=copy().micError;};active.onend=()=>{if(recognition===active){recognition=null;find('.lulu-mic').classList.remove('is-listening');if(find('.lulu-input-status').textContent===copy().listening)find('.lulu-input-status').textContent='';}};
  try{active.start();find('.lulu-mic').classList.add('is-listening');find('.lulu-input-status').textContent=copy().listening;}catch{recognition=null;find('.lulu-input-status').textContent=copy().micError;}
 });
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){event.preventDefault();setOpen(false);}});
 const onPageHide=()=>{stopAudio();stopMicrophone();};window.addEventListener('pagehide',onPageHide);
 const avatar=find('.lulu-character img');avatar.addEventListener('load',refreshPosition);window.addEventListener('resize',refreshPosition);
 render();
 return{resetContext(){stopAudio();referenceVoice.reset();stopMicrophone();tourIndex=null;notice='';input.value='';conversation.refreshLanguage();},refreshLanguage(){stopAudio();stopMicrophone();tourIndex=null;notice=copy().languageChanged;find('.lulu-audio-status').textContent='';conversation.refreshLanguage();},notifyView(view){const section=normalizeGuideSection(view);if(section===conversation.state.section)return;stopAudio();stopMicrophone();tourIndex=null;notice=copy().viewChanged;conversation.selectSection(section);},dispose(){disposed=true;stopAudio();referenceVoice.dispose();stopMicrophone();conversation.dispose();avatar.removeEventListener('load',refreshPosition);window.removeEventListener('resize',refreshPosition);window.removeEventListener('pagehide',onPageHide);if(drag)finishDrag({pointerId:drag.pointerId});root.remove();}};
}
