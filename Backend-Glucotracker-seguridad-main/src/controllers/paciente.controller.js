const pool = require('../../database');
const bcrypt=require('bcrypt')
const response = (res, status, code, message, data = null) => {
  return res.status(code).json({
    status,
    code,
    message,
    data
  });
};

/*
const registrarPaciente = async (req, res) => {
  try {
    console.log("FILES LLEGAN:", req.files);
    console.log("BODY LLEGA:", req.body);

    const {
      nombre_completo,
      correo,
      contrasena,
      rol,
      fecha_nac,
      id_medico,
      id_actividad,
      genero,
      peso,
      altura,
      enfermedad_id,
      tratamiento_id,
      dosis_,
      nombre_emergencia,
      numero_emergencia,
      embarazada,
      semanas
    } = req.body;

    const teléfono = req.body["teléfono"] || req.body["telÃ©fono"];
    const imgFiles = req.files?.foto_perfil;

    if (!imgFiles || imgFiles.length === 0) {
      return res.status(400).json({ error: "Archivo de perfil faltante" });
    }

    // TODO: Configurar AWS S3 para subir la foto de perfil del paciente
    const imgUrl = "https://placeholder.com/img";

    // Validación de campos obligatorios
    if (!nombre_completo || !correo || !contrasena || !rol || !fecha_nac || !teléfono || !id_medico
        || !id_actividad || !genero || !peso || !altura || !enfermedad_id || !tratamiento_id
        || !dosis_ || !nombre_emergencia || !numero_emergencia) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben ser llenados' });
    }

    // Checking if user exists first to avoid unnecessary work
    const { rows: existingUserRows } = await pool.query(`SELECT id_usuario FROM usuario WHERE correo = $1 LIMIT 1`, [correo]);
    if (existingUserRows.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Conversión de tipos
    const id_medicoInt = parseInt(id_medico);
    const id_actividadInt = parseInt(id_actividad);
    const enfermedad_idInt = parseInt(enfermedad_id);
    const tratamiento_idInt = parseInt(tratamiento_id);
    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura);
    const embarazadaBool = embarazada === 'true' || embarazada === true;
    const semanasInt = semanas ? parseInt(semanas) : null;

    // Hash de contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    // Insert usuario
    const { rows: userRows } = await pool.query(
      `INSERT INTO usuario (nombre_completo, correo, contrasena, rol, fecha_nac, "teléfono")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre_completo, correo, hashedPassword, rol, fecha_nac, teléfono]
    );
    const usuario_insertado = userRows[0];

    // Insert paciente
    const { rows: pacienteRows } = await pool.query(
      `INSERT INTO paciente (id_usuario, id_medico, id_nivel_actividad, genero, peso, altura, embarazo, nombre_emergencia, numero_emergencia, foto_perfil)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [usuario_insertado.id_usuario, id_medicoInt, id_actividadInt, genero, pesoNum, alturaNum, embarazadaBool, nombre_emergencia, numero_emergencia, imgUrl]
    );
    const paciente = pacienteRows[0];

    // Seguimiento embarazo solo si aplica
    if (embarazadaBool && semanasInt !== null) {
      await pool.query(
        `INSERT INTO seguimiento_embarazo (id_paciente, fecha_registro, semanas_embarazo)
         VALUES ($1, CURRENT_DATE, $2)`,
        [paciente.id_paciente, semanasInt]
      );
    }

    // Insert tratamiento
    await pool.query(
      `INSERT INTO tratamiento_enfermedad (id_paciente, id_tratamiento, dosis)
       VALUES ($1, $2, $3)`,
      [paciente.id_paciente, tratamiento_idInt, dosis_]
    );

    // Insert enfermedad
    await pool.query(
      `INSERT INTO paciente_enfermedad (id_paciente, id_enfermedad)
       VALUES ($1, $2)`,
      [paciente.id_paciente, enfermedad_idInt]
    );

    res.status(200).json({
      message: 'Usuario y paciente registrados correctamente',
      usuario_insertado,
      paciente
    });

  } catch (error) {
    console.error("Error al insertar datos: ", error);
    res.status(500).json({ error: error.message });
  }
};
*/

