import {parseAccount, totp, encryptVault, decryptVault} from './core.js';
const $ = id => document.getElementById(id), storageKey = 'local-2fa.vault.v1';
let accounts = [], generation = 0, busy = false;
const message = text => { $('status').textContent = text; };
function vaultState() { try { $('vault-state').textContent = localStorage.getItem(storageKey) ? '检测到本地加密副本；解锁后可查看账号。' : '尚未保存加密副本。'; } catch { message('浏览器禁止本地存储，仍可使用内存模式。'); } }
function render() {
  generation++; $('accounts').replaceChildren(); $('count').textContent = accounts.length; $('empty').hidden = accounts.length > 0;
  for (const account of accounts) {
    const card = document.createElement('article'); card.className = 'account';
    const top = document.createElement('div'); top.className = 'account-top';
    const name = document.createElement('strong'); name.textContent = account.name;
    const remove = document.createElement('button'); remove.textContent = '移除'; remove.setAttribute('aria-label', '移除 ' + account.name);
    remove.onclick = () => { accounts = accounts.filter(x => x.id !== account.id); render(); message('账号已从内存移除；如需更新副本，请重新加密保存。'); };
    top.append(name, remove); const row = document.createElement('div'); row.className = 'account-code';
    const code = document.createElement('span'); code.className = 'code'; code.id = 'code-' + account.id; code.textContent = '··· ···';
    const copy = document.createElement('button'); copy.textContent = '复制验证码';
    copy.onclick = async () => { const currentGeneration = generation; try { const value = await totp(account.secret); if (currentGeneration !== generation) return; await navigator.clipboard.writeText(value); message('验证码已复制。'); } catch { message('复制失败，请手动选中当前验证码复制。'); } };
    row.append(code, copy); card.append(top,row); $('accounts').append(card);
  }
  tick();
}
async function tick() {
  const seconds = Date.now() / 1000, remaining = 30 - Math.floor(seconds) % 30, currentGeneration = generation;
  $('timer').textContent = remaining + ' 秒后更新'; $('progress').value = remaining;
  try { await Promise.all(accounts.map(async account => { const value = await totp(account.secret, seconds); if (currentGeneration !== generation) return; const node = $('code-' + account.id); if (node) node.textContent = value.slice(0,3) + ' ' + value.slice(3); })); } catch { message('加密 API 不可用，请使用 HTTPS 或 localhost。'); }
}
$('add').onsubmit = event => { event.preventDefault(); if (busy) return; try { const account = parseAccount($('secret').value, $('name').value); if (accounts.some(x => x.secret === account.secret)) throw new Error('这个密钥已添加。'); accounts.push(account); $('secret').value = ''; $('name').value = ''; render(); message('已添加。账号目前仅保存在内存中。'); } catch (error) { message(error.message); } };
async function operation(action) { if (busy) return; busy = true; document.querySelectorAll('button').forEach(x => x.disabled = true); try { await action(); } catch (error) { message(error.message); } finally { busy = false; $('password').value = ''; document.querySelectorAll('button').forEach(x => x.disabled = false); } }
$('save').onclick = () => operation(async () => { if (!accounts.length) throw new Error('请先添加账号。'); const vault = await encryptVault(accounts, $('password').value); localStorage.setItem(storageKey, JSON.stringify(vault)); vaultState(); message('已加密保存。新增或移除账号后需要再次保存。'); });
$('unlock').onclick = () => operation(async () => { const stored = localStorage.getItem(storageKey); if (!stored) throw new Error('没有本地加密副本。'); if (accounts.length && !confirm('解锁会替换当前内存中的账号，未保存修改会丢失。继续吗？')) return; try { accounts = await decryptVault(JSON.parse(stored), $('password').value); render(); message('已解锁。'); } catch { throw new Error('解锁失败：密码不正确或副本损坏。'); } });
$('lock').onclick = () => { if (accounts.length && !confirm('锁定将清空内存账号，未保存修改会丢失。继续吗？')) return; accounts = []; $('secret').value = ''; $('password').value = ''; render(); message('已锁定，内存账号已清空。'); };
$('erase').onclick = () => { if (!confirm('永久删除此浏览器的加密副本？请确认你已保留恢复方式。')) return; try { localStorage.removeItem(storageKey); vaultState(); message('已删除加密副本；当前内存账号保留至锁定或关闭页面。'); } catch { message('删除失败：浏览器禁止访问本地存储。'); } };
window.addEventListener('pageshow', tick); document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
vaultState(); render(); setInterval(tick, 1000);
if (!globalThis.crypto?.subtle) { message('需要 HTTPS 或 localhost 才能生成验证码。'); document.querySelectorAll('button').forEach(x => x.disabled = true); }
