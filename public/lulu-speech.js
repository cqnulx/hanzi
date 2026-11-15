/** Short opening segments reduce time to first speech without omitting the reply. */
export function splitLuluSpeech(text,language='en'){
 const source=String(text).trim();if(!source)return[];
 const cjk=['zh','ja','ko'].includes(language),opening=cjk?32:110,later=cjk?64:220;
 const chunks=[];let remaining=source;
 while(remaining){
  const limit=chunks.length?later:opening;
  if(remaining.length<=limit){chunks.push(remaining);break;}
  const window=remaining.slice(0,limit+1),minimum=Math.floor(limit*.4);
  const matches=[...window.matchAll(/[。！？!?；;\n]|[.!](?=\s|$)/gu)];
  let end=matches.find(match=>match.index+1>=minimum)?.index;
  if(end!==undefined)end++;
  else{
   const pauses=[...window.matchAll(/[，,、：:]|\s/gu)].filter(match=>match.index>=minimum);
   end=pauses.at(-1)?.index;
   if(end!==undefined)end++;
  }
  if(!end){
   // Avoid cutting a Latin word or a surrogate pair at the hard limit.
   end=limit;
   if(!cjk){const space=remaining.indexOf(' ',limit);if(space>=0&&space<limit+45)end=space+1;}
   if(/[\uD800-\uDBFF]/.test(remaining[end-1]||''))end--;
  }
  const piece=remaining.slice(0,end).trim();if(piece)chunks.push(piece);
  remaining=remaining.slice(end).trim();
 }
 return chunks;
}
