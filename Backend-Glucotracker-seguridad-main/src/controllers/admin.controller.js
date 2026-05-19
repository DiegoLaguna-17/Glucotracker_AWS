const pool = require('../../database'); // Cliente PostgreSQL nativo
const bcrypt=require('bcrypt')
const {sendEmail}=require('../email/sendEmail')
const {getWelcomeAdminTemplate}=require('../email/templates')
const response = (res, status, code, message, data = null) => {
  return res.status(code).json({
    status,
    code,
    message,
    data
  });
};

const medicosCompletos= async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id_medico as id,
        m.matricula_profesional as matricula,
        m.departamento,
        m.carnet_profesional as carnet,
        u.id_usuario,
        u.estado,
        u.nombre_completo as nombre,
        u.fecha_nac as "fechaNac",
        u.teléfono as telefono,
        u.correo,
        ua.nombre_completo as "admitidoPor"
      FROM medico m
      INNER JOIN usuario u ON m.id_usuario = u.id_usuario
      LEFT JOIN administrador a ON m.administrador_id_admin = a.id_admin
      LEFT JOIN usuario ua ON a.id_usuario = ua.id_usuario
    `;
    const { rows: medicosBD } = await pool.query(query);

    // Si no hay médicos activos, devolvemos un arreglo vacío con éxito
    if (!medicosBD || medicosBD.length === 0) {
      return response(res, 'success', 200, 'No hay médicos activos en el sistema', []);
    }

    const formateado = medicosBD.map(m => ({
      id: m.id,
      id_usuario: m.id_usuario,
      estado: m.estado,
      nombre: m.nombre,
      fechaNac: m.fechaNac,
      telefono: m.telefono,
      correo: m.correo,
      matricula: m.matricula,
      departamento: m.departamento,
      carnet: m.carnet,
      admitidoPor: m.admitidoPor
    }));

    // Respuesta exitosa estandarizada
    return response(res, 'success', 200, 'Lista de médicos activos obtenida correctamente', formateado);

  } catch (err) {
    console.error('Error interno en medicosActivos:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar la lista de médicos', err.message);
  }
};
const medicosActivos = async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id_medico as id,
        m.matricula_profesional as matricula,
        m.departamento,
        m.carnet_profesional as carnet,
        u.nombre_completo as nombre,
        u.fecha_nac as "fechaNac",
        u.teléfono as telefono,
        u.correo,
        u.estado,
        ua.nombre_completo as "admitidoPor"
      FROM medico m
      INNER JOIN usuario u ON m.id_usuario = u.id_usuario
      LEFT JOIN administrador a ON m.administrador_id_admin = a.id_admin
      LEFT JOIN usuario ua ON a.id_usuario = ua.id_usuario
    `;
    const { rows: medicosBD } = await pool.query(query);

    // Si no hay médicos activos, devolvemos un arreglo vacío con éxito
    if (!medicosBD || medicosBD.length === 0) {
      return response(res, 'success', 200, 'No hay médicos activos en el sistema', []);
    }

    const formateado = medicosBD.map(m => ({
      id: m.id,
      nombre: m.nombre,
      fechaNac: m.fechaNac,
      telefono: m.telefono,
      correo: m.correo,
      matricula: m.matricula,
      departamento: m.departamento,
      carnet: m.carnet,
      admitidoPor: m.admitidoPor
    }));

    // Respuesta exitosa estandarizada
    return response(res, 'success', 200, 'Lista de médicos activos obtenida correctamente', formateado);

  } catch (err) {
    console.error('Error interno en medicosActivos:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar la lista de médicos', err.message);
  }
};

// controllers/pacientes.controller.js

