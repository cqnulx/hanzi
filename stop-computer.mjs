import {withRuntimeLock,loadState,saveState,isOwnedProcess} from './computer-runtime.mjs';

async function main(){
  await withRuntimeLock(async()=>{
    const state=await loadState();const remaining=[];
    for(const record of [...state.processes].reverse()){
      if(!await isOwnedProcess(record))continue;
      try{process.kill(record.id);console.log('Stopped '+record.label+'.');}
      catch{remaining.push(record);console.error('Could not stop '+record.label+'. It is still recorded in runtime/.');}
    }
    state.processes=remaining.reverse();await saveState(state);
    console.log('Only recorded helpers were stopped. Reused services are left running.');
  });
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
