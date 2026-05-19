const bcrypt = require('bcrypt');
const pool = require('../../database');


const response = (res, status, code, message, data = null) => {
  return res.status(code).json({ status, code, message, data });
};

const solicitarRegistro = async (req, res) => {
  const { nombre, correo, contrasena, fechaNac, telefono } = req.body;

  // 1. Validación básica de campos vacíos
  if (!nombre || !correo || !contrasena || !fechaNac || !telefono) {
    return response(res, 'error', 400, 'Todos los campos son obligatorios para enviar la solicitud');
  }

  try {
    // 2. Encriptamos la contraseña por seguridad
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    try {
      const { rows: data } = await pool.query(
        `INSERT INTO usuario (nombre_completo, correo, contrasena, fecha_nac, "teléfono", estado, rol)
         VALUES ($1, $2, $3, $4, $5, false, 'pendiente') RETURNING id_usuario`,
        [nombre, correo, hashedPassword, fechaNac, telefono]
      );

      // 5. Respuesta exitosa (201 Created)
      return response(res, 'success', 201, 'Solicitud registrada correctamente. Pendiente de validación por Soporte.', { 
        usuario_id: data[0].id_usuario 
      });
    } catch (error) {
      // 4. Manejo de error si el correo ya está registrado (Violación de restricción UNIQUE)
      if (error.code === '23505') {
        return response(res, 'error', 409, 'El correo electrónico ingresado ya se encuentra registrado en el sistema');
      }
      throw error;
    }

  } catch (error) {
    console.error('Error en solicitarRegistro:', error.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar la solicitud de registro', error.message);
  }
};
module.exports = {
  // ... exporta tus otras funciones,
  solicitarRegistro
};