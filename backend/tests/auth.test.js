'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const server = app.listen(0, '127.0.0.1');
const url = () => `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

async function post(path, body, headers={}) {
  return fetch(url()+path, {method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
}
test('login con bcrypt, JWT en cookie HttpOnly, acceso y logout', async () => {
  const before = await fetch(url()+'/api/auth/me');
  assert.equal(before.status,401);
  const invalid = await post('/api/auth/login',{email:'correo-invalido',password:'abc'});
  assert.equal(invalid.status,422);
  const wrong = await post('/api/auth/login',{email:'demo.spotify@ejemplo.com',password:'OtraClaveIncorrecta2026!'});
  assert.equal(wrong.status,401);
  const ok = await post('/api/auth/login',{
    email:process.env.DEMO_EMAIL || 'demo.spotify@ejemplo.com',
    password:process.env.DEMO_PASSWORD || 'DemoSegura2026!'
  });
  assert.equal(ok.status,200);
  const setCookie = ok.headers.get('set-cookie')||'';
  assert.match(setCookie,/pg_music_access=eyJ/);
  assert.match(setCookie,/httponly/i);
  assert.match(setCookie,/samesite=lax/i);
  const cookie = setCookie.split(';')[0];
  const protectedRes = await fetch(url()+'/api/auth/me',{headers:{Cookie:cookie}});
  assert.equal(protectedRes.status,200);
  const person = await protectedRes.json();
  assert.equal(person.authenticated,true);
  assert.equal(person.user.email,process.env.DEMO_EMAIL || 'demo.spotify@ejemplo.com');
  const loggedOut = await post('/api/auth/logout',{}, {Cookie:cookie});
  assert.equal(loggedOut.status,200);
  assert.match(loggedOut.headers.get('set-cookie')||'',/pg_music_access=;/);
});

test('Google no acepta credenciales inválidas y publica solo configuración pública', async () => {
  const config = await fetch(url()+'/api/auth/config');
  assert.equal(config.status,200);
  const data=await config.json();
  assert.ok(Object.hasOwn(data,'googleClientId'));
  const bad = await post('/api/auth/google',{credential:'un-token-falso'});
  assert.ok([422,503].includes(bad.status));
});
