const pool = require('../../database');
const bcrypt = require('bcrypt');
const response = (res, status, code, message, data = null) => {
  return res.status(code).json({
    status,
    code,
    message,
    data
  });
};
/*
const registrarMedico = async (req, res) => {
  try {
    const { nombre_completo, correo, contrasena, telefono, fecha_nac, id_especialidad, departamento } = req.body;

    // 1️⃣ Validar archivos
    const pdfFiles = req.files?.matriculaProfesional;
    const imgFiles = req.files?.carnetProfesional;

    if (!pdfFiles || pdfFiles.length === 0) {
      return res.status(400).json({ error: "Archivo de matrícula faltante" });
    }
    if (!imgFiles || imgFiles.length === 0) {
      return res.status(400).json({ error: "Archivo de carnet faltante" });
    }

    const pdf = pdfFiles[0];
    const img = imgFiles[0];

    // 2️⃣ Subir archivos (TODO: Implementar S3)
    const pdfUrl = "https://placeholder.com/pdf";
    const imgUrl = "https://placeholder.com/img";

    // 3️⃣ Hashear contraseña
    const hashed_contrasena = await bcrypt.hash(contrasena, 10);
    const rol = 'medico';

    // 4️⃣ Insertar usuario
    const { rows: uRows } = await pool.query(
      `INSERT INTO usuario (nombre_completo, correo, contrasena, rol, "teléfono", fecha_nac)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre_completo, correo, hashed_contrasena, rol, telefono, fecha_nac]
    );
    const usuario = uRows[0];

    // 5️⃣ Insertar médico
    const { rows: mRows } = await pool.query(
      `INSERT INTO medico (id_usuario, id_especialidad, matricula_profesional, departamento, carnet_profesional, administrador_id_admin)
       VALUES ($1, $2, $3, $4, $5, 1) RETURNING *`,
      [usuario.id_usuario, id_especialidad, pdfUrl, departamento, imgUrl]
    );

    res.status(200).json({ mensaje: "Médico registrado correctamente", usuario, medico: mRows[0] });

  } catch (error) {
    console.error("❌ Error en registrarMedico:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registrarMedico };

*/


const verMedicos = async (req, res) => {
  try {
    const { rows: data } = await pool.query(`
      SELECT m.id_medico, json_build_object('nombre_completo', u.nombre_completo) as usuario
      FROM medico m
      INNER JOIN usuario u ON m.id_usuario = u.id_usuario
    `);

    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener médicos:', error.message);
    res.status(500).json({ error: 'Error al obtener médicos' });
  }
};



const perfilMedico = async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.idUsuario);

    // 🔹 Validación básica de entrada
    if (isNaN(idUsuario)) {
      return response(res, 'error', 400, 'El ID de usuario proporcionado no es válido');
    }

    // 1️⃣ Consulta Relacional con SQL
    const { rows: dataRows } = await pool.query(`
      SELECT 
        m.id_medico,
        m.matricula_profesional,
        m.departamento,
        m.carnet_profesional,
        u.nombre_completo as nombre,
        u.fecha_nac as "fechaNac",
        u.teléfono as telefono,
        u.correo,
        ua.nombre_completo as "admitidoPor"
      FROM medico m
      INNER JOIN usuario u ON m.id_usuario = u.id_usuario
      LEFT JOIN administrador a ON m.administrador_id_admin = a.id_admin
      LEFT JOIN usuario ua ON a.id_usuario = ua.id_usuario
      WHERE m.id_usuario = $1
    `, [idUsuario]);
    const medicoData = dataRows[0] || null;

    // 2️⃣ Validación de existencia
    if (!medicoData) {
      return response(res, 'error', 404, 'No se encontró el médico en el sistema');
    }

    // 3️⃣ Transformación de los datos
    // Mapeamos el resultado para que mantenga exactamente las mismas llaves que devolvía tu SQL
    const perfilFormateado = {
      id: medicoData.id_medico,
      nombre: medicoData.nombre,
      fechaNac: medicoData.fechaNac,
      telefono: medicoData.telefono,
      correo: medicoData.correo,
      matricula: medicoData.matricula_profesional,
      departamento: medicoData.departamento,
      carnet: medicoData.carnet_profesional,
      admin: medicoData.admitidoPor || 'No' 
    };

    // 4️⃣ Respuesta Exitosa
    return response(res, 'success', 200, 'Perfil del médico obtenido correctamente', perfilFormateado);

  } catch (err) {
    console.error('Error interno en perfilMedico:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar la solicitud');
  }
};

