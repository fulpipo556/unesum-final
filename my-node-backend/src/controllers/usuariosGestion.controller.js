const { Usuario, Rol, Facultad, Carrera, Nivel, Asignatura } = require('../models');
const { Op } = require('sequelize');
const xlsx = require('xlsx');

function mapUsuario(u) {
  return {
    id: u.id,
    nombres: u.nombres,
    apellidos: u.apellidos,
    correo_electronico: u.correo_electronico,
    username: u.username || null,
    activo: u.estado,
    rol: u.rol || null,
    roles: (u.roles || []).map(r => ({ id: r.id, nombre: r.nombre, codigo: r.codigo })),
    facultades: (u.facultades || []).map(f => ({ id: f.id, nombre: f.nombre })),
    carreras: (u.carreras || []).map(c => ({ id: c.id, nombre: c.nombre, facultad_id: c.facultad_id })),
    niveles: (u.niveles || []).map(n => ({ id: n.id, nombre: n.nombre, codigo: n.codigo })),
    asignaturas: (u.asignaturas || []).map(a => ({ id: a.id, nombre: a.nombre, codigo: a.codigo, carrera_id: a.carrera_id })),
  };
}

const includeAll = [
  { model: Rol, as: 'roles', through: { attributes: [] } },
  { model: Facultad, as: 'facultades', through: { attributes: [] } },
  { model: Carrera, as: 'carreras', through: { attributes: [] } },
  { model: Nivel, as: 'niveles', through: { attributes: [] } },
  { model: Asignatura, as: 'asignaturas', through: { attributes: [] } },
];

exports.list = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      include: includeAll,
      order: [['id', 'ASC']]
    });
    res.json(usuarios.map(mapUsuario));
  } catch (e) {
    res.status(500).json({ message: 'Error al listar usuarios', error: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { 
      nombres, apellidos, correo_electronico, username, password, 
      rolesIds = [], facultadIds = [], carreraIds = [], nivelIds = [], asignaturaIds = [],
      estado = true 
    } = req.body;

    const usuario = await Usuario.create({ nombres, apellidos, correo_electronico, username, password_hash: password, estado });

    if (rolesIds.length) {
      const roles = await Rol.findAll({ where: { id: { [Op.in]: rolesIds } } });
      await usuario.setRoles(roles);
    }
    if (facultadIds.length) {
      const facultades = await Facultad.findAll({ where: { id: { [Op.in]: facultadIds } } });
      await usuario.setFacultades(facultades);
    }
    if (carreraIds.length) {
      const carreras = await Carrera.findAll({ where: { id: { [Op.in]: carreraIds } } });
      await usuario.setCarreras(carreras);
    }
    if (nivelIds.length) {
      const niveles = await Nivel.findAll({ where: { id: { [Op.in]: nivelIds } } });
      await usuario.setNiveles(niveles);
    }
    if (asignaturaIds.length) {
      const asignaturas = await Asignatura.findAll({ where: { id: { [Op.in]: asignaturaIds } } });
      await usuario.setAsignaturas(asignaturas);
    }

    const created = await Usuario.findByPk(usuario.id, { include: includeAll });
    res.status(201).json(mapUsuario(created));
  } catch (e) {
    res.status(500).json({ message: 'Error al crear usuario', error: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const { 
      nombres, apellidos, correo_electronico, username, password, 
      rolesIds, facultadIds, carreraIds, nivelIds, asignaturaIds,
      estado 
    } = req.body;
    
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    await usuario.update({ nombres, apellidos, correo_electronico, username, password_hash: password, estado });

    if (rolesIds !== undefined) {
      const roles = await Rol.findAll({ where: { id: { [Op.in]: rolesIds || [] } } });
      await usuario.setRoles(roles);
    }
    if (facultadIds !== undefined) {
      const facultades = await Facultad.findAll({ where: { id: { [Op.in]: facultadIds || [] } } });
      await usuario.setFacultades(facultades);
    }
    if (carreraIds !== undefined) {
      const carreras = await Carrera.findAll({ where: { id: { [Op.in]: carreraIds || [] } } });
      await usuario.setCarreras(carreras);
    }
    if (nivelIds !== undefined) {
      const niveles = await Nivel.findAll({ where: { id: { [Op.in]: nivelIds || [] } } });
      await usuario.setNiveles(niveles);
    }
    if (asignaturaIds !== undefined) {
      const asignaturas = await Asignatura.findAll({ where: { id: { [Op.in]: asignaturaIds || [] } } });
      await usuario.setAsignaturas(asignaturas);
    }

    const reloaded = await Usuario.findByPk(id, { include: includeAll });
    res.json(mapUsuario(reloaded));
  } catch (e) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: e.message });
  }
};

exports.export = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({ include: includeAll });

    const rows = usuarios.map(u => ({
      Nombres: u.nombres,
      Apellidos: u.apellidos,
      Correo: u.correo_electronico,
      Usuario: u.username || '',
      Clave: u.password_hash ? '***' : '',
      Facultades: (u.facultades||[]).map(f=>f.nombre).join(', '),
      Carreras: (u.carreras||[]).map(c=>c.nombre).join(', '),
      Niveles: (u.niveles||[]).map(n=>n.nombre).join(', '),
      Asignaturas: (u.asignaturas||[]).map(a=>a.nombre).join(', '),
      Roles: (u.roles||[]).map(r=>r.nombre).join(', '),
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, 'Usuarios');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ message: 'Error al exportar usuarios', error: e.message });
  }
};

