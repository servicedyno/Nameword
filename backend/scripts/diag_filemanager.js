// One-off diagnostic: exercise the Nomadly reseller File Manager against a REAL
// test hosting account, inside an isolated temp dir, then clean up.
const axios = require("axios");
const KEY = "rsk_live_cdc3f785ac3cfd813c6143d7813e1a59cc15fc42327ab736";
const BASE = "https://1.speechcue.com/reseller/v1";
const USER = "nbayftest";
const api = axios.create({ baseURL: BASE, timeout: 30000, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" } });

// Minimal ZIP with a single file hello.txt containing "hi from unzip test".
// Build a real zip using Node's zlib is complex; instead use a prebuilt tiny zip.
const AdmZip = (() => { try { return require("adm-zip"); } catch { return null; } })();

const rnd = Math.random().toString(36).slice(2, 8);
const TMP = `/apitest_${rnd}`;              // relative to account home
const log = (label, r) => console.log(`\n### ${label} -> HTTP ${r.status}\n` + JSON.stringify(r.data).slice(0, 800));
const errlog = (label, e) => console.log(`\n### ${label} -> ERR ${e.response?.status || ""}\n` + JSON.stringify(e.response?.data || e.message).slice(0, 800));

function makeZipBase64() {
  // Hand-crafted stored (no compression) zip with one entry "hello.txt".
  const name = Buffer.from("hello.txt");
  const data = Buffer.from("hi from unzip test\n");
  const crc = require("zlib").crc32 ? require("zlib").crc32(data) : crc32(data);
  function crc32(buf){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}let x=0xFFFFFFFF;for(let i=0;i<buf.length;i++)x=t[(x^buf[i])&0xFF]^(x>>>8);return (x^0xFFFFFFFF)>>>0;}
  const crcv = crc32(data);
  const lf = Buffer.alloc(30);
  lf.writeUInt32LE(0x04034b50,0); lf.writeUInt16LE(20,4); lf.writeUInt16LE(0,6); lf.writeUInt16LE(0,8);
  lf.writeUInt16LE(0,10); lf.writeUInt16LE(0,12); lf.writeUInt32LE(crcv,14);
  lf.writeUInt32LE(data.length,18); lf.writeUInt32LE(data.length,22); lf.writeUInt16LE(name.length,26); lf.writeUInt16LE(0,28);
  const local = Buffer.concat([lf, name, data]);
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50,0); cd.writeUInt16LE(20,4); cd.writeUInt16LE(20,6); cd.writeUInt16LE(0,8); cd.writeUInt16LE(0,10);
  cd.writeUInt16LE(0,12); cd.writeUInt16LE(0,14); cd.writeUInt32LE(crcv,16); cd.writeUInt32LE(data.length,20); cd.writeUInt32LE(data.length,24);
  cd.writeUInt16LE(name.length,28); cd.writeUInt16LE(0,30); cd.writeUInt16LE(0,32); cd.writeUInt16LE(0,34); cd.writeUInt16LE(0,36);
  cd.writeUInt32LE(0,38); cd.writeUInt32LE(0,42);
  const central = Buffer.concat([cd, name]);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(0,4); eocd.writeUInt16LE(0,6); eocd.writeUInt16LE(1,8); eocd.writeUInt16LE(1,10);
  eocd.writeUInt32LE(central.length,12); eocd.writeUInt32LE(local.length,16); eocd.writeUInt16LE(0,20);
  return Buffer.concat([local, central, eocd]).toString("base64");
}

(async () => {
  const b64 = makeZipBase64();
  // 1) list public_html (read-only)
  try { log("LIST /public_html", await api.get(`/hosting/${USER}/files`, { params: { dir: "/public_html" } })); } catch (e) { errlog("LIST /public_html", e); }
  // 2) mkdir temp
  try { log(`MKDIR ${TMP}`, await api.post(`/hosting/${USER}/files/mkdir`, { dir: "/", name: TMP.slice(1) })); } catch (e) { errlog("MKDIR", e); }
  // 3) upload a plain text file
  try { log("UPLOAD note.txt", await api.post(`/hosting/${USER}/files/upload`, { dir: TMP, fileName: "note.txt", content_base64: Buffer.from("hello upload\n").toString("base64") })); } catch (e) { errlog("UPLOAD", e); }
  // 4) one-tap unzip (NEW endpoint)
  try { log("UNZIP (one-tap) site.zip", await api.post(`/hosting/${USER}/files/unzip`, { dir: TMP, fileName: "site.zip", content_base64: b64, removeArchive: true })); } catch (e) { errlog("UNZIP one-tap", e); }
  // 5) upload zip then extract (two-step) for comparison
  try { log("UPLOAD arc2.zip", await api.post(`/hosting/${USER}/files/upload`, { dir: TMP, fileName: "arc2.zip", content_base64: b64 })); } catch (e) { errlog("UPLOAD zip", e); }
  try { log("EXTRACT arc2.zip", await api.post(`/hosting/${USER}/files/extract`, { dir: TMP, file: "arc2.zip" })); } catch (e) { errlog("EXTRACT", e); }
  // 6) list temp to confirm
  try { log(`LIST ${TMP}`, await api.get(`/hosting/${USER}/files`, { params: { dir: TMP } })); } catch (e) { errlog("LIST tmp", e); }
  // 7) cleanup: delete temp dir
  try { log(`DELETE ${TMP}`, await api.delete(`/hosting/${USER}/files`, { data: { dir: "/", file: TMP.slice(1), isDirectory: true } })); } catch (e) { errlog("DELETE", e); }
  process.exit(0);
})();
