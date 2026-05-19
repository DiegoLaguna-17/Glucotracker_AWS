const pool = require('../../database');

const auditoriaPaciente = async (req, res, next) => {
  let called = false; // ✅ para que la auditoría se registre solo una vez

  const originalSend = res.send.bind(res);

  const registrarAuditoria = async () => {
    if (called) return; // ya registrado
    called = true;

    try {
      let id_usuario = req.params?.id_usuario || req.body?.id_usuario || req.query?.id_usuario ||req.params?.idUsuario|| req.body?.idUsuario ||null;
      let id_paciente = req.params?.idPaciente || req.body?.idPaciente || req.query?.idPaciente || req.params?.id_paciente || req.body?.id_paciente ||null;
        let id_registro=req.body?.id_registro;
      // Resolver id_usuario si solo tenemos id_paciente
      if (!id_usuario && id_paciente) {
        const { rows: dataRows } = await pool.query(`SELECT id_usuario FROM paciente WHERE id_paciente = $1 LIMIT 1`, [id_paciente]);
        const data = dataRows[0];
        if (data) id_usuario = data.id_usuario || null;
      }

      // Resolver id_paciente si solo tenemos id_usuario
      if (!id_paciente && id_usuario) {
        const { rows: dataRows } = await pool.query(`SELECT id_paciente FROM paciente WHERE id_usuario = $1 LIMIT 1`, [id_usuario]);
        const data = dataRows[0];
        if (data) id_paciente = data.id_paciente || null;
      }

      if (id_registro) {
        // Obtener id_paciente desde id_registro
        const { rows: regRows } = await pool.query(`SELECT id_paciente FROM registro_glucosa WHERE id_registro = $1 LIMIT 1`, [id_registro]);
        const registroData = regRows[0];

        if (registroData) {
            id_paciente = registroData.id_paciente;
            
            // Obtener id_usuario desde id_paciente
            const { rows: pRows } = await pool.query(`SELECT id_usuario FROM paciente WHERE id_paciente = $1 LIMIT 1`, [id_paciente]);
            const pacienteData = pRows[0];

            if (pacienteData) {
              id_usuario = pacienteData.id_usuario || null;
            }
        }
      }

      // Insertar auditoría
      await pool.query(
        `INSERT INTO auditoria_endpoints (id_usuario, rol, id_rol, endpoint, operacion, exito, codigo_http, ip_origen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id_usuario, 'paciente', id_paciente, req.originalUrl, req.method, res.statusCode < 400, res.statusCode, req.ip]
      );
    } catch (err) {
      console.error('Error auditoría medico:', err?.message || err);
    }
  };

  // Sobrescribir solo res.send
  res.send = async (body) => {
    await registrarAuditoria();
    return originalSend(body);
  };

  next();
};

module.exports = auditoriaPaciente;