const formatearFecha = (fechaString) => {
  if (!fechaString) return null;
  // Extraemos año, mes y día de forma segura ignorando la zona horaria
  const [year, month, day] = fechaString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

const verPacientes = async (req, res) => {
  const { idMedico } = req.params;

  if (!idMedico || isNaN(idMedico)) {
    return response(res, 'error', 400, 'El ID del médico proporcionado no es válido');
  }

  try {
    // 1️⃣ CONSULTA RELACIONAL CON SQL
    const { rows: pacientesBD } = await pool.query(`
      SELECT 
        p.id_paciente, p.genero, p.peso, p.altura, p.numero_emergencia, p.nombre_emergencia, p.foto_perfil,
        json_build_object(
          'id_usuario', u.id_usuario, 
          'nombre_completo', u.nombre_completo, 
          'fecha_nac', u.fecha_nac, 
          'teléfono', u.teléfono, 
          'correo', u.correo, 
          'estado', u.estado
        ) as usuario,
        json_build_object('descripcion', naf.descripcion) as nivel_actividad_fisica,
        (
          SELECT json_agg(json_build_object('enfermedades_base', json_build_object('nombre_enfermedad', eb.nombre_enfermedad)))
          FROM paciente_enfermedad pe
          JOIN enfermedades_base eb ON pe.id_enfermedad = eb.id_enfermedad
          WHERE pe.id_paciente = p.id_paciente
        ) as paciente_enfermedad,
        (
          SELECT json_agg(json_build_object('dosis', te.dosis, 'tratamientos', json_build_object('nombre_tratamiento', t.nombre_tratamiento, 'descripcion', t.descripcion)))
          FROM tratamiento_enfermedad te
          JOIN tratamientos t ON te.id_tratamiento = t.id_tratamiento
          WHERE te.id_paciente = p.id_paciente
        ) as tratamiento_enfermedad,
        (
          SELECT json_agg(json_build_object(
            'id_registro', rg.id_registro, 
            'fecha', rg.fecha, 
            'hora', rg.hora, 
            'nivel_glucosa', rg.nivel_glucosa, 
            'observaciones', rg.observaciones,
            'momento_dia', json_build_object('momento', md.momento),
            'alertas', (
              SELECT json_agg(json_build_object(
                'id_alerta', a.id_alerta, 
                'tipo_alerta', json_build_object('tipo', ta.tipo),
                'retroalimentacion', (
                  SELECT json_agg(json_build_object('mensaje', r.mensaje))
                  FROM retroalimentacion r WHERE r.alertas_id_alerta = a.id_alerta
                )
              ))
              FROM alertas a
              LEFT JOIN tipo_alerta ta ON a.id_tipo_alerta = ta.id_tipo_alerta
              WHERE a.id_registro = rg.id_registro
            )
          ))
          FROM registro_glucosa rg
          LEFT JOIN momento_dia md ON rg.id_momento = md.id_momento
          WHERE rg.id_paciente = p.id_paciente
        ) as registro_glucosa
      FROM paciente p
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN nivel_actividad_fisica naf ON p.id_nivel_actividad = naf.id_nivel_actividad
      WHERE p.id_medico = $1 AND u.estado = true
    `, [parseInt(idMedico)]);

    if (!pacientesBD || pacientesBD.length === 0) {
      return response(res, 'success', 200, "El médico aún no tiene pacientes asignados.", []);
    }

    // 2️⃣ TRANSFORMACIÓN DE DATOS (Mapeo a la estructura exacta de tu SQL)
    const pacientesFormateados = pacientesBD.map((p) => {
      // Formatear Afecciones
      const afecciones = p.paciente_enfermedad ? p.paciente_enfermedad.map(pe => ({
        afeccion: pe.enfermedades_base?.nombre_enfermedad || null
      })) : [];

      // Formatear Tratamientos
      const tratamientos = p.tratamiento_enfermedad ? p.tratamiento_enfermedad.map(te => ({
        titulo: te.tratamientos?.nombre_tratamiento || null,
        desc: te.tratamientos?.descripcion || null,
        dosis: String(te.dosis)
      })) : [];

      // Procesar y agrupar Historial de Glucosa
      const historialMap = {};
      
      // Ordenamos los registros: primero por fecha (DESC), luego por hora (ASC)
      const registrosOrdenados = (p.registro_glucosa || []).sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha > b.fecha ? -1 : 1; 
        return a.hora < b.hora ? -1 : 1;
      });

      registrosOrdenados.forEach((reg) => {
        const fechaFormateada = formatearFecha(reg.fecha);
        
        if (!historialMap[fechaFormateada]) {
          historialMap[fechaFormateada] = { fecha: fechaFormateada, registros: [] };
        }

        // Estructurar alerta si existe
        let alertaObj = null;
        if (reg.alertas && reg.alertas.length > 0) {
          const alertaData = reg.alertas[0]; // Tomamos la primera alerta
          alertaObj = {
            nivel: alertaData.tipo_alerta?.tipo || null,
            observacion: reg.observaciones,
            // retroalimentacion es un arreglo al venir de una relación 1 a N
            mensaje: (alertaData.retroalimentacion && alertaData.retroalimentacion.length > 0) 
                     ? alertaData.retroalimentacion[0].mensaje 
                     : null 
          };
        }

        historialMap[fechaFormateada].registros.push({
          fecha: fechaFormateada,
          hora: reg.hora ? reg.hora.substring(0, 5) : null, // Cortamos a 'HH:MI'
          momento: reg.momento_dia?.momento || null,
          glucosa: String(reg.nivel_glucosa),
          alerta: alertaObj
        });
      });

      // Convertimos el objeto a un arreglo de objetos ordenado
      const historial = Object.values(historialMap);

      // 3️⃣ ESTRUCTURA DEL PACIENTE FINAL
      return {
        id: p.id_paciente,
        nombre: p.usuario.nombre_completo,
        ci: String(p.usuario.id_usuario),
        fechaNac: formatearFecha(p.usuario.fecha_nac),
        genero: p.genero,
        peso: String(p.peso),
        altura: String(p.altura),
        actividadFisica: p.nivel_actividad_fisica?.descripcion || null,
        telefono: p.usuario.teléfono,
        Correo: p.usuario.correo,
        numero_emergencia: p.numero_emergencia,
        nombre_emergencia: p.nombre_emergencia,
        foto_perfil: p.foto_perfil,
        afecciones: afecciones,
        tratamientos: tratamientos,
        historial: historial
      };
    });

    // Devolvemos la respuesta formateada y estandarizada
    return response(res, 'success', 200, "Pacientes obtenidos correctamente.", pacientesFormateados);

  } catch (err) {
    console.error("❌ Error en verPacientes:", err.message);
    return response(res, 'error', 500, "Error interno del servidor al procesar la lista de pacientes.");
  }
};

