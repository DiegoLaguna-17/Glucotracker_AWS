const pool = require('../../database');
const verificarToken = require('../utils/verificarToken')


const auditoriaAdministrador = async (req, res, next) => {
  let called = false; // ✅ para que la auditoría se registre solo una vez

  const originalSend = res.send.bind(res);

  

  const registrarAuditoria = async () => {
    if (called) return; // ya registrado
    called = true;

    

    try {
      let id_usuario = req.params?.id_usuario || req.body?.id_usuario || req.query?.id_usuario ||req.params?.idUsuario|| null;
      let id_admin = req.params?.idAdmin || req.body?.idAdmin || req.query?.idAdmin || req.body?.administrador_id_admin||null;
      

      // Resolver id_usuario si solo tenemos id_admin
      if (!id_usuario && id_admin) {
        const { rows: dataRows } = await pool.query(
          `SELECT id_usuario FROM administrador WHERE id_admin = $1 LIMIT 1`,
          [id_admin]
        );
        const data = dataRows[0];
        if (data) id_usuario = data.id_usuario || null;
      }

      // Resolver id_admin si solo tenemos id_usuario
      if (!id_admin && id_usuario) {
        const { rows: dataRows } = await pool.query(
          `SELECT id_admin FROM administrador WHERE id_usuario = $1 LIMIT 1`,
          [id_usuario]
        );
        const data = dataRows[0];
        if (data) id_admin = data.id_admin || null;
      }
     
      // Insertar auditoría
      await pool.query(
        `INSERT INTO auditoria_endpoints (id_usuario, rol, id_rol, endpoint, operacion, exito, codigo_http, ip_origen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id_usuario, 'administrador', id_admin, req.originalUrl, req.method, res.statusCode < 400, res.statusCode, req.ip]
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

module.exports = auditoriaAdministrador;
