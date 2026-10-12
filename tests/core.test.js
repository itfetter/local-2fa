import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totp, normalizeSecret, encryptVault, decryptVault, parseAccount} from '../core.js';
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
test('RFC 6238 SHA1 vectors and 6 digit reduction', async () => {
 for (const [time, expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']]) {
  assert.equal(await totp(secret,time,8),expected); assert.equal(await totp(secret,time),expected.slice(-6));
 }
});
test('30 second boundaries', async () => {assert.equal(await totp(secret,60),await totp(secret,89.999)); assert.notEqual(await totp(secret,59.999),await totp(secret,60));});
test('strict Base32 normalization', () => {assert.equal(normalizeSecret('gez dgnbv').secret,'GEZDGNBV'); for(const x of ['', 'abc1', 'A', '<script>', 'MZ']) assert.throws(()=>normalizeSecret(x));});
test('URI and unsupported parameters',()=>{assert.equal(parseAccount('otpauth://totp/Google:me?secret='+secret).name,'Google:me');assert.throws(()=>parseAccount('otpauth://hotp/me?secret='+secret));assert.throws(()=>parseAccount('otpauth://totp/me?secret='+secret+'&digits=8'));});
test('vault roundtrip, random salt/IV, wrong password and tamper rejection',async()=>{
 const accounts=[parseAccount(secret,'Google')], password='correct horse battery staple';
 const a=await encryptVault(accounts,password), b=await encryptVault(accounts,password);
 assert.notEqual(a.salt,b.salt);assert.notEqual(a.iv,b.iv);assert.ok(!JSON.stringify(a).includes(secret));assert.equal((await decryptVault(a,password))[0].secret,secret);
 await assert.rejects(()=>decryptVault(a,'wrong password')); const modified={...a,ciphertext:(a.ciphertext[0]==='A'?'B':'A')+a.ciphertext.slice(1)};await assert.rejects(()=>decryptVault(modified,password));await assert.rejects(()=>encryptVault(accounts,'short'));
});