const alertasActivas = async (req, res) => {
  try {
    const idMedico = parseInt(req.params.idMedico);

    if (isNaN(idMedico)) {
      return response(res, 'error', 400, 'El ID del médico proporcionado no es válido');
    }

    // 1️⃣ Consulta SQL
    const { rows: alertasBD } = await pool.query(`
      SELECT 
        a.id_alerta,
        a.estado,
        a.fecha_alerta,
        json_build_object('tipo', ta.tipo) as tipo_alerta,
        json_build_object(
          'id_registro', rg.id_registro,
          'fecha', rg.fecha,
          'hora', rg.hora,
          'nivel_glucosa', rg.nivel_glucosa,
          'observaciones', rg.observaciones,
          'momento_dia', json_build_object('momento', md.momento),
          'paciente', json_build_object(
            'id_paciente', p.id_paciente,
            'id_medico', p.id_medico,
            'usuario', json_build_object('nombre_completo', u.nombre_completo)
          )
        ) as registro_glucosa
      FROM alertas a
      INNER JOIN tipo_alerta ta ON a.id_tipo_alerta = ta.id_tipo_alerta
      INNER JOIN registro_glucosa rg ON a.id_registro = rg.id_registro
      LEFT JOIN momento_dia md ON rg.id_momento = md.id_momento
      INNER JOIN paciente p ON rg.id_paciente = p.id_paciente
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      WHERE a.estado = true AND p.id_medico = $1
      ORDER BY a.fecha_alerta DESC
    `, [idMedico]);

    if (!alertasBD || alertasBD.length === 0) {
      return response(res, 'success', 200, 'No hay alertas activas en este momento', []);
    }

    // 2️⃣ Mapeo para cumplir con tu interfaz de Angular
    const alertasFormateadas = alertasBD.map(alerta => ({
      id: alerta.id_alerta,
      nivel: alerta.tipo_alerta?.tipo || '',
      idpaciente: alerta.registro_glucosa.paciente.id_paciente,
      paciente: alerta.registro_glucosa.paciente.usuario.nombre_completo,
      fecha: alerta.fecha_alerta || alerta.registro_glucosa.fecha,
      hora: alerta.registro_glucosa.hora,
      glucosa: alerta.registro_glucosa.nivel_glucosa,
      momento: alerta.registro_glucosa.momento_dia?.momento || '',
      observaciones: alerta.registro_glucosa.observaciones || ''
    }));

    return response(res, 'success', 200, 'Alertas activas obtenidas correctamente', alertasFormateadas);

  } catch (err) {
    console.error('Error interno en alertasActivas:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar las alertas');
  }
};

