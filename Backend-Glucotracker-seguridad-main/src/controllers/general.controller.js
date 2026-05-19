const { verMedicos } = require('./medico.controller');
const pool =require("../../database")
const verMomentos = async (req, res) => {
    try {
        const { rows: data } = await pool.query(
            `SELECT id_momento, momento FROM momento_dia`
        );

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener momentos: ', error.message);
        res.status(500).json({ error: 'Error al obtener momentos' });
    }
};


const verNiveles = async (req, res) => {
    try {
        const { rows: data } = await pool.query(
            `SELECT id_nivel_actividad, descripcion FROM nivel_actividad_fisica`
        );

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener niveles de actividad: ', error.message);
        res.status(500).json({ error: 'Error al obtener actividades' });
    }

};

const verEnfermedades = async (req, res) => {
    try {
        const { rows: data } = await pool.query(
            `SELECT id_enfermedad, nombre_enfermedad FROM enfermedades_base`
        );

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener enfermedades: ', error.message);
        res.status(500).json({ error: 'Error al obtener enfermedades' });
    }

};


const verTratamientos = async (req, res) => {
    try {
        const { rows: data } = await pool.query(
            `SELECT id_tratamiento, nombre_tratamiento, descripcion FROM tratamientos`
        );

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener tratamientos: ', error.message);
        res.status(500).json({ error: 'Error al obtener tratamientos' });
    }
};


const verEspecialidades = async (req, res) => {
    try {
        const { rows: data } = await pool.query(
            `SELECT id_especialidad, nombre FROM especialidad`
        );

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener tratamientos: ', error.message);
        res.status(500).json({ error: 'Error al obtener tratamientos' });
    }
};

const verAuditoria = async (req, res) => {
  try {
    const query = `
      SELECT 
        ae.*,
        u.nombre_completo
      FROM auditoria_endpoints ae
      LEFT JOIN usuario u ON ae.id_usuario = u.id_usuario
      ORDER BY ae.id DESC;
    `;

    const result = await pool.query(query);

    return res.status(200).json(result.rows);

  } catch (error) {
    console.error("Error obteniendo auditoría:", error);
    return res.status(500).json({
      message: "Error obteniendo auditoría",
      error: error.message
    });
  }
};

module.exports = {
    verMomentos, 
    verNiveles, 
    verEnfermedades, 
    verTratamientos, 
    verEspecialidades,
    verAuditoria
}