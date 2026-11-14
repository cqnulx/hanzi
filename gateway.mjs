import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const MAX_BODY = 32768;
const SESSION = /^[a-f0-9]{64}$/;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;
const ROUTES = new Set(['health','state','export','data','profile','memory','activity','lesson','exercises','quiz','chat','writing','speaking','plan','feedback'].map(route=>`/api/${route}`));
const fail = (status,message) => Object.assign(new Error(message),{status});

function origin(value,name,{upstream=false}={}) {
  let url;try{url=new URL(value);}catch{throw new Error(`${name} must be a valid origin.`);}
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error(`${name} must contain an origin only.`);
  if(upstream){if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('The gateway upstream must be a local HTTP service.');}
  else if(url.protocol!=='https:')throw new Error('The allowed website must use HTTPS.');
  return url.origin;
}

async function readBody(req) {
  const parts=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>MAX_BODY)throw fail(413,'Request is too large.');parts.push(chunk);}
  return Buffer.concat(parts);
}

/** A tunnel-only adapter. Browser session identifiers separate learning data;
 * they are not site passwords. Model access is deliberately unrestricted. */
export function createGateway(options={}) {
  const upstream=origin(options.upstreamOrigin||process.env.HANZI_UPSTREAM_ORIGIN||'http://127.0.0.1:4173','Upstream',{upstream:true});
  const allowedOrigin=origin(options.allowedOrigin||process.env.HANZI_FRONTEND_ORIGIN||'https://qiuxicqu.github.io','Allowed website');
  const fetchImpl=options.fetchImpl||globalThis.fetch;
  const timeoutMs=options.timeoutMs??120000;
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Vary','Origin');
    if(req.headers.origin===allowedOrigin){
      res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
      res.setHeader('Access-Control-Expose-Headers','X-Hanzi-Session, Content-Disposition');
    }
    const send=(status,error)=>{if(!res.headersSent&&!res.destroyed){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error}));}};
    let timer,controller;
    try {
      if(!LOCAL_HOST.test(req.headers.host||''))throw fail(403,'The learning gateway only accepts its local tunnel connection.');
      let url;try{url=new URL(req.url,'http://localhost');}catch{throw fail(400,'Invalid request path.');}
      // The tunnel never exposes the website, source, filesystem or credentials.
      if(url.search||(!ROUTES.has(url.pathname)&&!/^\/api\/memory\/[a-zA-Z0-9-]+$/.test(url.pathname)))throw fail(404,'Service route not found.');
      if(req.headers.origin!==allowedOrigin&&!(req.method==='GET'&&url.pathname==='/api/health'&&!req.headers.origin))throw fail(403,'This website cannot connect to the learning service.');
      if(req.method==='OPTIONS'){
        const requestedMethod=(req.headers['access-control-request-method']||'').toUpperCase();
        const requestedHeaders=(req.headers['access-control-request-headers']||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
        if(!['GET','HEAD','POST','PUT','DELETE'].includes(requestedMethod)||requestedHeaders.some(name=>!['content-type','x-hanzi-session'].includes(name)))throw fail(403,'This website request is not supported.');
        res.writeHead(204,{'Access-Control-Allow-Methods':'GET, HEAD, POST, PUT, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Hanzi-Session','Access-Control-Max-Age':'600'});res.end();return;
      }
      if(!['GET','HEAD','POST','PUT','DELETE'].includes(req.method))throw fail(405,'Method not allowed.');
      const supplied=req.headers['x-hanzi-session'];
      if(supplied!==undefined&&(typeof supplied!=='string'||!SESSION.test(supplied)))throw fail(400,'Your learning session is invalid. Refresh this page to start again.');
      if(Number(req.headers['content-length'])>MAX_BODY)throw fail(413,'Request is too large.');
      const body=['GET','HEAD'].includes(req.method)?undefined:await readBody(req);
      // Deliberately forward only body metadata and the isolated session. Never
      // relay remote cookies, authorization, origin, forwarded host or fetch-site.
      const headers={};
      if(req.headers['content-type'])headers['Content-Type']=req.headers['content-type'];
      if(supplied)headers.Cookie=`hanzi_session=${supplied}`;
      controller=new AbortController();
      timer=setTimeout(()=>controller.abort(),timeoutMs);
      const abort=()=>controller.abort();
      req.once('aborted',abort);res.once('close',abort);
      let response;
      try{response=await fetchImpl(upstream+url.pathname,{method:req.method,headers,body:body?.length?body:undefined,redirect:'manual',signal:controller.signal});}
      catch(error){throw fail(error.name==='AbortError'||error.name==='TimeoutError'?504:502,error.name==='AbortError'||error.name==='TimeoutError'?'The learning service took too long to respond. Please try again.':'The computer learning service is unavailable. Please try again later.');}
      if(response.status>=300&&response.status<400)throw fail(502,'The learning service returned an unexpected redirect.');
      const cookies=typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie():[response.headers.get('set-cookie')||''];
      const issued=cookies.map(value=>value.match(/(?:^|;\s*)hanzi_session=([a-f0-9]{64})(?:;|$)/)?.[1]).find(Boolean);
      if(issued||supplied)res.setHeader('X-Hanzi-Session',issued||supplied);
      const resultHeaders={'Content-Type':response.headers.get('content-type')||'application/json; charset=utf-8'};
      const disposition=response.headers.get('content-disposition');if(disposition)resultHeaders['Content-Disposition']=disposition;
      const content=Buffer.from(await response.arrayBuffer());
      if(!res.destroyed){res.writeHead(response.status,resultHeaders);res.end(req.method==='HEAD'?undefined:content);}
    }catch(error){send(error.status||502,error.status?error.message:'The computer learning service is unavailable. Please try again later.');}
    finally{clearTimeout(timer);}
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.HANZI_GATEWAY_PORT)||4174;
  createGateway().listen(port,'127.0.0.1',()=>console.log(`Hanzi gateway is running at http://127.0.0.1:${port}`));
}