const alertasResueltas = async (req, res) => {
  try {
    const idMedico = parseInt(req.params.idMedico);

    if (isNaN(idMedico)) {
      return response(res, 'error', 400, 'El ID del médico proporcionado no es válido');
    }

    // 1️⃣ Consulta SQL
    const { rows: alertasBD } = await pool.query(`
      SELECT 
        a.id_alerta,
        a.estado,
        a.fecha_alerta,
        json_build_object('tipo', ta.tipo) as tipo_alerta,
        json_build_object(
          'id_registro', rg.id_registro,
          'fecha', rg.fecha,
          'hora', rg.hora,
          'nivel_glucosa', rg.nivel_glucosa,
          'observaciones', rg.observaciones,
          'momento_dia', json_build_object('momento', md.momento),
          'paciente', json_build_object(
            'id_paciente', p.id_paciente,
            'id_medico', p.id_medico,
            'usuario', json_build_object('nombre_completo', u.nombre_completo)
          )
        ) as registro_glucosa,
        (
          SELECT json_agg(json_build_object('mensaje', r.mensaje))
          FROM retroalimentacion r WHERE r.alertas_id_alerta = a.id_alerta
        ) as retroalimentacion
      FROM alertas a
      INNER JOIN tipo_alerta ta ON a.id_tipo_alerta = ta.id_tipo_alerta
      INNER JOIN registro_glucosa rg ON a.id_registro = rg.id_registro
      LEFT JOIN momento_dia md ON rg.id_momento = md.id_momento
      INNER JOIN paciente p ON rg.id_paciente = p.id_paciente
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      WHERE a.estado = false AND p.id_medico = $1
      ORDER BY a.fecha_alerta DESC
    `, [idMedico]);

    if (!alertasBD || alertasBD.length === 0) {
      return response(res, 'success', 200, 'No hay alertas resueltas en el historial', []);
    }

    // 2️⃣ Mapeo para cumplir con tu interfaz de Angular
    const alertasFormateadas = alertasBD.map(alerta => ({
      id: alerta.id_alerta,
      nivel: alerta.tipo_alerta?.tipo || '',
      idpaciente: alerta.registro_glucosa.paciente.id_paciente,
      paciente: alerta.registro_glucosa.paciente.usuario.nombre_completo,
      fecha: alerta.fecha_alerta || alerta.registro_glucosa.fecha,
      hora: alerta.registro_glucosa.hora,
      glucosa: alerta.registro_glucosa.nivel_glucosa,
      momento: alerta.registro_glucosa.momento_dia?.momento || '',
      observaciones: alerta.registro_glucosa.observaciones || '',
      // Extraemos el mensaje de la retroalimentación (Supabase lo devuelve como arreglo)
      mensaje: (alerta.retroalimentacion && alerta.retroalimentacion.length > 0) 
               ? alerta.retroalimentacion[0].mensaje 
               : 'Sin mensaje'
    }));

    return response(res, 'success', 200, 'Historial de alertas resueltas obtenido correctamente', alertasFormateadas);

  } catch (err) {
    console.error('Error interno en alertasResueltas:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar el historial de alertas');
  }
};