const perfilPaciente = async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.idPaciente);

    // 1️⃣ Validación básica
    if (isNaN(idPaciente)) {
      return response(res, 'error', 400, 'El ID del paciente proporcionado no es válido');
    }

    // 2️⃣ Consulta relacional con SQL
    const { rows: dataRows } = await pool.query(`
      SELECT 
        p.id_paciente, p.genero, p.altura, p.peso, p.embarazo, p.nombre_emergencia, p.numero_emergencia, p.foto_perfil,
        json_build_object(
          'id_usuario', u.id_usuario, 
          'nombre_completo', u.nombre_completo, 
          'fecha_nac', u.fecha_nac, 
          'teléfono', u.teléfono, 
          'correo', u.correo, 
          'fecha_registro', u.fecha_registro
        ) as usuario,
        json_build_object('descripcion', naf.descripcion) as nivel_actividad_fisica,
        json_build_object('usuario', json_build_object('nombre_completo', au.nombre_completo)) as administrador,
        json_build_object('usuario', json_build_object('nombre_completo', mu.nombre_completo)) as medico,
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
          SELECT json_agg(json_build_object('semanas_embarazo', se.semanas_embarazo, 'fecha_registro', se.fecha_registro, 'fecha_terminacion', se.fecha_terminacion))
          FROM seguimiento_embarazo se
          WHERE se.id_paciente = p.id_paciente
        ) as seguimiento_embarazo
      FROM paciente p
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN nivel_actividad_fisica naf ON p.id_nivel_actividad = naf.id_nivel_actividad
      LEFT JOIN administrador a ON p.administrador_id_admin = a.id_admin
      LEFT JOIN usuario au ON a.id_usuario = au.id_usuario
      LEFT JOIN medico m ON p.id_medico = m.id_medico
      LEFT JOIN usuario mu ON m.id_usuario = mu.id_usuario
      WHERE p.id_paciente = $1
    `, [idPaciente]);

    const p = dataRows[0];

    if (!p) {
      return response(res, 'error', 404, 'No se encontró el paciente solicitado');
    }

    // 3️⃣ Lógica para el seguimiento de embarazo (Replicando el CASE y ORDER BY del SQL)
    let semanas_embarazo = null;
    let registro_embarazo = null;

    if (p.embarazo && p.seguimiento_embarazo && p.seguimiento_embarazo.length > 0) {
      // Ordenamos en memoria: primero los activos (fecha_terminacion nula), luego por fecha más reciente
      const embarazosOrdenados = [...p.seguimiento_embarazo].sort((a, b) => {
        const aActivo = a.fecha_terminacion === null ? 0 : 1;
        const bActivo = b.fecha_terminacion === null ? 0 : 1;
        
        if (aActivo !== bActivo) return aActivo - bActivo;
        // Si ambos están activos o inactivos, ordenamos por fecha_registro descendente
        return new Date(b.fecha_registro) - new Date(a.fecha_registro);
      });

      semanas_embarazo = embarazosOrdenados[0].semanas_embarazo;
      registro_embarazo = embarazosOrdenados[0].fecha_registro;
    }

    // 4️⃣ Formateo de fecha de nacimiento (Replicando to_char 'DD/MM/YYYY')
    let fechaNacFormateada = null;
    if (p.usuario?.fecha_nac) {
      const [year, month, day] = p.usuario.fecha_nac.split('-');
      fechaNacFormateada = `${day}/${month}/${year}`;
    }

    // 5️⃣ Construcción del JSON final (Replicando la estructura exacta de json_build_object)
    const pacienteFormateado = {
      nombre: p.usuario?.nombre_completo,
      id: String(p.usuario?.id_usuario), // Cast a texto como en tu SQL
      fechaNac: fechaNacFormateada,
      genero: p.genero,
      altura: p.altura,
      peso: p.peso,
      telefono: p.usuario?.teléfono,
      correo: p.usuario?.correo,
      embarazo: p.embarazo,
      semanas_embarazo: semanas_embarazo,
      registro_embarazo: registro_embarazo,
      nombre_emergencia: p.nombre_emergencia,
      numero_emergencia: p.numero_emergencia,
      foto_perfil: p.foto_perfil,
      nombre_medico: p.medico?.usuario?.nombre_completo || null,
      fecha_registro: p.usuario?.fecha_registro,
      actividadFisica: {
        nivel: p.nivel_actividad_fisica?.descripcion || null,
        descripcion: p.nivel_actividad_fisica?.descripcion || null
      },
      afecciones: p.paciente_enfermedad?.map(pe => pe.enfermedades_base?.nombre_enfermedad) || [],
      tratamientos: p.tratamiento_enfermedad?.map(te => ({
        titulo: te.tratamientos?.nombre_tratamiento,
        descripcion: te.tratamientos?.descripcion,
        dosis: String(te.dosis)
      })) || [],
      admitidoPor: p.administrador?.usuario?.nombre_completo || null
    };

    // 6️⃣ Respuesta exitosa estandarizada
    return response(res, 'success', 200, 'Perfil de paciente obtenido correctamente', pacienteFormateado);

  } catch (err) {
    console.error('Error interno en perfilPaciente:', err);
    return response(res, 'error', 500, 'Error interno del servidor al procesar el perfil del paciente');
  }
};


