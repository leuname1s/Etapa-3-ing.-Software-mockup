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

app.get('/', (_req, res) => res.redirect('/admin/auth/login'));
app.get('/admin', (_req, res) => res.redirect('/admin/auth/login'));
app.get('/admin/auth/login', (_req, res) => res.type('html').send(renderPage('vuln')));
app.get('/admin/auth/login-fixed', (_req, res) => res.type('html').send(renderPage('fixed')));

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

// Endpoint "arreglado": misma lógica, pero con consulta parametrizada.
// Útil para comparar el mismo payload contra la versión vulnerable y la segura.
app.post('/admin/login-fixed', (req, res) => {
  const { email = '', password = '' } = req.body || {};

  // ✅ SEGURO: la entrada del usuario viaja como parámetro, nunca se concatena en el SQL
  const sql = `SELECT id, firstname, email FROM admin_users
               WHERE email = ? AND password = ? AND is_active = 1`;

  try {
    const user = db.prepare(sql).get(email, password);
    if (!user) {
      return res.status(400).json({
        data: null,
        error: { status: 400, name: 'ApplicationError', message: 'Invalid credentials', details: {} },
        ...(SHOW_SQL && { _lab_sql: sql, _lab_params: [email, password] })
      });
    }
    res.json({
      data: { token: 'lab-fake-jwt', user },
      ...(SHOW_SQL && { _lab_sql: sql, _lab_params: [email, password] })
    });
  } catch (e) {
    // Con sentencias preparadas, la entrada nunca se interpreta como SQL,
    // así que un payload de inyección simplemente no matchea ninguna fila.
    res.status(500).json({
      data: null,
      error: { status: 500, name: 'InternalServerError', message: VERBOSE_ERRORS ? e.message : 'Internal Server Error' },
      ...(SHOW_SQL && { _lab_sql: sql, _lab_params: [email, password] })
    });
  }
});

app.listen(PORT, '127.0.0.1', () =>
  console.log(`Lab Strapi-SQLi en http://127.0.0.1:${PORT}/admin/auth/login`));