const pacientesActivos = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id_paciente as id,
        p.genero,
        p.peso,
        p.altura,
        p.foto_perfil,
        p.nombre_emergencia,
        p.numero_emergencia,
        u.id_usuario,
        u.estado,
        u.nombre_completo as nombre,
        u.correo as ci,
        u.fecha_nac as "fechaNac",
        u.teléfono as telefono,
        u.correo,
        naf.descripcion as "actividadFisica",
        mu.nombre_completo as medico,
        au.nombre_completo as "admitidoPor",
        COALESCE(
          (
            SELECT json_agg(json_build_object('afeccion', eb.nombre_enfermedad))
            FROM paciente_enfermedad pe
            JOIN enfermedades_base eb ON pe.id_enfermedad = eb.id_enfermedad
            WHERE pe.id_paciente = p.id_paciente
          ),
          '[]'::json
        ) as afecciones,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'titulo', t.nombre_tratamiento,
              'desc', t.descripcion,
              'dosis', te.dosis
            ))
            FROM tratamiento_enfermedad te
            JOIN tratamientos t ON te.id_tratamiento = t.id_tratamiento
            WHERE te.id_paciente = p.id_paciente
          ),
          '[]'::json
        ) as tratamientos
      FROM paciente p
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN nivel_actividad_fisica naf ON p.id_nivel_actividad = naf.id_nivel_actividad
      LEFT JOIN medico m ON p.id_medico = m.id_medico
      LEFT JOIN usuario mu ON m.id_usuario = mu.id_usuario
      LEFT JOIN administrador a ON p.administrador_id_admin = a.id_admin
      LEFT JOIN usuario au ON a.id_usuario = au.id_usuario
      WHERE u.estado = true
    `;
    const { rows: data } = await pool.query(query);

    // Si no hay datos, retornamos un arreglo vacío en lugar de un error
    if (!data || data.length === 0) {
      return response(res, 'success', 200, 'No hay pacientes activos en el sistema', []);
    }

    const formateado = data.map(p => {
      return {
        id: p.id,
        id_usuario: p.id_usuario,
        estado: p.estado,
        nombre: p.nombre,
        ci: p.correo, 
        fechaNac: p.fechaNac, 
        genero: p.genero,
        peso: String(p.peso),
        altura: String(p.altura),
        actividadFisica: p.actividadFisica,
        telefono: p.telefono,
        correo: p.correo,
        nombre_emergencia: p.nombre_emergencia,
        numero_emergencia: p.numero_emergencia,
        medico: p.medico,
        foto_perfil: p.foto_perfil,
        afecciones: p.afecciones,
        tratamientos: p.tratamientos.map(te => ({
          ...te,
          dosis: String(te.dosis)
        })),
        admitidoPor: p.admitidoPor,
      };
    });

    // Retorno exitoso usando el formato estándar
    return response(res, 'success', 200, 'Pacientes obtenidos correctamente', formateado);

  } catch (err) {
    console.error('Error interno en pacientesActivos:', err);
    return response(res, 'error', 500, 'Error del servidor al intentar obtener los pacientes', err.message);
  }
};





const pacientesCompletos = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id_paciente as id,
        p.genero,
        p.peso,
        p.altura,
        p.foto_perfil,
        p.nombre_emergencia,
        p.numero_emergencia,
        u.id_usuario,
        u.estado,
        u.nombre_completo as nombre,
        u.correo as ci,
        u.fecha_nac as "fechaNac",
        u.teléfono as telefono,
        u.correo,
        naf.descripcion as "actividadFisica",
        mu.nombre_completo as medico,
        au.nombre_completo as "admitidoPor",
        COALESCE(
          (
            SELECT json_agg(json_build_object('afeccion', eb.nombre_enfermedad))
            FROM paciente_enfermedad pe
            JOIN enfermedades_base eb ON pe.id_enfermedad = eb.id_enfermedad
            WHERE pe.id_paciente = p.id_paciente
          ),
          '[]'::json
        ) as afecciones,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'titulo', t.nombre_tratamiento,
              'desc', t.descripcion,
              'dosis', te.dosis
            ))
            FROM tratamiento_enfermedad te
            JOIN tratamientos t ON te.id_tratamiento = t.id_tratamiento
            WHERE te.id_paciente = p.id_paciente
          ),
          '[]'::json
        ) as tratamientos
      FROM paciente p
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN nivel_actividad_fisica naf ON p.id_nivel_actividad = naf.id_nivel_actividad
      LEFT JOIN medico m ON p.id_medico = m.id_medico
      LEFT JOIN usuario mu ON m.id_usuario = mu.id_usuario
      LEFT JOIN administrador a ON p.administrador_id_admin = a.id_admin
      LEFT JOIN usuario au ON a.id_usuario = au.id_usuario
    `;
    const { rows: data } = await pool.query(query);

    // Si no hay datos, retornamos un arreglo vacío en lugar de un error
    if (!data || data.length === 0) {
      return response(res, 'success', 200, 'No hay pacientes en el sistema', []);
    }

    const formateado = data.map(p => {
      return {
        id: p.id,
        id_usuario: p.id_usuario,
        estado: p.estado,
        nombre: p.nombre,
        ci: p.correo, 
        fechaNac: p.fechaNac, 
        genero: p.genero,
        peso: String(p.peso),
        altura: String(p.altura),
        actividadFisica: p.actividadFisica,
        telefono: p.telefono,
        correo: p.correo,
        nombre_emergencia: p.nombre_emergencia,
        numero_emergencia: p.numero_emergencia,
        medico: p.medico,
        foto_perfil: p.foto_perfil,
        afecciones: p.afecciones,
        tratamientos: p.tratamientos.map(te => ({
          ...te,
          dosis: String(te.dosis)
        })),
        admitidoPor: p.admitidoPor,
      };
    });

    // Retorno exitoso usando el formato estándar
    return response(res, 'success', 200, 'Pacientes obtenidos correctamente', formateado);

  } catch (err) {
    console.error('Error interno en pacientesActivos:', err);
    return response(res, 'error', 500, 'Error del servidor al intentar obtener los pacientes', err.message);
  }
};



