# Strapi admin login – laboratorio SQLi (solo uso educativo)

    npm install
    npm start

Dos páginas separadas:

- http://127.0.0.1:1337/admin/auth/login — versión vulnerable, postea a `/admin/login`
- http://127.0.0.1:1337/admin/auth/login-fixed — versión parametrizada, postea a `/admin/login-fixed`

Cada una tiene un botón arriba a la izquierda para saltar a la otra.

Variables: `PORT`, `SHOW_SQL=0` (oculta la query), `VERBOSE=0` (oculta errores SQL).
Escucha solo en 127.0.0.1. No lo despliegues en una red pública.

Objetivo: iniciar sesión sin conocer la contraseña y leer la tabla `secrets`.
Remediación: consultas parametrizadas (`db.prepare("... WHERE email = ? AND ...").get(email, hash)`) + bcrypt.

## Comparar vulnerable vs. parametrizado

Las dos páginas lucen igual (mismo diseño tipo Strapi) salvo por una insignia
arriba a la izquierda que indica cuál es cuál, y el botón para saltar entre ellas:

- `/admin/auth/login` → `POST /admin/login` — vulnerable (concatena el input en el SQL).
- `/admin/auth/login-fixed` → `POST /admin/login-fixed` — usa `db.prepare(sql).get(email, password)` con `?` como placeholders.

Probá el mismo payload (ej. `' OR '1'='1' --`) en las dos páginas y compará el panel
"query ejecutada" debajo del formulario: en la vulnerable vas a ver tu payload
incrustado en el SQL; en la parametrizada, el SQL queda fijo (`WHERE email = ? AND password = ? ...`)
y tu input viaja aparte como `_lab_params`, así que nunca se interpreta como código SQL
y el login simplemente falla con "Invalid credentials".

Nota: esto sigue sin ser producción-ready, porque las contraseñas se comparan en texto
plano. En un sistema real también hace falta hashear con bcrypt y comparar hashes.