const registrosPaciente = async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.idPaciente);

    // 1️⃣ Validación de entrada
    if (isNaN(idPaciente)) {
      return response(res, 'error', 400, 'El ID del paciente proporcionado no es válido');
    }

    // 2️⃣ Consulta SQL
    const { rows: registrosBD } = await pool.query(`
      SELECT 
        rg.id_registro,
        rg.fecha,
        rg.hora,
        rg.nivel_glucosa,
        rg.observaciones,
        json_build_object('momento', md.momento) as momento_dia,
        json_build_object('usuario', json_build_object('nombre_completo', mu.nombre_completo)) as medico,
        (
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
        ) as alertas
      FROM registro_glucosa rg
      LEFT JOIN momento_dia md ON rg.id_momento = md.id_momento
      LEFT JOIN medico m ON rg.id_medico = m.id_medico
      LEFT JOIN usuario mu ON m.id_usuario = mu.id_usuario
      WHERE rg.id_paciente = $1
      ORDER BY rg.fecha DESC, rg.hora DESC
    `, [idPaciente]);

    // 3️⃣ Si no hay registros, devolvemos arreglo vacío exitosamente
    if (!registrosBD || registrosBD.length === 0) {
      return response(res, 'success', 200, 'El paciente no tiene registros de glucosa', []);
    }

    // 4️⃣ Mapeo a la estructura plana exacta que devolvía tu SQL
    const registrosFormateados = registrosBD.map(rg => {
      // Supabase devuelve las relaciones 1 a N (como alertas) en un arreglo.
      // Tomamos la primera alerta (si existe) y su respectiva retroalimentación.
      const alerta = (rg.alertas && rg.alertas.length > 0) ? rg.alertas[0] : null;
      const retroalimentacion = (alerta && alerta.retroalimentacion && alerta.retroalimentacion.length > 0) 
                                ? alerta.retroalimentacion[0] 
                                : null;

      return {
        id: rg.id_registro,
        fecha: rg.fecha,
        hora: rg.hora,
        nivelGlucosa: Number(rg.nivel_glucosa),
        momentoDia: rg.momento_dia?.momento || null,
        quienTomoMuestra: rg.medico?.usuario?.nombre_completo || null,
        observaciones: rg.observaciones || null,
        idAlerta: alerta?.id_alerta || null,
        tipo_alerta: alerta?.tipo_alerta?.tipo || null,
        respuesta: retroalimentacion?.mensaje || null
      };
    });

    // 5️⃣ Respuesta exitosa estandarizada
    return response(res, 'success', 200, 'Historial de glucosa obtenido correctamente', registrosFormateados);

  } catch (err) {
    console.error('Error interno en registrosPaciente:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar los registros de glucosa');
  }
};