const perfilAdmin = async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.idUsuario);

    // 1️⃣ Validación básica
    if (isNaN(idUsuario)) {
      return response(res, 'error', 400, 'El ID de usuario proporcionado no es válido');
    }

    // 2️⃣ Consulta Relacional con SQL
    const query = `
      SELECT 
        a.id_admin,
        a.cargo,
        a.fecha_ingreso,
        u.nombre_completo as nombre,
        u.correo,
        u.fecha_nac as "fechaNac",
        u.teléfono as telefono,
        ua.nombre_completo as "admitidoPor"
      FROM administrador a
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      LEFT JOIN administrador adm ON a.administrador_id_admin = adm.id_admin
      LEFT JOIN usuario ua ON adm.id_usuario = ua.id_usuario
      WHERE a.id_usuario = $1
    `;
    const { rows: data } = await pool.query(query, [idUsuario]);
    const adminData = data[0];

    if (!adminData) {
      return response(res, 'error', 404, 'No se encontró el perfil del administrador');
    }

    // 3️⃣ Formateo manual de fechas (Replicando to_char 'DD/MM/YYYY' de PostgreSQL)
    const formatearFecha = (fechaOriginal) => {
      if (!fechaOriginal) return null;
      // Convert Date object to string if it is a Date
      if (fechaOriginal instanceof Date) {
         fechaOriginal = fechaOriginal.toISOString().split('T')[0];
      }
      const [year, month, day] = fechaOriginal.split('-');
      return `${day}/${month}/${year}`;
    };

    // 4️⃣ Construcción del objeto JSON final
    const perfilFormateado = {
      id: adminData.id_admin,
      nombre: adminData.nombre,
      correo: adminData.correo,
      fechaNac: formatearFecha(adminData.fechaNac),
      telefono: adminData.telefono,
      cargo: adminData.cargo,
      fechaIn: formatearFecha(adminData.fecha_ingreso),
      admitidoPor: adminData.admitidoPor || 'No'
    };

    // 5️⃣ Respuesta exitosa estandarizada
    return response(res, 'success', 200, 'Perfil de administrador obtenido correctamente', perfilFormateado);

  } catch (err) {
    console.error('Error interno en perfilAdmin:', err.message);
    return response(res, 'error', 500, 'Error del servidor al intentar obtener el perfil del administrador');
  }
};


