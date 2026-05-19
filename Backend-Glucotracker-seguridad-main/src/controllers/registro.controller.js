const pool = require('../../database');


const response = (res, status, code, message, data = null) => {
  return res.status(code).json({ status, code, message, data });
};

const datosParaGlucosa = async (req, res) => {
  // Ajusté el nombre de la variable para que sea coherente con la consulta (ID del paciente)
  // Asegúrate de que tu ruta de Express diga algo como: router.get('/datos/:idPaciente', ...)
  const idPaciente = parseInt(req.params.idPaciente || req.params.idUsuario);

  if (isNaN(idPaciente)) {
    return response(res, 'error', 400, 'El ID del paciente proporcionado no es válido');
  }

  try {
    // 1️⃣ Consulta Relacional con SQL
    const { rows: dataRows } = await pool.query(`
      SELECT 
        p.id_paciente,
        p.embarazo,
        p.id_medico,
        json_build_object('fecha_nac', u.fecha_nac) as usuario,
        (
          SELECT json_agg(json_build_object('enfermedades_base', json_build_object('nombre_enfermedad', eb.nombre_enfermedad)))
          FROM paciente_enfermedad pe
          JOIN enfermedades_base eb ON pe.id_enfermedad = eb.id_enfermedad
          WHERE pe.id_paciente = p.id_paciente
        ) as paciente_enfermedad
      FROM paciente p
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      WHERE p.id_paciente = $1
    `, [idPaciente]);

    const p = dataRows[0];

    if (!p) {
      return response(res, 'error', 404, 'No se encontró el paciente en el sistema');
    }

    // 2️⃣ Calcular la edad en Node.js (Reemplazo de date_part y age de PostgreSQL)
    let edad = 0;
    if (p.usuario?.fecha_nac) {
      const fechaNacimiento = new Date(p.usuario.fecha_nac);
      const hoy = new Date();
      edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const mes = hoy.getMonth() - fechaNacimiento.getMonth();
      
      // Si el mes actual es menor al mes de nacimiento, o si es el mismo mes pero el día no ha llegado, restamos 1 año
      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
      }
    }

    // 3️⃣ Mapear enfermedades a un arreglo simple
    const listaEnfermedades = p.paciente_enfermedad?.map(pe => pe.enfermedades_base?.nombre_enfermedad) || [];

    // 4️⃣ Construir el objeto JSON final
    const datosFormateados = {
      edad: edad,
      embarazo: p.embarazo,
      id_medico: p.id_medico,
      id_paciente: p.id_paciente,
      enfermedades: listaEnfermedades
    };

    // 5️⃣ Respuesta Exitosa
    return response(res, 'success', 200, 'Datos médicos del paciente obtenidos correctamente', datosFormateados);

  } catch (err) {
    console.error('Error interno en datosParaGlucosa:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar la solicitud');
  }
};
 


const nodemailer = require("nodemailer");
const { getHipoTemplate, getHiperTemplate } = require("../email/templates");

const registrarAlerta = async (req, res) => {
  const { id_tipo_alerta, id_registro, id_medico, fecha_alerta } = req.body;

  // Validación básica estandarizada
  if (!id_tipo_alerta || !id_registro || !id_medico || !fecha_alerta) {
    return response(res, 'error', 400, 'Todos los campos son requeridos para registrar la alerta');
  }

  try {
    // 1️⃣ Insertar alerta
    const { rows: data } = await pool.query(
      `INSERT INTO alertas (id_tipo_alerta, id_registro, id_medico, fecha_alerta)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id_tipo_alerta, id_registro, id_medico, fecha_alerta]
    );

    const alertaInsertada = data[0];

    // Obtener registro de glucosa
    const { rows: rgRows } = await pool.query(
      `SELECT id_paciente, nivel_glucosa, fecha, hora, observaciones FROM registro_glucosa WHERE id_registro = $1 LIMIT 1`,
      [id_registro]
    );
    const registro = rgRows[0];
    if (!registro) throw new Error("Registro de glucosa no encontrado");

    // Obtener paciente
    const { rows: pRows } = await pool.query(
      `SELECT id_usuario, id_medico FROM paciente WHERE id_paciente = $1 LIMIT 1`,
      [registro.id_paciente]
    );
    const paciente = pRows[0];
    if (!paciente) throw new Error("Paciente no encontrado");

    // Obtener médico asignado
    const { rows: mRows } = await pool.query(
      `SELECT id_usuario FROM medico WHERE id_medico = $1 LIMIT 1`,
      [paciente.id_medico]
    );
    const medico = mRows[0];
    if (!medico) throw new Error("Médico asignado no encontrado");

    // Obtener correo del usuario del médico
    const { rows: uRows } = await pool.query(
      `SELECT correo, nombre_completo FROM usuario WHERE id_usuario = $1 LIMIT 1`,
      [medico.id_usuario]
    );
    const usuarioMedico = uRows[0];
    if (!usuarioMedico) throw new Error("Usuario del médico no encontrado");
    
    // Obtener nombre del PACIENTE (usuario del paciente)
    const { rows: upRows } = await pool.query(
      `SELECT nombre_completo FROM usuario WHERE id_usuario = $1 LIMIT 1`,
      [paciente.id_usuario]
    );
    const usuarioPaciente = upRows[0];
    if (!usuarioPaciente) throw new Error("Usuario del paciente no encontrado");

    const datosCorreo = {
      nombrePaciente: usuarioPaciente.nombre_completo,
      valor: registro.nivel_glucosa,
      fecha: registro.fecha,
      hora: registro.hora,
      nombreMedico: usuarioMedico.nombre_completo,
      observaciones: registro.observaciones
    };

    const template =
      id_tipo_alerta === 1
        ? getHipoTemplate(datosCorreo)
        : getHiperTemplate(datosCorreo);



    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: `"GlucoTracker" <${process.env.EMAIL_USER}>`,
      to: usuarioMedico.correo,
      subject: template.subject,
      html: template.html
    });


    // Devolvemos 201 Created con el objeto de la alerta dentro de "data"
    return response(res, 'success', 201, 'Alerta registrada y correo enviado correctamente al médico', alertaInsertada);

  } catch (err) {
    console.error('Error al insertar alerta o enviar correo:', err.message);
    
    // Cualquier Error lanzado arriba (ej. paciente no encontrado) cae aquí y se devuelve de forma segura
    return response(res, 'error', 500, 'Ocurrió un error interno al registrar la alerta o procesar la notificación', err.message);
  }
};


module.exports = { datosParaGlucosa ,registrarAlerta };
