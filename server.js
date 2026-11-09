// ⚠️ LABORATORIO INTENCIONALMENTE VULNERABLE – solo para práctica local/CTF.
// Escucha únicamente en 127.0.0.1. No lo expongas a internet.
const express = require('express');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 1337;
const SHOW_SQL = process.env.SHOW_SQL !== '0';       // muestra la query ejecutada
const VERBOSE_ERRORS = process.env.VERBOSE !== '0';  // errores SQL visibles (error-based)

// --- Base de datos en memoria ---
const db = new Database(':memory:');
db.exec(`
  CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY, firstname TEXT, email TEXT, password TEXT, is_active INTEGER
  );
  CREATE TABLE secrets (id INTEGER PRIMARY KEY, name TEXT, value TEXT);
  INSERT INTO admin_users VALUES
    (1,'Admin','admin@strapi.local','Sup3rS3cret!',1),
    (2,'Editor','editor@strapi.local','editor123',1);
  INSERT INTO secrets VALUES (1,'flag','FLAG{sqli_login_bypass_strapi_lab}');
`);

const app = express();
app.use(express.json());

app.get('/admin', (_req, res) => res.type('html').send(PAGE));
app.get('/', (_req, res) => res.redirect('/admin/auth/login'));
app.get('/admin/auth/login', (_req, res) => res.type('html').send(PAGE));

// Endpoint con la misma ruta que el real de Strapi: POST /admin/login
app.post('/admin/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};

  // ❌ VULNERABLE: concatenación directa de entrada del usuario
  const sql = `SELECT id, firstname, email FROM admin_users
               WHERE email = '${email}' AND password = '${password}' AND is_active = 1`;

  try {
    const user = db.prepare(sql).get();
    if (!user) {
      return res.status(400).json({
        data: null,
        error: { status: 400, name: 'ApplicationError', message: 'Invalid credentials', details: {} },
        ...(SHOW_SQL && { _lab_sql: sql })
      });
    }
    res.json({ data: { token: 'lab-fake-jwt', user }, ...(SHOW_SQL && { _lab_sql: sql }) });
  } catch (e) {
    res.status(500).json({
      data: null,
      error: { status: 500, name: 'InternalServerError', message: VERBOSE_ERRORS ? e.message : 'Internal Server Error' },
      ...(SHOW_SQL && { _lab_sql: sql })
    });
  }
});

app.listen(PORT, '127.0.0.1', () =>
  console.log(`Lab Strapi-SQLi en http://127.0.0.1:${PORT}/admin/auth/login`));

const PAGE = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Strapi Admin</title>
<style>
  :root{
    --bg:#f6f6f9; --card:#fff; --text:#32324d; --muted:#666687; --border:#dcdce4;
    --primary:#4945ff; --primary-h:#271fe0; --danger:#d02b20; --danger-bg:#fcecea;
    --shadow:0 1px 4px rgba(33,33,52,.1);
  }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#181826; --card:#212134; --text:#f6f6f9; --muted:#a5a5ba; --border:#4a4a6a;
      --danger-bg:#4b1f1f; --danger:#ff8f86; --shadow:none; }
  }
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:var(--bg);color:var(--text);
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
  .logo{width:56px;height:56px;border-radius:12px;background:var(--primary);display:grid;place-items:center;margin-bottom:24px}
  .card{width:100%;max-width:552px;background:var(--card);border-radius:4px;box-shadow:var(--shadow);padding:56px 56px 48px}
  h1{font-size:32px;line-height:1.25;margin:0 0 8px;text-align:center;font-weight:700}
  .sub{margin:0 0 32px;text-align:center;color:var(--muted);font-size:14px}
  label{display:block;font-size:12px;font-weight:600;margin-bottom:4px}
  .field{margin-bottom:24px}
  input[type=text],input[type=password]{width:100%;height:40px;padding:0 16px;border:1px solid var(--border);
    border-radius:4px;background:var(--card);color:var(--text);font:inherit;font-size:14px}
  input:focus{outline:2px solid var(--primary);outline-offset:0;border-color:var(--primary)}
  .remember{display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:24px}
  .remember label{margin:0;font-weight:400;font-size:14px}
  button{width:100%;height:40px;border:1px solid var(--primary);background:var(--primary);color:#fff;
    border-radius:4px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
  button:hover{background:var(--primary-h);border-color:var(--primary-h)}
  button:disabled{opacity:.6;cursor:wait}
  .err{display:none;background:var(--danger-bg);color:var(--danger);border-radius:4px;padding:10px 14px;
    font-size:14px;margin-bottom:24px}
  .forgot{display:block;text-align:center;margin-top:24px;font-size:14px;color:var(--primary);text-decoration:none}
  .forgot:hover{text-decoration:underline}
  .lab{max-width:552px;width:100%;margin-top:16px;font-size:12px;color:var(--muted)}
  .lab pre{white-space:pre-wrap;word-break:break-all;background:var(--card);border:1px dashed var(--border);
    border-radius:4px;padding:10px;margin:8px 0 0;color:var(--text)}
  #dash{display:none;text-align:center}
  #dash code{background:var(--bg);padding:2px 6px;border-radius:4px}
  @media(max-width:600px){.card{padding:32px 24px}}
</style></head>
<body>
  <div class="logo" aria-hidden="true">
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M7 7h14v7H14v7H7V7Z" fill="#fff"/><path d="M14 14h7l-7 7v-7Z" fill="#fff" fill-opacity=".5"/></svg>
  </div>

  <main class="card">
    <form id="login">
      <h1>Welcome to Strapi!</h1>
      <p class="sub">Log in to your Strapi account</p>
      <div class="err" id="err" role="alert"></div>
      <div class="field"><label for="email">Email</label>
        <input id="email" name="email" type="text" autocomplete="username" required></div>
      <div class="field"><label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <div class="remember"><input id="rem" type="checkbox"><label for="rem">Remember me</label></div>
      <button id="btn" type="submit">Login</button>
      <a class="forgot" href="#" onclick="return false">Forgot your password?</a>
    </form>
    <section id="dash">
      <h1 id="hello"></h1>
      <p class="sub">Sesión iniciada en el panel de administración.</p>
      <p>Usuario: <code id="who"></code></p>
      <p>Flag: <code>FLAG{sqli_login_bypass_strapi_lab}</code></p>
    </section>
  </main>

  <div class="lab" id="lab" hidden>Lab · query ejecutada en el servidor:<pre id="sql"></pre></div>

<script>
const $ = id => document.getElementById(id);
$('login').addEventListener('submit', async e => {
  e.preventDefault();
  $('err').style.display = 'none'; $('btn').disabled = true;
  try {
    const r = await fetch('/admin/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email:$('email').value, password:$('password').value })
    });
    const j = await r.json();
    if (j._lab_sql){ $('sql').textContent = j._lab_sql; $('lab').hidden = false; }
    if (r.ok && j.data){
      $('login').style.display = 'none'; $('dash').style.display = 'block';
      $('hello').textContent = 'Hola, ' + j.data.user.firstname;
      $('who').textContent = j.data.user.email;
    } else {
      $('err').textContent = j.error?.message || 'Error'; $('err').style.display = 'block';
    }
  } catch { $('err').textContent = 'Network error'; $('err').style.display = 'block'; }
  $('btn').disabled = false;
});
</script>
</body></html>`;
