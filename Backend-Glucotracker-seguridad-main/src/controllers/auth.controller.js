// controllers/authController.js
const pool = require('../../database');
const { verifyPassword, generateToken } = require('../utils/auth');

const loginPrueba = async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        const { rows: userRows } = await pool.query(
            `SELECT id_usuario, correo, contrasena, rol FROM usuario WHERE correo = $1 AND estado = true LIMIT 1`,
            [correo]
        );
        const usuarioData = userRows[0];

        if (!usuarioData) {
            console.log({
                fecha: new Date().toISOString(),
                endpoint: '/api/login',
                metodo: 'POST',
                correo,
                ip: req.ip,
                resultado: 'FALLIDO',
                motivo: 'Correo no encontrado'
            });
            return res.status(401).json({ error: 'Correo no encontrado' });
        }
        const usuario = usuarioData;
        
        
        // 2. Verificar la contraseña usando Bcrypt
        const isValid = await verifyPassword(contrasena, usuario.contrasena);
        
        const { rows: adminRows } = await pool.query(
            `SELECT id_admin, cargo FROM administrador WHERE id_usuario = $1 LIMIT 1`,
            [usuario.id_usuario]
        );
        const adminData = adminRows[0] || null;
        usuario.id_admin=adminData?.id_admin||null;
        // 3. Generar el JWT
        const token = generateToken(usuario);
        let cargo_admin=adminData?.cargo||null;
        // Establecer cookie httpOnly con el token
        res.cookie('token', token, {
            httpOnly: true,   // No accesible desde JavaScript (protege contra XSS)
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict', // Protege contra CSRF
            maxAge: 8 * 60 * 60 * 1000 
        });

        // 4. Devolver el token al cliente
        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            token: 'Generado correctamente',
            usuario: {
                id_usuario: usuario.id_usuario,
                rol: usuario.rol,
                id_rol:usuario.id_admin,
                cargo:cargo_admin
                
            }
        });

    } catch (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = loginPrueba;