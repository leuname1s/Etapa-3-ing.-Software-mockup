# Strapi admin login – laboratorio SQLi (solo uso educativo)

    npm install
    npm start          # http://127.0.0.1:1337/admin/auth/login

Variables: `PORT`, `SHOW_SQL=0` (oculta la query), `VERBOSE=0` (oculta errores SQL).
Escucha solo en 127.0.0.1. No lo despliegues en una red pública.

Objetivo: iniciar sesión sin conocer la contraseña y leer la tabla `secrets`.
Remediación: consultas parametrizadas (`db.prepare("... WHERE email = ? AND ...").get(email, hash)`) + bcrypt.
