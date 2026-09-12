import 'server-only';
import https from 'node:https';

function config() {
  const environment = (process.env.NFSE_ENVIRONMENT || 'HOMOLOGATION').toUpperCase();
  const baseUrl = process.env.NFSE_BASE_URL || (environment === 'PRODUCTION'
    ? 'https://sefin.nfse.gov.br/SefinNacional'
    : 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional');
  const cert = process.env.NFSE_CERT_PEM_BASE64 ? Buffer.from(process.env.NFSE_CERT_PEM_BASE64,'base64') : undefined;
  const key = process.env.NFSE_KEY_PEM_BASE64 ? Buffer.from(process.env.NFSE_KEY_PEM_BASE64,'base64') : undefined;
  return { environment, baseUrl, cert, key, passphrase:process.env.NFSE_CERT_PASSPHRASE };
}

export function nfseReadiness() {
  const c = config();
  return { environment:c.environment, baseUrl:c.baseUrl, certificateConfigured:Boolean(c.cert && c.key) };
}

async function mtls(path:string, method:'GET'|'POST', body?:string) {
  const c = config();
  if (!c.cert || !c.key) throw new Error('Certificado digital NFS-e não configurado.');
  const url = new URL(path, c.baseUrl.endsWith('/') ? c.baseUrl : `${c.baseUrl}/`);
  return new Promise<string>((resolve,reject)=>{
    const req = https.request({
      protocol:url.protocol, hostname:url.hostname, port:url.port || 443, path:`${url.pathname}${url.search}`, method,
      cert:c.cert, key:c.key, passphrase:c.passphrase,
      headers:{Accept:'application/xml, application/json',...(body?{'Content-Type':'application/xml; charset=utf-8','Content-Length':Buffer.byteLength(body)}:{})},
      timeout:20000, rejectUnauthorized:true
    }, (res)=>{
      const chunks:Buffer[]=[];
      res.on('data',(chunk)=>chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk)));
      res.on('end',()=>{
        const text=Buffer.concat(chunks).toString('utf8');
        if ((res.statusCode||500)>=400) reject(new Error(`NFS-e HTTP ${res.statusCode}: ${text.slice(0,500)}`));
        else resolve(text);
      });
    });
    req.on('timeout',()=>req.destroy(new Error('Timeout na API NFS-e.')));
    req.on('error',reject);
    if (body) req.write(body);
    req.end();
  });
}

export async function issueNfseDpsXml(dpsXml:string) {
  if (!dpsXml.trim().startsWith('<')) throw new Error('DPS XML inválida.');
  return mtls('nfse','POST',dpsXml);
}

export async function queryNfseByAccessKey(accessKey:string) {
  if (!/^[A-Za-z0-9]+$/.test(accessKey)) throw new Error('Chave de acesso inválida.');
  return mtls(`nfse/${encodeURIComponent(accessKey)}`,'GET');
}
