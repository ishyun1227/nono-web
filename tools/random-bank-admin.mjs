/* Firebase RTDB admin REST adapter (no browser write privileges).
 * GitHub Actions injects a Google service account JSON and database URL
 * through encrypted GitHub Secrets. Never print either secret.
 * Only allow official Firebase RTDB HTTPS hosts.
 */
import {sign} from 'node:crypto';

function b64(value){return Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');}
export function validateDatabaseUrl(raw){
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
     !(/^[a-z0-9-]+\.firebaseio\.com$/.test(url.hostname)||
       /^[a-z0-9-]+(?:\.[a-z0-9-]+)?\.firebasedatabase\.app$/.test(url.hostname)))
    throw Error('FIREBASE_DATABASE_URL must be an official Firebase RTDB HTTPS endpoint');
  if(url.pathname!=='/'&&url.pathname!=='')throw Error('RTDB endpoint URL must not contain a path');
  return url.origin;
}
export function validateCredential(json){
  const account=typeof json==='string'?JSON.parse(json):json;
  if(!account||account.type!=='service_account'||typeof account.client_email!=='string'||
     !account.client_email.endsWith('.gserviceaccount.com')||
     typeof account.private_key!=='string'||!account.private_key.includes('BEGIN PRIVATE KEY'))
    throw Error('FIREBASE_SERVICE_ACCOUNT_JSON is not a valid Google service account');
  return account;
}
export function makeAdminStore({serviceAccountJson,databaseUrl,fetchFn=fetch}){
  const account=validateCredential(serviceAccountJson);
  const base=validateDatabaseUrl(databaseUrl);
  let cached=null,expires=0;
  async function token(force=false){
    if(!force&&cached&&Date.now()+60000<expires)return cached;
    const now=Math.floor(Date.now()/1000);
    const payload={
      iss:account.client_email,sub:account.client_email,
      aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600,
      scope:'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email'
    };
    const claim=b64({alg:'RS256',typ:'JWT'})+'.'+b64(payload);
    const signature=sign('RSA-SHA256',Buffer.from(claim),account.private_key).toString('base64url');
    const response=await fetchFn('https://oauth2.googleapis.com/token',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion:claim+'.'+signature
      })
    });
    if(!response.ok)throw Error('Google service account OAuth2 token exchange failed, HTTP '+response.status);
    const data=await response.json();
    if(typeof data.access_token!=='string'||!Number.isFinite(data.expires_in))
      throw Error('Google OAuth2 response missing an access token');
    cached=data.access_token;expires=Date.now()+data.expires_in*1000;
    return cached;
  }
  async function request(method,path,value,conditional=false,renew=false){
    if(typeof path!=='string'||!path||path.split('/').some(part=>!part||part==='.'||part==='..'))
      throw Error('Invalid Firebase database path');
    const uri=new URL(base+'/'+path.split('/').map(encodeURIComponent).join('/')+'.json');
    uri.searchParams.set('access_token',await token(renew));
    const headers={'Content-Type':'application/json'};
    if(conditional)headers['If-Match']='null_etag';
    const response=await fetchFn(uri,{method,headers,
      ...(method==='PUT'?{body:JSON.stringify(value)}:{})});
    if((response.status===401||response.status===403)&&!renew)
      return request(method,path,value,conditional,true);
    if(conditional&&response.status===412)return {created:false};
    if(!response.ok)throw Error('Firebase RTDB '+method+' failed, HTTP '+response.status);
    if(method==='DELETE')return true;
    const data=await response.json();
    return conditional?{created:true}:data;
  }
  return {
    get:path=>request('GET',path),
    put:(path,value)=>request('PUT',path,value),
    create:(path,value)=>request('PUT',path,value,true),
    remove:path=>request('DELETE',path)
  };
}