function renderPage(mode) {
  const isFixed = mode === 'fixed';
  const postUrl = isFixed ? '/admin/login-fixed' : '/admin/login';
  const otherUrl = isFixed ? '/admin/auth/login' : '/admin/auth/login-fixed';
  const switchLabel = isFixed ? 'Ver versión vulnerable' : 'Ver versión parametrizada';
  const badgeText = isFixed ? 'login-fixed · parametrizado' : 'login · vulnerable';
  const badgeClass = isFixed ? 'badge badge-fixed' : 'badge badge-vuln';

  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Strapi Admin — ${isFixed ? 'login-fixed' : 'login'}</title>
<style>
  :root{
    --bg:#181826; --card:#212134; --text:#f6f6f9; --muted:#a5a5ba; --border:#3b3b57;
    --input-bg:#212134; --primary:#4945ff; --primary-h:#6f6afc; --danger:#ff8f86; --danger-bg:#4b1f1f;
    color-scheme: dark;
  }
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:var(--bg);color:var(--text);
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;position:relative}

  .lang{position:fixed;top:24px;right:24px;display:flex;align-items:center;gap:6px;
    background:var(--card);border:1px solid var(--border);border-radius:4px;padding:8px 12px;
    font-size:14px;color:var(--text)}
  .lang svg{opacity:.7}

  .switch-btn{position:fixed;top:24px;left:24px;display:flex;align-items:center;gap:6px;
    background:var(--card);border:1px solid var(--border);border-radius:4px;padding:8px 12px;
    font-size:13px;color:var(--text);text-decoration:none;cursor:pointer}
  .switch-btn:hover{border-color:var(--primary);color:var(--primary-h)}
  .switch-btn svg{opacity:.8}

  .badge{position:fixed;top:68px;left:24px;font-size:11px;font-weight:600;letter-spacing:.02em;
    padding:4px 10px;border-radius:4px}
  .badge-vuln{background:var(--danger-bg);color:var(--danger)}
  .badge-fixed{background:#163d2c;color:#5fd98b}

  @media(max-width:600px){.switch-btn{position:static;align-self:flex-start;margin-bottom:8px}
    .badge{position:static;align-self:flex-start;margin-bottom:16px}}

  .logo{width:64px;height:64px;border-radius:14px;
    background:linear-gradient(135deg,#7b61ff 0%,#4945ff 100%);
    display:grid;place-items:center;margin-bottom:24px;box-shadow:0 8px 24px rgba(73,69,255,.35)}

  .card{width:100%;max-width:552px;background:var(--card);border:1px solid var(--border);
    border-radius:4px;padding:56px 56px 48px}
  h1{font-size:28px;line-height:1.3;margin:0 0 8px;text-align:center;font-weight:700}
  .sub{margin:0 0 32px;text-align:center;color:var(--muted);font-size:14px}

  label{display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:var(--text)}
  label .req{color:#ff5c5c}
  .field{margin-bottom:24px}
  .input-wrap{position:relative}
  input[type=text],input[type=password]{width:100%;height:40px;padding:0 16px;border:1px solid var(--border);
    border-radius:4px;background:var(--input-bg);color:var(--text);font:inherit;font-size:14px}
  input[type=password]{padding-right:40px}
  input::placeholder{color:#6b6b86}
  input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 2px rgba(73,69,255,.35)}
  .toggle-pw{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;
    width:24px;height:24px;padding:0;display:grid;place-items:center;cursor:pointer;color:var(--muted)}
  .toggle-pw:hover{color:var(--text)}

  .remember{display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:24px}
  .remember input[type=checkbox]{width:16px;height:16px;margin:0;accent-color:var(--primary);
    border-radius:3px;background:var(--input-bg)}
  .remember label{margin:0;font-weight:400;font-size:14px;color:var(--text)}

  button#btn{width:100%;height:40px;border:none;background:var(--primary);color:#fff;
    border-radius:4px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
  button#btn:hover{background:var(--primary-h)}
  button#btn:disabled{opacity:.6;cursor:wait}

  .err{display:none;background:var(--danger-bg);color:var(--danger);border-radius:4px;padding:10px 14px;
    font-size:14px;margin-bottom:24px}

  .forgot{display:block;text-align:center;margin-top:24px;font-size:14px;color:var(--primary);text-decoration:none}
  .forgot:hover{text-decoration:underline}

  .lab{max-width:552px;width:100%;margin-top:16px;font-size:12px;color:var(--muted)}
  .lab pre{white-space:pre-wrap;word-break:break-all;background:var(--card);border:1px dashed var(--border);
    border-radius:4px;padding:10px;margin:8px 0 0;color:var(--text)}

  #dash{display:none;text-align:center}
  #dash code{background:var(--bg);padding:2px 6px;border-radius:4px}

  @media(max-width:600px){.card{padding:32px 24px}.lang{position:static;margin-bottom:16px;align-self:flex-end}}
</style></head>
<body>
  <a class="switch-btn" href="${otherUrl}" title="${switchLabel}">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    ${switchLabel}
  </a>
  <span class="${badgeClass}">${badgeText}</span>

  <div class="lang"><span>English</span>
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>

  <div class="logo" aria-hidden="true">
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M8 8h14v7H15v7H8V8Z" fill="#fff"/>
      <path d="M15 15h7l-7 7v-7Z" fill="#fff" fill-opacity=".55"/>
    </svg>
  </div>

  <main class="card">
    <form id="login">
      <h1>Welcome to Strapi!</h1>
      <p class="sub">Log in to your Strapi account</p>
      <div class="err" id="err" role="alert"></div>
      <div class="field">
        <label for="email">Email<span class="req">*</span></label>
        <input id="email" name="email" type="text" placeholder="e.g. kai@doe.com" autocomplete="username" required>
      </div>
      <div class="field">
        <label for="password">Password<span class="req">*</span></label>
        <div class="input-wrap">
          <input id="password" name="password" type="password" autocomplete="current-password" required>
          <button type="button" class="toggle-pw" id="togglePw" aria-label="Mostrar contraseña">
            <svg id="eyeIcon" width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" stroke="currentColor" stroke-width="1.4"/>
              <circle cx="10" cy="10" r="2.3" stroke="currentColor" stroke-width="1.4"/>
              <path id="eyeSlash" d="M3 3l14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" style="display:none"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="remember"><input id="rem" type="checkbox"><label for="rem">Remember me</label></div>
      <button id="btn" type="submit">Login</button>
    </form>
    <section id="dash">
      <h1 id="hello"></h1>
      <p class="sub">Sesión iniciada en el panel de administración.</p>
      <p>Usuario: <code id="who"></code></p>
      <p>Flag: <code>FLAG{sqli_login_bypass_strapi_lab}</code></p>
    </section>
  </main>

  <a class="forgot" href="#" onclick="return false">Forgot your password?</a>

  <div class="lab" id="lab" hidden>Lab · query ejecutada en el servidor:<pre id="sql"></pre></div>

<script>
const $ = id => document.getElementById(id);

$('togglePw').addEventListener('click', () => {
  const pw = $('password');
  const slash = $('eyeSlash');
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  slash.style.display = show ? 'block' : 'none';
});

$('login').addEventListener('submit', async e => {
  e.preventDefault();
  $('err').style.display = 'none'; $('btn').disabled = true;
  try {
    const r = await fetch('${postUrl}', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email:$('email').value, password:$('password').value })
    });
    const j = await r.json();
    if (j._lab_sql){
      const params = j._lab_params ? '\\n-- params: ' + JSON.stringify(j._lab_params) : '';
      $('sql').textContent = j._lab_sql + params;
      $('lab').hidden = false;
    }
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
}
