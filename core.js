const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function normalizeSecret(value) {
  const secret = value.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z2-7]+={0,6}$/.test(secret)) throw new Error('密钥必须是 Base32（A–Z、2–7），请检查是否复制完整。');
  const raw = secret.replace(/=+$/, '');
  if (![0,2,4,5,7].includes(raw.length % 8)) throw new Error('Base32 密钥长度无效。');
  let bits = 0, buffer = 0; const bytes = [];
  for (const char of raw) { buffer = (buffer << 5) | alphabet.indexOf(char); bits += 5; if (bits >= 8) { bits -= 8; bytes.push((buffer >>> bits) & 255); } }
  if (!bytes.length || (buffer & ((1 << bits) - 1))) throw new Error('Base32 密钥尾部编码无效。');
  if (secret.includes('=') && secret.length % 8 !== 0) throw new Error('Base32 填充无效。');
  return { secret: raw, bytes: new Uint8Array(bytes) };
}
export async function totp(secret, seconds = Date.now() / 1000, digits = 6) {
  if (![6,8].includes(digits) || !Number.isFinite(seconds) || seconds < 0) throw new Error('无效的 TOTP 参数');
  const key = await crypto.subtle.importKey('raw', normalizeSecret(secret).bytes, { name:'HMAC', hash:'SHA-1' }, false, ['sign']);
  const counter = new Uint8Array(8); new DataView(counter.buffer).setBigUint64(0, BigInt(Math.floor(seconds / 30)));
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
  const offset = hash[hash.length - 1] & 15;
  const binary = new DataView(hash.buffer).getUint32(offset) & 0x7fffffff;
  return String(binary % (10 ** digits)).padStart(digits, '0');
}
export function parseAccount(value, name = '') {
  let secret = value.trim();
  if (secret.startsWith('otpauth://')) {
    const uri = new URL(secret);
    if (uri.hostname !== 'totp' || (uri.searchParams.get('algorithm') || 'SHA1').toUpperCase() !== 'SHA1' || (uri.searchParams.get('digits') || '6') !== '6' || (uri.searchParams.get('period') || '30') !== '30') throw new Error('仅支持 SHA1 / 6 位 / 30 秒的 TOTP URI。');
    secret = uri.searchParams.get('secret') || ''; name ||= decodeURIComponent(uri.pathname.slice(1));
  }
  return { id: crypto.randomUUID(), name: name.trim() || '未命名账号', secret: normalizeSecret(secret).secret };
}
const encode = bytes => btoa(String.fromCharCode(...bytes));
const decode = value => Uint8Array.from(atob(value), x => x.charCodeAt(0));
async function derive(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', hash:'SHA-256', salt, iterations:600000}, material, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
export async function encryptVault(accounts, password) {
  if (password.length < 12) throw new Error('保存密码至少需要 12 个字符。');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(accounts))));
  return {version:1, salt:encode(salt), iv:encode(iv), ciphertext:encode(ciphertext)};
}
export async function decryptVault(vault, password) {
  if (vault.version !== 1) throw new Error('不支持的保存格式。');
  const key = await derive(password, decode(vault.salt));
  const plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv:decode(vault.iv)}, key, decode(vault.ciphertext));
  const data = JSON.parse(new TextDecoder().decode(plaintext));
  if (!Array.isArray(data) || data.length > 1000) throw new Error('保存数据无效。');
  return data.map(x => parseAccount(x.secret, x.name));
}