exports.import = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const results = {
      success: [],
      errors: []
    };

    for (const row of data) {
      try {
        // Soportar ambos nombres de campos
        const nombres = row.nombres;
        const apellidos = row.apellidos;
        const correo_electronico = row.correo_electronico;
        const username = row.username;
        const cedula_identidad = row.cedula_identidad || row.cedula || '0000000000';
        const password = row.password || row.contraseña || row.password_hash || 'temporal123';
        const roles = row.roles;
        const facultades = row.facultades;
        const carreras = row.carreras;
        const cursos = row.cursos;
        const materias = row.materias;

        if (!nombres || !apellidos || !correo_electronico) {
          results.errors.push({ row, error: 'Faltan campos obligatorios (nombres, apellidos, correo)' });
          continue;
        }

        // Convertir nombres a IDs haciendo split correctamente
        const rolesIds = [];
        const facultadIds = [];
        const carreraIds = [];
        const nivelIds = [];
        const asignaturaIds = [];
        let rolPrincipal = 'docente'; // Por defecto

        // Roles - split por punto y coma
        if (roles) {
          const roleNames = String(roles).split(';').map(r => r.trim().toLowerCase()).filter(r => r);
          if (roleNames.length > 0) {
            const rolesFound = await Rol.findAll({ 
              where: { nombre: { [Op.in]: roleNames } } 
            });
            rolesIds.push(...rolesFound.map(r => r.id));
            // Tomar el primer rol encontrado como rol principal
            if (rolesFound.length > 0) {
              rolPrincipal = rolesFound[0].nombre;
            }
          }
        }

        // Facultades - split por punto y coma
        if (facultades) {
          const facultadNames = String(facultades).split(';').map(f => f.trim()).filter(f => f);
          if (facultadNames.length > 0) {
            const facultadesFound = await Facultad.findAll({ 
              where: { nombre: { [Op.in]: facultadNames } } 
            });
            facultadIds.push(...facultadesFound.map(f => f.id));
          }
        }

        // Carreras - split por punto y coma
        if (carreras) {
          const carreraNames = String(carreras).split(';').map(c => c.trim()).filter(c => c);
          if (carreraNames.length > 0) {
            const carrerasFound = await Carrera.findAll({ 
              where: { nombre: { [Op.in]: carreraNames } } 
            });
            carreraIds.push(...carrerasFound.map(c => c.id));
          }
        }

        // Niveles/Cursos - split por punto y coma
        if (cursos) {
          const nivelNames = String(cursos).split(';').map(n => n.trim()).filter(n => n);
          if (nivelNames.length > 0) {
            const nivelesFound = await Nivel.findAll({ 
              where: { nombre: { [Op.in]: nivelNames } } 
            });
            nivelIds.push(...nivelesFound.map(n => n.id));
          }
        }

        // Asignaturas/Materias - split por punto y coma
        if (materias) {
          const asignaturaNames = String(materias).split(';').map(a => a.trim()).filter(a => a);
          if (asignaturaNames.length > 0) {
            const asignaturasFound = await Asignatura.findAll({ 
              where: { nombre: { [Op.in]: asignaturaNames } } 
            });
            asignaturaIds.push(...asignaturasFound.map(a => a.id));
          }
        }

        // Crear usuario con todos los campos obligatorios
        const usuario = await Usuario.create({
          nombres,
          apellidos,
          correo_electronico,
          username: username || null,
          cedula_identidad: String(cedula_identidad),
          rol: rolPrincipal,
          contraseña: password,
          password_hash: password,
          estado: true
        });

        // Asignar relaciones
        if (rolesIds.length) {
          const rolesObj = await Rol.findAll({ where: { id: { [Op.in]: rolesIds } } });
          await usuario.setRoles(rolesObj);
        }
        if (facultadIds.length) {
          const facultadesObj = await Facultad.findAll({ where: { id: { [Op.in]: facultadIds } } });
          await usuario.setFacultades(facultadesObj);
        }
        if (carreraIds.length) {
          const carrerasObj = await Carrera.findAll({ where: { id: { [Op.in]: carreraIds } } });
          await usuario.setCarreras(carrerasObj);
        }
        if (nivelIds.length) {
          const nivelesObj = await Nivel.findAll({ where: { id: { [Op.in]: nivelIds } } });
          await usuario.setNiveles(nivelesObj);
        }
        if (asignaturaIds.length) {
          const asignaturasObj = await Asignatura.findAll({ where: { id: { [Op.in]: asignaturaIds } } });
          await usuario.setAsignaturas(asignaturasObj);
        }

        results.success.push({ 
          id: usuario.id, 
          nombres, 
          apellidos, 
          correo: correo_electronico 
        });

      } catch (error) {
        results.errors.push({ row, error: error.message });
      }
    }

    res.json({
      message: 'Importación completada',
      total: data.length,
      exitosos: results.success.length,
      errores: results.errors.length,
      detalles: results
    });

  } catch (e) {
    res.status(500).json({ message: 'Error al importar usuarios', error: e.message });
  }
};
