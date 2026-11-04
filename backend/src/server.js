'use strict';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('node:crypto');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const secretFromEnv = process.env.JWT_SECRET;
if (isProduction && (!secretFromEnv || secretFromEnv.length < 32)) {
  throw new Error('Configura JWT_SECRET con al menos 32 caracteres antes de usar producción.');
}
const jwtSecret = secretFromEnv && secretFromEnv.length >= 32 ? secretFromEnv : crypto.randomBytes(48).toString('hex');
if (!secretFromEnv) console.info('[JWT] Se está usando un secreto temporal de desarrollo.');
const demoEmail = (process.env.DEMO_EMAIL || 'demo.spotify@ejemplo.com').toLowerCase().trim();
const demoPasswordHash = bcrypt.hashSync(process.env.DEMO_PASSWORD || 'DemoSegura2026!', 12);
const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;
const COOKIE = 'pg_music_access';
const ISSUER = 'pantallasgrillas-demo-api';
const AUDIENCE = 'pantallasgrillas-ionic-player';
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' };
const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const strongPassword = text => typeof text === 'string' && text.length >= 8 && text.length <= 128 &&
  /[a-z]/.test(text) && /[A-Z]/.test(text) && /\d/.test(text) && /[^A-Za-z0-9]/.test(text);

function sendSession(res, user) {
  const token = jwt.sign({ email: user.email, name: user.displayName, provider: user.provider }, jwtSecret, {
    algorithm: 'HS256', subject: user.id, expiresIn: '1h', issuer: ISSUER, audience: AUDIENCE
  });
  res.cookie(COOKIE, token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
  return res.json({ authenticated: true, user: { email: user.email, displayName: user.displayName }, expiresInSeconds: 3600 });
}
function requiresAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({message:'Debes iniciar sesión.'});
  try {
    const data = jwt.verify(token, jwtSecret, { algorithms:['HS256'], issuer:ISSUER, audience:AUDIENCE });
    if (!data.sub || !data.email || !data.name || !['demo', 'google'].includes(data.provider)) throw new Error('JWT no válido');
    if (data.provider === 'demo' && (data.sub !== 'demo:local' || data.email !== demoEmail)) throw new Error('Demo inválida');
    if (data.provider === 'google' && !String(data.sub).startsWith('google:')) throw new Error('Google inválido');
    req.user = { id:data.sub, email:data.email, displayName:data.name };
    next();
  } catch { res.status(401).json({message:'Tu sesión expiró o no es válida.'}); }
}
const limiter = rateLimit({ windowMs: 15*60*1000, limit: 12, standardHeaders:'draft-7', legacyHeaders:false,
  message:{message:'Demasiados intentos. Vuelve a intentar en 15 minutos.'} });

app.get('/api/health', (_req,res) => res.json({ok:true}));
app.get('/api/auth/config', (_req,res) => res.json({googleClientId: googleClientId || null}));
app.post('/api/auth/login', limiter, async (req,res) => {
  const {email,password} = req.body || {};
  if (typeof email !== 'string' || email.length > 254 || !emailValid.test(email.trim()) || !strongPassword(password)) {
    return res.status(422).json({message:'Verifica el correo y los requisitos de la contraseña.'});
  }
  // Hash de la clave en servidor. Jamás se guarda la contraseña en el navegador.
  const matches = await bcrypt.compare(password, demoPasswordHash);
  if (email.trim().toLowerCase() !== demoEmail || !matches) return res.status(401).json({message:'Correo o contraseña incorrectos.'});
  return sendSession(res, { id:'demo:local', email:demoEmail, displayName:'Oyente', provider:'demo' });
});
app.post('/api/auth/google', limiter, async (req,res) => {
  if (!googleClient) return res.status(503).json({message:'Google no está configurado. Define GOOGLE_CLIENT_ID en backend/.env.'});
  const credential = req.body?.credential;
  if (typeof credential !== 'string' || credential.length < 40 || credential.length > 10000) {
    return res.status(422).json({message:'Credencial Google no válida.'});
  }
  try {
    // La identidad firmada por Google se comprueba contra nuestro OAuth Client ID.
    const ticket = await googleClient.verifyIdToken({idToken:credential, audience:googleClientId});
    const googleUser = ticket.getPayload();
    if (!googleUser?.sub || !googleUser?.email || googleUser.email_verified !== true) {
      return res.status(401).json({message:'Google no confirmó tu cuenta.'});
    }
    return sendSession(res, {
      id:`google:${googleUser.sub}`,
      email:googleUser.email,
      displayName:googleUser.name || googleUser.given_name || googleUser.email,
      provider:'google'
    });
  } catch {
    return res.status(401).json({message:'No se pudo verificar el inicio de sesión con Google.'});
  }
});
app.get('/api/auth/me', requiresAuth, (req,res) => res.json({authenticated:true,user:{email:req.user.email,displayName:req.user.displayName}}));
app.post('/api/auth/logout', (_req,res) => {
  res.clearCookie(COOKIE, cookieOptions);
  res.json({ok:true});
});
app.use('/api', (_req,res) => res.status(404).json({message:'Ruta no encontrada.'}));
app.use((err,_req,res,_next) => {
  if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({message:'JSON inválido.'});
  console.error('Error API:',err.message);
  res.status(500).json({message:'Error interno.'});
});
if (require.main === module) {
  app.listen(port, '127.0.0.1', () => console.info(`[API JWT] http://localhost:${port}`));
}
module.exports = app;
