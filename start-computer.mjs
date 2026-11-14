import {promises as fs, createWriteStream} from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {root,runtime,tunnelPattern,wait,run,exists,findExecutable,isOwnedProcess,withRuntimeLock,loadState,saveState,healthy,startHelper,waitForService} from './computer-runtime.mjs';

const skipPublish=process.argv.includes('--skip-publish');
const configurationFile=path.join(root,'public','deployment-config.js');

async function main(){
  await withRuntimeLock(async()=>{
    const state=await loadState();
    const stillRunning=[];
    for(const record of state.processes)if(await isOwnedProcess(record))stillRunning.push(record);
    state.processes=stillRunning;
    for(const required of ['.env','server.mjs','gateway.mjs'])if(!await exists(path.join(root,required)))throw Error('Missing backend file: '+required);
    if(!await healthy('http://127.0.0.1:4173')){
      const record=await startHelper('backend',process.execPath,['server.mjs'],state);
      await waitForService('http://127.0.0.1:4173',record);
    }
    if(!await healthy('http://127.0.0.1:4174')){
      const record=await startHelper('gateway',process.execPath,['gateway.mjs'],state);
      await waitForService('http://127.0.0.1:4174',record);
    }
    const ownedTunnel=state.processes.findLast(record=>record.label==='tunnel');
    let reuse=Boolean(ownedTunnel&&tunnelPattern.test(state.tunnelUrl||''));
    if(!reuse&&await exists(configurationFile)){
      const source=await fs.readFile(configurationFile,'utf8');
      const existing=source.match(/export const API_BASE_URL\s*=\s*['"](https:\/\/[a-z0-9-]+\.trycloudflare\.com)['"]/);
      if(existing&&await healthy(existing[1])){state.tunnelUrl=existing[1];reuse=true;}
    }
    if(!reuse){
      const tools=path.join(root,'.tools');
      const downloaded=path.join(tools,'cloudflared.exe');
      let cloudflared=await findExecutable('cloudflared.exe',[downloaded]);
      if(!cloudflared){
        await fs.mkdir(tools,{recursive:true});console.log('Downloading the official Cloudflare Tunnel tool...');
        const response=await fetch('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe',{signal:AbortSignal.timeout(180000)});
        if(!response.ok||!response.body)throw Error('The official tunnel download could not finish. Try again later.');
        const temporary=downloaded+'.download';
        await pipeline(Readable.fromWeb(response.body),createWriteStream(temporary));
        await fs.rename(temporary,downloaded);cloudflared=downloaded;
      }
      state.tunnelUrl=null;
      const record=await startHelper('tunnel',cloudflared,['tunnel','--url','http://127.0.0.1:4174','--http-host-header','127.0.0.1:4174','--no-autoupdate','--protocol','http2'],state);
      for(let attempt=0;attempt<60;attempt++){
        const log=await fs.readFile(path.join(runtime,'tunnel.err.log'),'utf8').catch(()=>'');
        const match=log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if(match){state.tunnelUrl=match[0];await saveState(state);break;}
        if(!await isOwnedProcess(record))throw Error('The HTTPS tunnel stopped. Check runtime/tunnel.err.log.');
        await wait(1000);
      }
      if(!state.tunnelUrl)throw Error('The tunnel did not return an address. Check runtime/tunnel.err.log.');
    }
    let connected=false;
    for(let attempt=0;attempt<12;attempt++){
      if(await healthy(state.tunnelUrl)){connected=true;break;}
      await wait(2000);
    }
    if(!connected)throw Error('The tunnel address is saved but is not reachable yet: '+state.tunnelUrl+'. Run this script again to retry.');
    await fs.writeFile(configurationFile,"// Public HTTPS backend origin only. Never put a service key in this file.\nexport const API_BASE_URL = '"+state.tunnelUrl+"';\n",'utf8');
    await saveState(state);console.log('Computer backend is connected: '+state.tunnelUrl);
    if(!skipPublish){
      const git=await findExecutable('git.exe',['E:/Git/cmd/git.exe']);
      if(!git)throw Error('Git is required to publish the updated address. The address has been saved locally.');
      let difference=0;
      try{await run(git,['diff','HEAD','--quiet','--','public/deployment-config.js']);}
      catch(error){if(error.code!==1)throw Error('Unable to inspect the public website configuration.');difference=1;}
      if(difference){
        await run(git,['add','--','public/deployment-config.js']);
        const commit=await run(git,['-c','user.name=qiuxicqu','-c','user.email=qiuxicqu@users.noreply.github.com','commit','--only','-m','Connect website to computer backend','--','public/deployment-config.js']);
        if(commit.stdout)process.stdout.write(commit.stdout);
      }
      try{const pushed=await run(git,['push','origin','main']);if(pushed.stdout)process.stdout.write(pushed.stdout);if(pushed.stderr)process.stdout.write(pushed.stderr);}
      catch{throw Error('The backend is running but GitHub upload failed. Sign in to GitHub and run this script again.');}
      console.log('Wait for GitHub Pages to publish, then refresh https://qiuxicqu.github.io/hanzi/.');
    }else console.log('GitHub upload was skipped. Publish public/deployment-config.js to connect the public website.');
    console.log('Keep this computer on and connected. Run node stop-computer.mjs to stop helpers started by this script.');
  });
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
