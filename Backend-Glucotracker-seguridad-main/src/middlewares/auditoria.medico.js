const pool = require('../../database');

const auditoriaMedico = async (req, res, next) => {
  let called = false; // ✅ para que la auditoría se registre solo una vez

  const originalSend = res.send.bind(res);

  const registrarAuditoria = async () => {
    if (called) return; // ya registrado
    called = true;

    try {
      let id_usuario = req.params?.id_usuario || req.body?.id_usuario || req.query?.id_usuario ||req.params?.idUsuario|| null;
      let id_medico = req.params?.idMedico || req.body?.idMedico || req.query?.idMedico || req.params?.id_medico || req.body?.id_medico ||null;

      // Resolver id_usuario si solo tenemos id_medico
      if (!id_usuario && id_medico) {
        const { rows: dataRows } = await pool.query(`SELECT id_usuario FROM medico WHERE id_medico = $1 LIMIT 1`, [id_medico]);
        const data = dataRows[0];
        if (data) id_usuario = data.id_usuario || null;
      }

      // Resolver id_medico si solo tenemos id_usuario
      if (!id_medico && id_usuario) {
        const { rows: dataRows } = await pool.query(`SELECT id_medico FROM medico WHERE id_usuario = $1 LIMIT 1`, [id_usuario]);
        const data = dataRows[0];
        if (data) id_medico = data.id_medico || null;
      }

      // Insertar auditoría
      await pool.query(
        `INSERT INTO auditoria_endpoints (id_usuario, rol, id_rol, endpoint, operacion, exito, codigo_http, ip_origen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id_usuario, 'medico', id_medico, req.originalUrl, req.method, res.statusCode < 400, res.statusCode, req.ip]
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

module.exports = auditoriaMedico;
