/*
 * TOSAKA Q&A Manager — Stage 1: protected login only
 *
 * Secrets (Worker Settings -> Variables and Secrets):
 *   ADMIN_PASSWORD  — unique password of at least 16 characters
 *   SESSION_SECRET  — at least 32 unpredictable characters
 * Binding: DB -> tosaka-qa (D1)
 *
 * D1 table required before deployment:
 * CREATE TABLE IF NOT EXISTS admin_login_attempts (
 *   ip_hash TEXT PRIMARY KEY,
 *   attempts INTEGER NOT NULL DEFAULT 0,
 *   window_start INTEGER NOT NULL,
 *   blocked_until INTEGER NOT NULL DEFAULT 0
 * );
 *
 * IMPORTANT: This stage intentionally has NO question-reading or
 * question-editing endpoints. Add them only after login is verified.
 */

const COOKIE_NAME = 'tosaka_admin';
const SESSION_SECONDS = 8 * 60 * 60;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;
const MAX_FAILED_ATTEMPTS = 5;
const encoder = new TextEncoder();

const safetyHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
};

function page(content, status = 200, extraHeaders = {}) {
  return new Response(content, {
    status,
    headers: {
      ...safetyHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      ...extraHeaders
    }
  });
}

function redirect(path, cookie) {
  const headers = { ...safetyHeaders, Location: path };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(null, { status: 303, headers });
}

function shell(content) {
  return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TOSAKA / Q&A Manager</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;
background:#0d0f14;color:#eaecef;font:16px/1.7 system-ui,-apple-system,sans-serif;
padding:24px}.panel{width:min(100%,460px);background:#171c25;border:1px solid #313845;
border-radius:14px;padding:32px}small{color:#d6a36b;letter-spacing:.13em}
h1{margin:8px 0 22px;font-size:1.8rem}label{display:block;margin-bottom:8px}
input{width:100%;padding:12px;background:#0d0f14;color:white;border:1px solid #596373;
border-radius:8px;font:inherit}button{margin-top:18px;background:#d6a36b;color:#15171b;
border:0;border-radius:8px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer}
p{color:#bfc8d5}.error{color:#ffb0a6}
</style></head><body><main class="panel"><small>TOSAKA / PRIVATE</small>${content}</main></body></html>`;
}

function loginPage(error = '') {
  return shell(`<h1>Q&A Manager</h1><p>仅供站长登录。</p>
${error ? '<p class="error" role="alert">密码不正确，或暂时无法登录。</p>' : ''}
<form method="POST" action="/login">
<label for="password">管理员密码</label>
<input id="password" type="password" name="password" required minlength="16" maxlength="256" autocomplete="current-password">
<button type="submit">登录 →</button>
</form>`);
}

function dashboardPage() {
  return shell(`<h1>登录成功</h1>
<p>管理员身份已验证。当前是安全登录测试页面；问题读取、回答、发布等功能尚未开放。</p>
<form method="POST" action="/logout"><button type="submit">退出登录</button></form>`);
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const found = cookieHeader.split(';').map(s => s.trim())
    .find(s => s.startsWith(name + '='));
  return found ? found.slice(name.length + 1) : '';
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

async function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function newCookie(secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const value = `${expires}.${crypto.randomUUID()}`;
  const key = await signingKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return `${COOKIE_NAME}=${value}.${base64url(signature)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

async function isLoggedIn(request, secret) {
  try {
    const token = getCookie(request, COOKIE_NAME);
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const expires = Number(parts[0]);
    if (!Number.isSafeInteger(expires) || expires < Date.now() / 1000) return false;
    const value = `${parts[0]}.${parts[1]}`;
    const key = await signingKey(secret);
    return crypto.subtle.verify('HMAC', key, fromBase64url(parts[2]), encoder.encode(value));
  } catch {
    return false;
  }
}

async function constantTimePasswordMatch(submitted, expected) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(submitted)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ]);
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function ipHash(request, secret) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${secret}:${ip}`));
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
}

async function login(request, env, url) {
  // This endpoint is intentionally same-origin only and has no CORS support.
  if (request.headers.get('Origin') !== url.origin) {
    return page('Forbidden', 403);
  }
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 1024) return page('Request too large', 413);
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.startsWith('application/x-www-form-urlencoded')) {
    return page('Unsupported content type', 415);
  }

  const key = await ipHash(request, env.SESSION_SECRET);
  const now = Math.floor(Date.now() / 1000);
  const old = await env.DB.prepare(
    'SELECT attempts, window_start, blocked_until FROM admin_login_attempts WHERE ip_hash = ?'
  ).bind(key).first();
  if (old && old.blocked_until > now) {
    return page(shell('<h1>暂时无法登录</h1><p>尝试次数过多，请 15 分钟后再试。</p>'), 429);
  }

  let form;
  try { form = await request.formData(); }
  catch { return page('Invalid form', 400); }
  const value = form.get('password');
  const submitted = typeof value === 'string' ? value : '';
  if (submitted.length > 256) return page('Invalid input', 400);

  if (!await constantTimePasswordMatch(submitted, env.ADMIN_PASSWORD)) {
    const insideWindow = old && now - old.window_start < ATTEMPT_WINDOW_SECONDS;
    const attempts = insideWindow ? old.attempts + 1 : 1;
    const started = insideWindow ? old.window_start : now;
    const blockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? now + ATTEMPT_WINDOW_SECONDS : 0;
    await env.DB.prepare(`
      INSERT INTO admin_login_attempts (ip_hash, attempts, window_start, blocked_until)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(ip_hash) DO UPDATE SET
      attempts=excluded.attempts,
      window_start=excluded.window_start,
      blocked_until=excluded.blocked_until
    `).bind(key, attempts, started, blockedUntil).run();
    return page(loginPage(true), 401);
  }

  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip_hash = ?').bind(key).run();
  const cookie = await newCookie(env.SESSION_SECRET);
  return redirect('/admin', cookie);
}

export default {
  async fetch(request, env) {
    // Fail closed: no database/secret means there is NO admin access.
    if (!env.DB || typeof env.ADMIN_PASSWORD !== 'string' ||
        env.ADMIN_PASSWORD.length < 16 ||
        typeof env.SESSION_SECRET !== 'string' || env.SESSION_SECRET.length < 32) {
      return page('Admin service not configured', 503);
    }
    const url = new URL(request.url);
    try {
      if (url.pathname === '/' && request.method === 'GET') return redirect('/login');
      if (url.pathname === '/login' && request.method === 'GET') {
        if (await isLoggedIn(request, env.SESSION_SECRET)) return redirect('/admin');
        return page(loginPage());
      }
      if (url.pathname === '/login' && request.method === 'POST') {
        return await login(request, env, url);
      }
      if (url.pathname === '/admin' && request.method === 'GET') {
        if (!await isLoggedIn(request, env.SESSION_SECRET)) return redirect('/login');
        return page(dashboardPage());
      }
      if (url.pathname === '/logout' && request.method === 'POST') {
        if (request.headers.get('Origin') !== url.origin) return page('Forbidden', 403);
        return redirect('/login', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
      }
      return page('Not found', 404);
    } catch {
      return page('Service temporarily unavailable', 503);
    }
  }
};