const registrarGlucosa = async (req, res) => {
  const {
    fecha,
    hora,
  
    id_momento,
    id_paciente,
    nivel_glucosa,
    observaciones
  } = req.body;

  if (!fecha || !hora  || !id_momento || !id_paciente || !nivel_glucosa) {
    return res.status(400).json({ error: "Todos los campos (menos observaciones) deben estar llenados" });
  }

  try {
    const { rows: glucosaData } = await pool.query(
      `INSERT INTO registro_glucosa (id_paciente, id_momento, fecha, hora, nivel_glucosa, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id_paciente, id_momento, fecha, hora, nivel_glucosa, observaciones || null]
    );

    const registro_glucosa = glucosaData[0]; 

    // Retornar el ID generado
    res.status(200).json({
      message: "Registro insertado correctamente",
      id_registro: registro_glucosa.id_registro, 
      registro_glucosa
    });

  } catch (error) {
    console.error("Error al insertar los datos: ", error.message);
    res.status(500).json({ error: error.message });
  }
};





const actualizarPaciente = async (req, res) => {
  const id_usuario = parseInt(req.params.id_usuario);
  const {
    nombre,
    altura,
    peso,
    telefono,
    correo,
    embarazo,
    fecha_terminacion,
    semanas_embarazo,
    nombre_emergencia,
    numero_emergencia
  } = req.body;

  if (!nombre || altura == null || !peso || !telefono || !correo || !nombre_emergencia || !numero_emergencia) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    // Obtener id_paciente desde id_usuario
    const { rows: pRows } = await pool.query(`SELECT id_paciente FROM paciente WHERE id_usuario = $1 LIMIT 1`, [id_usuario]);
    const pacienteData = pRows[0];

    if (!pacienteData) return res.status(404).json({ error: 'Paciente no encontrado' });

    const id_paciente = pacienteData.id_paciente;

    // Actualizamos tabla usuario
    const { rows: uRows } = await pool.query(
      `UPDATE usuario SET nombre_completo = $1, correo = $2, teléfono = $3 WHERE id_usuario = $4 RETURNING *`,
      [nombre, correo, telefono, id_usuario]
    );
    const usuarioActualizado = uRows[0];

    // Actualizamos tabla paciente
    let qParts = [`altura = $1`, `peso = $2`, `nombre_emergencia = $3`, `numero_emergencia = $4`];
    let qVals = [altura, parseFloat(peso), nombre_emergencia, numero_emergencia];
    let i = 5;
    if (embarazo !== undefined) {
      qParts.push(`embarazo = $${i++}`);
      qVals.push(embarazo);
    }
    qVals.push(id_usuario);
    
    const { rows: pUpdRows } = await pool.query(
      `UPDATE paciente SET ${qParts.join(', ')} WHERE id_usuario = $${i} RETURNING *`,
      qVals
    );
    const pacienteActualizado = pUpdRows[0];

    // Manejo de seguimiento_embarazo
    if (embarazo === true && semanas_embarazo > 0) {
      // Insertar nuevo seguimiento
      await pool.query(
        `INSERT INTO seguimiento_embarazo (id_paciente, fecha_registro, semanas_embarazo, fecha_terminacion) VALUES ($1, $2, $3, null)`,
        [id_paciente, new Date().toISOString().split('T')[0], semanas_embarazo]
      );
    } else if (embarazo === false && fecha_terminacion) {
      // Obtener el seguimiento más reciente activo
      const { rows: segActivos } = await pool.query(
        `SELECT id_seguimiento FROM seguimiento_embarazo WHERE id_paciente = $1 AND fecha_terminacion IS NULL ORDER BY fecha_registro DESC LIMIT 1`,
        [id_paciente]
      );

      if (segActivos && segActivos.length > 0) {
        await pool.query(
          `UPDATE seguimiento_embarazo SET fecha_terminacion = $1 WHERE id_seguimiento = $2`,
          [fecha_terminacion, segActivos[0].id_seguimiento]
        );
      }
    }

    res.json({
      usuario: usuarioActualizado,
      paciente: pacienteActualizado
    });

  } catch (error) {
    console.error("Error al actualizar paciente:", error);
    res.status(500).json({ error: 'Error al actualizar paciente', details: error });
  }
};

const obtenerSemanasEmbarazoActual = async (req, res) => {
  const id_paciente = parseInt(req.params.id_paciente);

  // 1️⃣ Validación básica
  if (isNaN(id_paciente)) {
    return response(res, 'error', 400, 'El ID del paciente proporcionado no es válido');
  }

  try {
    // 2️⃣ Obtener si el paciente está embarazado
    const { rows: pRows } = await pool.query(
      `SELECT embarazo FROM paciente WHERE id_paciente = $1 LIMIT 1`,
      [id_paciente]
    );

    if (!pRows || pRows.length === 0) {
      return response(res, 'error', 404, 'Paciente no encontrado en el sistema');
    }

    const embarazo = pRows[0].embarazo;

    // 3️⃣ Si NO está embarazado
    if (embarazo !== true) {
      return response(res, 'success', 200, 'El paciente no se encuentra en estado de gestación', { 
        semanas_actuales: null 
      });
    }

    // 4️⃣ Si SÍ está embarazado, obtener el último registro activo
    const { rows: dataEmbarazo } = await pool.query(
      `SELECT fecha_registro, semanas_embarazo FROM seguimiento_embarazo WHERE id_paciente = $1 AND fecha_terminacion IS NULL ORDER BY fecha_registro DESC LIMIT 1`,
      [id_paciente]
    );

    if (!dataEmbarazo || dataEmbarazo.length === 0) {
      // Es un paciente con estado embarazo=true, pero sin registros activos (quizás faltó crearlo)
      return response(res, 'success', 200, 'No hay un seguimiento de embarazo activo registrado', { 
        semanas_actuales: null 
      });
    }

    // 5️⃣ Cálculo de las semanas actuales
    const registro = dataEmbarazo[0];
    const fechaRegistro = new Date(registro.fecha_registro);
    const semanasIniciales = registro.semanas_embarazo;

    const hoy = new Date();
    const diferenciaDias = Math.floor((hoy - fechaRegistro) / (1000 * 60 * 60 * 24));
    const semanasActuales = semanasIniciales + Math.floor(diferenciaDias / 7);

    // 6️⃣ Respuesta Exitosa
    return response(res, 'success', 200, 'Semanas de embarazo calculadas correctamente', { 
      semanas_actuales: semanasActuales 
    });

  } catch (error) {
    console.error("Error al obtener semanas de embarazo:", error.message);
    
    // 7️⃣ Error del servidor
    return response(res, 'error', 500, 'Error interno del servidor al obtener las semanas de embarazo', error.message);
  }
};

module.exports={perfilPaciente,registrosPaciente,registrarGlucosa,/*registrarPaciente,*/actualizarPaciente,obtenerSemanasEmbarazoActual};