const agregarAdmin = async (req, res) => {
  const {
    nombre,
    correo,
    contrasena,
    fechaNacimiento,
    telefono,
    fecha_registro,
    administrador_id_admin
  } = req.body;

  // 1. Validación de campos obligatorios
  if (!nombre || !correo || !contrasena || !fechaNacimiento || !fecha_registro || !telefono || !administrador_id_admin) {
    return response(res, 'error', 400, 'Todos los campos deben ser llenados obligatoriamente');
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
    
    const cargoFijo = 'soporte';

    // 2. Inserción en la tabla 'usuario'
    const insertUsuarioQuery = `
      INSERT INTO usuario (nombre_completo, correo, contrasena, rol, fecha_nac, teléfono, estado)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `;
    const { rows: usuarioData } = await pool.query(insertUsuarioQuery, [nombre, correo, hashedPassword, cargoFijo, fechaNacimiento, telefono]);
    const usuario_insertado = usuarioData[0];

    // 3. Inserción en la tabla 'administrador'
    const insertAdminQuery = `
      INSERT INTO administrador (id_usuario, cargo, fecha_ingreso, administrador_id_admin)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const { rows: adminData } = await pool.query(insertAdminQuery, [usuario_insertado.id_usuario, cargoFijo, fecha_registro, administrador_id_admin]);

    // 4. Asignación de Rol en RBAC
    const { rows: rolData } = await pool.query(`SELECT id_rol FROM roles WHERE nombre_rol ILIKE 'soporte' LIMIT 1`);
    
    if (!rolData || rolData.length === 0) throw new Error('No se encontró el rol de soporte en el catálogo del sistema.');

    await pool.query(
      `INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2) ON CONFLICT (id_usuario, id_rol) DO NOTHING`,
      [usuario_insertado.id_usuario, rolData[0].id_rol]
    );

    // ------------------------------------------------------------
    // 5. ENVÍO DE CORREO ELECTRÓNICO (Notificación de Credenciales)
    // ------------------------------------------------------------
    try {
      const template = getWelcomeAdminTemplate({
        nombreAdmin: nombre,
        correo: correo,
        contrasena: contrasena // Enviamos la contraseña plana original
      });

      await sendEmail(correo, template.subject, template.html);
    } catch (mailError) {
      // Logeamos el error del correo pero no detenemos la respuesta, 
      // ya que el admin ya fue creado en la base de datos.
      console.error("Error al enviar correo de bienvenida:", mailError.message);
    }

    // 6. Respuesta exitosa
    return response(res, 'success', 201, 'Personal de soporte registrado y correo enviado correctamente', {
      usuario: usuario_insertado,
      detalle_admin: adminData[0]
    });

  } catch (error) {
    console.error("Error en agregarAdmin: ", error.message);
    return response(res, 'error', 500, 'Error interno al registrar el administrador', error.message);
  }
};

const obtenerAdmins = async (req, res) => {
  try {
    // 1. Recibimos el código público desde la URL
    const { idAdmin } = req.params;

    if (!idAdmin) {
      return response(res, 'error', 400, 'El ID de administrador solicitante es requerido');
    }

    // 2. Ejecutamos 1 sola consulta JOINs
    const query = `
      SELECT 
        a.id_admin,
        a.cargo,
        a.fecha_ingreso,
        u.id_usuario,
        u.nombre_completo as nombre,
        u.correo,
        u.fecha_nac as "fechaNac",
        u.teléfono as telefono,
        u.estado,
        ua.nombre_completo as "admitidoPor"
      FROM administrador a
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      LEFT JOIN administrador adm ON a.administrador_id_admin = adm.id_admin
      LEFT JOIN usuario ua ON adm.id_usuario = ua.id_usuario
      WHERE a.id_admin != 1 AND u.id_usuario != $1
    `;
    const { rows: data } = await pool.query(query, [idAdmin]);

    // Validación por si no hay más administradores
    if (!data || data.length === 0) {
      return response(res, 'success', 200, 'No hay otros administradores registrados en el sistema', []);
    }

    // 3. Mapeamos (aplanamos) los resultados para Angular
    const adminsFormateados = data.map((a) => {
      return {
        id_admin: a.id_admin,
        id_usuario: a.id_usuario,
        nombre: a.nombre,
        correo: a.correo,
        fechaNac: a.fechaNac,
        telefono: a.telefono,
        cargo: a.cargo,
        fechaIn: a.fecha_ingreso,
        admitidoPor: a.admitidoPor || null,
        estado: a.estado
      };
    });

    // 4. Devolvemos el JSON limpio en el formato estandarizado
    return response(res, 'success', 200, 'Lista de administradores obtenida correctamente', adminsFormateados);

  } catch (err) {
    console.error('Error interno en obtenerAdmins:', err.message);
    return response(res, 'error', 500, 'Error interno del servidor al procesar la solicitud', err.message);
  }
};


const obtenerRoles = async (req, res) => {
  try {
    const { rows: roles } = await pool.query(
      `SELECT * FROM roles WHERE nombre_rol != 'administrador' AND nombre_rol != 'pendiente'`
    );

    // ✅ éxito pero sin datos
    if (!roles || roles.length === 0) {
      return response(res, "success", 200, "No se encontraron roles", []);
    }

    // ✅ éxito con datos
    return response(res, "success", 200, "Roles obtenidos correctamente", roles);

  } catch (err) {
    console.error(err);
    return response(res, "error", 500, "Error interno del servidor", null);
  }
};



const insertarRoles = async (req, res) => {
  const { nombre_rol } = req.body;
  if (!nombre_rol) {
    return response(res, "error", 400, "El nombre del nuevo rol es requerido", null);
  }
  if (nombre_rol.length < 5) {
    return response(res, "error", 400, "El nombre del nuevo rol debe tener más de 4 caracteres", null);
  }
  try {
    const { rows: data } = await pool.query(
      `INSERT INTO roles (nombre_rol) VALUES ($1) RETURNING *`,
      [nombre_rol]
    );
    return response(res, "success", 201, "Rol creado correctamente", data);
  } catch (err) {
    console.error(err);
    return response(res, "error", 500, "Error interno del servidor", null);
  }
};



const obtenerRolesPermisos = async (req, res) => {
  try {
    // 1. Obtenemos primero el catálogo maestro de todos los permisos del sistema
    const { rows: todosLosPermisos } = await pool.query(
      `SELECT id_permiso, nombre FROM permiso WHERE id_permiso > 4`
    );

    // 2. Consultamos los roles y sus relaciones
    const { rows: rolesData } = await pool.query(`
      SELECT 
        r.id_rol, 
        r.nombre_rol,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id_permiso', rp.id_permiso, 'activo', rp.activo))
            FROM rol_permiso rp WHERE rp.id_rol = r.id_rol
          ),
          '[]'::json
        ) as rol_permiso
      FROM roles r
      WHERE r.nombre_rol != 'administrador' AND r.nombre_rol != 'pendiente'
      ORDER BY r.id_rol ASC
    `);

    // 3. Cruzamos los datos para devolver la matriz completa (true/false)
    const rolesFormateados = rolesData.map(rol => {
      
      const matrizPermisos = todosLosPermisos.map(p => {
        // Buscamos si existe el registro en la tabla puente rol_permiso
        const relacion = rol.rol_permiso.find(rp => rp.id_permiso === p.id_permiso);
        
        return {
          id_permiso: p.id_permiso,
          nombre: p.nombre,
          // Si el registro existe, usamos su valor real. Si no existe, es false por defecto.
          activo: relacion ? relacion.activo : false
        };
      });

      return {
        id_rol: rol.id_rol,
        nombre_rol: rol.nombre_rol,
        permisos: matrizPermisos
      };
    });

    return res.status(200).json(rolesFormateados);

  } catch (error) {
    console.error('Error en obtenerRolesPermisos:', error);
    return res.status(500).json({ error: 'Error al cargar la matriz de accesos' });
  }
};

const actualizarMatrizRoles = async (req, res) => {
  try {
    const rolesModificados = req.body; // Recibe el arreglo de roles que tuvieron cambios

    if (!Array.isArray(rolesModificados) || rolesModificados.length === 0) {
      return res.status(400).json({ error: 'No se recibieron cambios válidos para actualizar' });
    }

    // 1. Aplanamos la estructura jerárquica para que encaje exacto con las columnas de tu BD
    const dataParaUpsert = [];

    rolesModificados.forEach(rol => {
      if (rol.permisos && Array.isArray(rol.permisos)) {
        rol.permisos.forEach(permiso => {
          dataParaUpsert.push({
            id_rol: rol.id_rol,
            id_permiso: permiso.id_permiso,
            activo: permiso.activo
          });
        });
      }
    });

    // Validamos que después de aplanar realmente haya datos
    if (dataParaUpsert.length === 0) {
      return res.status(400).json({ error: 'La estructura de permisos estaba vacía.' });
    }

    // 2. Ejecutamos el upsert masivo en SQL.
    const values = [];
    const queryParts = [];
    let i = 1;
    for (const item of dataParaUpsert) {
      queryParts.push(`($${i++}, $${i++}, $${i++})`);
      values.push(item.id_rol, item.id_permiso, item.activo);
    }
    
    if (queryParts.length > 0) {
      const query = `
        INSERT INTO rol_permiso (id_rol, id_permiso, activo)
        VALUES ${queryParts.join(', ')}
        ON CONFLICT (id_rol, id_permiso) DO UPDATE SET activo = EXCLUDED.activo
      `;
      await pool.query(query, values);
    }

    return res.status(200).json({ message: 'Matriz de accesos actualizada con éxito' });

  } catch (error) {
    console.error('Error en actualizarMatrizRoles:', error);
    return res.status(500).json({ error: 'Error interno al procesar la actualización' });
  }
};





const obtenerSolicitudesPendientes = async (req, res) => {
  try {
    const { rows: data } = await pool.query(`
      SELECT id_usuario, nombre_completo, correo, teléfono as telefono, fecha_registro 
      FROM usuario 
      WHERE estado = false AND rol = 'pendiente' 
      ORDER BY fecha_registro DESC
    `);

    // Respuesta exitosa utilizando tu helper
    return response(
      res, 
      'success', 
      200, 
      'Solicitudes pendientes obtenidas correctamente', 
      data
    );

  } catch (error) {
    console.error('Error en obtenerSolicitudesPendientes:', error.message);
    
    // Respuesta de error utilizando tu helper
    return response(
      res, 
      'error', 
      500, 
      'Error interno del servidor al cargar las solicitudes'
    );
  }
};

const { v4: uuidv4 } = require('uuid'); // Para nombres de archivos únicos (opcional, o usa Date.now)

// Helper de respuestas que creamos antes


const activarCuenta = async (req, res) => {
  try {
    const { 
      id_usuario, 
      rol_seleccionado, 
      administrador_id_admin = 1 // Por defecto 1 si no lo envías, idealmente sacarlo del token
    } = req.body;

    if (!id_usuario || !rol_seleccionado) {
      return response(res, 'error', 400, 'Faltan datos críticos (id_usuario o rol)');
    }

    // 1. Buscamos el ID del rol en el sistema
    const { rows: rolRows } = await pool.query(
      `SELECT id_rol FROM roles WHERE nombre_rol ILIKE $1 LIMIT 1`,
      [rol_seleccionado]
    );

    if (!rolRows || rolRows.length === 0) throw new Error('El rol especificado no existe en el catálogo.');
    const id_rol = rolRows[0].id_rol;

    // ==========================================
    // FLUJO PARA PACIENTE
    // ==========================================
    if (rol_seleccionado.toLowerCase() === 'paciente') {
      const { id_medico, id_actividad, genero, peso, altura, enfermedad_id, tratamiento_id, dosis_, nombre_emergencia, numero_emergencia, embarazada, semanas } = req.body;
      
      const imgFiles = req.files?.foto_perfil;
      if (!imgFiles || imgFiles.length === 0) return response(res, 'error', 400, 'Falta la foto de perfil extraída del PDF');

      // Subir imagen (Comentado temporalmente para migración a AWS S3)

      const imgUrl = "https://placeholder.url/perfil.jpg"; // FIXME: AWS S3

      // Insertar Paciente
      const insertPacienteQuery = `
        INSERT INTO paciente (id_usuario, id_medico, id_nivel_actividad, genero, peso, altura, embarazo, nombre_emergencia, numero_emergencia, foto_perfil, administrador_id_admin)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id_paciente
      `;
      const { rows: pacienteData } = await pool.query(insertPacienteQuery, [
        parseInt(id_usuario), parseInt(id_medico), parseInt(id_actividad), genero, parseFloat(peso), parseFloat(altura), embarazada === 'true', nombre_emergencia, numero_emergencia, imgUrl, parseInt(administrador_id_admin)
      ]);

      const id_paciente = pacienteData[0].id_paciente;

      // Seguimiento embarazo
      if (embarazada === 'true' && semanas) {
        await pool.query(`INSERT INTO seguimiento_embarazo (id_paciente, semanas_embarazo) VALUES ($1, $2)`, [id_paciente, parseInt(semanas)]);
      }

      // Enfermedades y Tratamientos
      if (enfermedad_id && tratamiento_id) {
        await pool.query(`INSERT INTO paciente_enfermedad (id_paciente, id_enfermedad) VALUES ($1, $2)`, [id_paciente, parseInt(enfermedad_id)]);
        await pool.query(`INSERT INTO tratamiento_enfermedad (id_paciente, id_tratamiento, dosis) VALUES ($1, $2, $3)`, [id_paciente, parseInt(tratamiento_id), dosis_]);
      }
    } 
    // ==========================================
    // FLUJO PARA MÉDICO
    // ==========================================
    else if (rol_seleccionado.toLowerCase() === 'medico') {
      const { id_especialidad, departamento } = req.body;

      const pdfFiles = req.files?.matriculaProfesional;
      const carnetFiles = req.files?.carnetProfesional;

      if (!pdfFiles || !carnetFiles) return response(res, 'error', 400, 'Faltan documentos profesionales (Matrícula o Carnet)');

      // Subir archivos (Comentado temporalmente para migración a AWS S3)

      const pdfUrl = "https://placeholder.url/matricula.pdf"; // FIXME: AWS S3
      const imgUrl = "https://placeholder.url/carnet.jpg"; // FIXME: AWS S3

      // Insertar Médico
      const insertMedicoQuery = `
        INSERT INTO medico (id_usuario, id_especialidad, departamento, matricula_profesional, carnet_profesional, administrador_id_admin)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await pool.query(insertMedicoQuery, [parseInt(id_usuario), parseInt(id_especialidad), departamento, pdfUrl, imgUrl, parseInt(administrador_id_admin)]);
    }

    // ==========================================
    // ACTIVACIÓN FINAL DE LA CUENTA
    // ==========================================
    
    // Asignar en matriz de permisos (RBAC) con upsert por si acaso
    await pool.query(
      `INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2) ON CONFLICT (id_usuario, id_rol) DO NOTHING`,
      [parseInt(id_usuario), id_rol]
    );

    // Actualizar estado del usuario a Activo y cambiar su etiqueta de rol
    await pool.query(
      `UPDATE usuario SET estado = true, rol = $1 WHERE id_usuario = $2`,
      [rol_seleccionado, parseInt(id_usuario)]
    );

    return response(res, 'success', 200, `Cuenta activada exitosamente como ${rol_seleccionado.toUpperCase()}`);

  } catch (error) {
    console.error("❌ Error en activarCuenta:", error);
    return response(res, 'error', 500, 'Error interno al procesar la activación: ' + error.message);
  }
};