const retroalimentacionAlerta = async (req, res) => {
  const { id_medico, fecha_registro, mensaje, alertas_id_alerta } = req.body;

  // 1️⃣ Validación de campos
  if (!id_medico || !fecha_registro || !mensaje || !alertas_id_alerta) {
    return response(res, 'error', 400, 'Todos los campos son requeridos para resolver la alerta');
  }

  try {
    // 2️⃣ INSERT en Retroalimentacion
    const { rows: retroData } = await pool.query(
      `INSERT INTO retroalimentacion (id_medico, fecha_registro, mensaje, alertas_id_alerta) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id_medico, fecha_registro, mensaje, alertas_id_alerta]
    );

    // 3️⃣ UPDATE en Alertas, poniendo su estado = false (Resuelta)
    const { rows: alertaUpdate } = await pool.query(
      `UPDATE alertas SET estado = false WHERE id_alerta = $1 RETURNING *`,
      [alertas_id_alerta]
    );

    // 4️⃣ Respuesta exitosa estandarizada
    // Pasamos un objeto con ambas datas dentro del parámetro "data" de nuestra función response
    return response(res, 'success', 200, 'Alerta respondida y actualizada correctamente', {
      retroalimentacion: retroData,
      alerta_actualizada: alertaUpdate
    });

  } catch (err) {
    console.error('Error al responder alerta:', err.message);
    
    // 5️⃣ Manejo de error del servidor
    return response(res, 'error', 500, 'Error interno del servidor al responder la alerta', err.message);
  }
};

const registrarGlucosaMedico = async (req, res) => {
  const {
    fecha,
    hora,
    id_medico,
    id_momento,
    id_paciente,
    nivel_glucosa,
    observaciones
  } = req.body;

  // 1️⃣ Validación de campos obligatorios
  if (!fecha || !hora || !id_medico || !id_momento || !id_paciente || !nivel_glucosa) {
    return response(
      res, 
      'error', 
      400, 
      "Todos los campos (menos observaciones) deben estar llenados"
    );
  }

  try {
    // 2️⃣ Inserción en la base de datos
    const { rows: glucosaData } = await pool.query(
      `INSERT INTO registro_glucosa (id_paciente, id_medico, id_momento, fecha, hora, nivel_glucosa, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [parseInt(id_paciente), parseInt(id_medico), parseInt(id_momento), fecha, hora, parseFloat(nivel_glucosa), observaciones || null]
    );

    const registro_glucosa = glucosaData[0];

    // 3️⃣ Respuesta exitosa estandarizada
    return response(
      res, 
      'success', 
      201, 
      "Registro de glucosa insertado correctamente", 
      {
        id_registro: registro_glucosa.id_registro, // Corregido según tu esquema (id_registro)
        registro: registro_glucosa
      }
    );

  } catch (error) {
    console.error("Error en registrarGlucosaMedico: ", error.message);
    
    // 4️⃣ Manejo de error del servidor
    return response(
      res, 
      'error', 
      500, 
      "Error interno del servidor al registrar la medición de glucosa",
      error.message
    );
  }
};

const { v4: uuidv4 } = require('uuid'); // Para nombres de archivos únicos (opcional, o usa Date.now)

// Helper de respuestas que creamos antes
const s3Client = new S3Client({ region: 'us-east-1' }); 
const BUCKET_NAME = 'glucotracker-bucket';
const uploadToS3 = async (file, folderPath) => {
  // Limpiamos el nombre original para evitar caracteres problemáticos en la URL
  const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
  const fileName = `${folderPath}/${Date.now()}_${safeOriginalName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  // Construimos y retornamos la URL pública (ya que configuraste el bucket como público)
  return `https://${BUCKET_NAME}.s3.${await s3Client.config.region()}.amazonaws.com/${fileName}`;
};

const deleteFromS3 = async (fileUrl) => {
  if (!fileUrl) return;
  try {
    // Extraemos el 'Key' de la URL pública
    const key = fileUrl.split('.amazonaws.com/')[1];
    if (!key) return;

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    console.log(`🗑️ Archivo revertido en S3: ${key}`);
  } catch (err) {
    console.error(`⚠️ No se pudo borrar el archivo de S3: ${fileUrl}`, err);
  }
};


const actualizarMedico = async (req, res) => {
  const { id_medico } = req.params;
  const { telefono, correo, departamento } = req.body;
  const carnetFile = req.file; // Asumiendo que usas .single('carnet') en tus rutas

  let archivoSubido = null; // Rastrear el archivo para rollback en S3

  try {
    // INICIAMOS LA TRANSACCIÓN SQL
    await pool.query('BEGIN');

    // 1️⃣ Obtener id_usuario del médico para poder actualizar la tabla de usuarios
    const { rows: medicoRows } = await pool.query(
      `SELECT id_usuario FROM medico WHERE id_medico = $1`, 
      [id_medico]
    );
    const medico = medicoRows[0];

    if (!medico) {
      await pool.query('ROLLBACK');
      return response(res, 'error', 404, 'Médico no encontrado en el sistema');
    }

    const { id_usuario } = medico;

    // 2️⃣ Preparar objetos de actualización dinámicos
    const usuarioUpdates = {};
    if (telefono !== undefined) usuarioUpdates["teléfono"] = telefono; // Mantengo la tilde según tu código original
    if (correo !== undefined) usuarioUpdates.correo = correo;

    const medicoUpdates = {};
    if (departamento !== undefined) medicoUpdates.departamento = departamento;

    // 3️⃣ Gestión del archivo (Carnet Profesional) con AWS S3
    if (carnetFile) {
      // Subir a S3 y registrar para posible rollback
      const imgUrl = await uploadToS3(carnetFile, 'Carnets_IMG');
      archivoSubido = imgUrl;
      
      medicoUpdates.carnet_profesional = imgUrl;
    }

    // 4️⃣ Ejecutar actualizaciones en la tabla 'usuario'
    if (Object.keys(usuarioUpdates).length > 0) {
      const keys = Object.keys(usuarioUpdates);
      const values = keys.map(k => usuarioUpdates[k]);
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(
        `UPDATE usuario SET ${setClause} WHERE id_usuario = $${keys.length + 1}`, 
        [...values, id_usuario]
      );
    }

    // 5️⃣ Ejecutar actualizaciones en la tabla 'medico'
    if (Object.keys(medicoUpdates).length > 0) {
      const keys = Object.keys(medicoUpdates);
      const values = keys.map(k => medicoUpdates[k]);
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(
        `UPDATE medico SET ${setClause} WHERE id_medico = $${keys.length + 1}`, 
        [...values, id_medico]
      );
    }

    // SI TODO SALIÓ BIEN, GUARDAMOS LOS CAMBIOS EN BD
    await pool.query('COMMIT');

    // 6️⃣ Respuesta exitosa estandarizada
    return response(res, 'success', 200, 'Los datos del médico se actualizaron correctamente', {
      id_medico,
      actualizado_usuario: Object.keys(usuarioUpdates).length > 0,
      actualizado_perfil: Object.keys(medicoUpdates).length > 0,
      nueva_url_carnet: medicoUpdates.carnet_profesional || null
    });

  } catch (error) {
    // SI HAY ERROR, DESHACEMOS LA BASE DE DATOS
    await pool.query('ROLLBACK');
    console.error('❌ Error en la transacción. Revirtiendo base de datos...');
    
    // BORRAMOS EL ARCHIVO HUÉRFANO DE S3 SI SE SUBIÓ
    if (archivoSubido) {
      console.log("🧹 Limpiando archivo huérfano en S3...");
      try {
        await deleteFromS3(archivoSubido);
      } catch (s3Error) {
        console.error("❌ Error al intentar borrar de S3:", s3Error.message);
      }
    }

    console.error('Error en actualizarMedico:', error.message);
    
    return response(
      res, 
      'error', 
      500, 
      'Ocurrió un error al intentar actualizar los datos del médico',
      error.message
    );
  }
};
// ✅ export correcto
module.exports = {
  verMedicos,
  perfilMedico,
  verPacientes,
  alertasActivas,
  alertasResueltas,
  retroalimentacionAlerta,
  registrarGlucosaMedico,
  actualizarMedico
};