const suspenderUsuario = async (req, res) => {
  const id_usuario = parseInt(req.params.id_usuario);

  // 1️⃣ Validación del ID
  if (isNaN(id_usuario)) {
    return response(res, 'error', 400, 'El ID de usuario proporcionado no es válido');
  }

  try {
    // 2️⃣ Ejecutar la actualización en SQL
    const { rows: dataRows } = await pool.query(
      `UPDATE usuario SET estado = false WHERE id_usuario = $1 RETURNING id_usuario, nombre_completo, estado`,
      [id_usuario]
    );
    const data = dataRows[0];

    // 4️⃣ Verificar si el usuario existía
    if (!data) {
      return response(res, 'error', 404, 'No se encontró el usuario que intentas suspender');
    }

    // 5️⃣ Respuesta exitosa estandarizada
    return response(
      res, 
      'success', 
      200, 
      `El usuario ${data.nombre_completo} ha sido suspendido correctamente`, 
      data
    );

  } catch (err) {
    console.error('Error interno al suspender usuario:', err.message);
    return response(
      res, 
      'error', 
      500, 
      'Error interno del servidor al procesar la suspensión del usuario', 
      err.message
    );
  }
};

const reactivarUsuario = async (req, res) => {
  const id_usuario = parseInt(req.params.id_usuario);

  // 1️⃣ Validación del ID
  if (isNaN(id_usuario)) {
    return response(res, 'error', 400, 'El ID de usuario proporcionado no es válido');
  }

  try {
    // 2️⃣ Ejecutar la actualización en SQL
    const { rows: dataRows } = await pool.query(
      `UPDATE usuario SET estado = true WHERE id_usuario = $1 RETURNING id_usuario, nombre_completo, estado`,
      [id_usuario]
    );
    const data = dataRows[0];

    // 4️⃣ Verificar si el usuario existía
    if (!data) {
      return response(res, 'error', 404, 'No se encontró el usuario que intentas activar');
    }

    // 5️⃣ Respuesta exitosa estandarizada
    return response(
      res, 
      'success', 
      200, 
      `La cuenta de ${data.nombre_completo} ha sido reactivada con éxito`, 
      data
    );

  } catch (err) {
    console.error('Error interno al activar usuario:', err.message);
    return response(
      res, 
      'error', 500, 
      'Error interno del servidor al procesar la activación del usuario', 
      err.message
    );
  }
};

module.exports={medicosActivos,/*medicosSolicitantes,activarMedico,*/pacientesActivos, pacientesCompletos,/*pacientesSolicitantes,
  activarPaciente,*/perfilAdmin,agregarAdmin,obtenerAdmins, /*actualizarPermisosAdmins, */obtenerRoles,insertarRoles,
   /*actualizarPermisosPacientes,*/obtenerRolesPermisos,actualizarMatrizRoles,obtenerSolicitudesPendientes,activarCuenta,suspenderUsuario,reactivarUsuario,medicosCompletos};