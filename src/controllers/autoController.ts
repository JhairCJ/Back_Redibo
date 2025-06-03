import { Request, Response } from "express";
import { isValid, parseISO } from "date-fns";
import { PrismaClient} from '@prisma/client';
const prisma = new PrismaClient();

export const getAutos = async (req: Request, res: Response) => {
  try {
    const autos = await prisma.auto.findMany({
      include: {
        imagenes: true,
        ubicacion: true,
        comentarios: {
          select: {
            calificacion: true,
          }
        }
      },
    });

    const autosConPromedio = autos.map(auto => {
      let promedioCalificacion = 0;
      const comentarios = auto.comentarios || [];

      if (comentarios.length > 0) {
        const sumaCalificaciones = comentarios.reduce((suma, comentario) => suma + comentario.calificacion, 0);
        promedioCalificacion = sumaCalificaciones / comentarios.length;
      }

      return {
        ...auto,
        promedioCalificacion: Number(promedioCalificacion.toFixed(1)),
      };
    });
    
    res.status(200).json({
      success: true,
      data: autosConPromedio,
    });
    
  } catch (error) {
    console.error("Error en getAutos:", error);
    res.status(500).json({
      success: false,
      message: "Error en obtener los autos",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

export const getAutoId = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
  
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "ID inválido proporcionado.",
      });
      return;
    }
  
    try {
      const auto = await prisma.auto.findUnique({
        where: {
          idAuto: id,
        },
        include: {
          propietario: {
            select: {
              idUsuario: true,
              nombreCompleto: true,
              telefono: true,
              email: true, 
              direccion: true,
            },
          },
          imagenes: true,
        },
      });
  
      if (!auto) {
        res.status(404).json({
          success: false,
          message: "Auto no encontrado.",
        });
        return;
      }
  
      res.status(200).json({
        success: true,
        data: auto,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener el auto.",
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  };

export const getComentarios = async (req: Request, res: Response): Promise<void> => {
    const autoId = parseInt(req.params.id, 10);
  
    if (isNaN(autoId)) {
      res.status(400).json({
        success: false,
        message: "ID inválido proporcionado.",
      });
      return;
    }
  
    try {
      const comentarios = await prisma.comentario.findMany({
        where: {
          idAuto: autoId,
        },
        include: {
          usuario: {
            select: {
              idUsuario: true,
              nombreCompleto: true,
            },
          },
        },
        orderBy: {
          fechaCreacion: 'desc',
        }
      });
  
      res.status(200).json({
        success: true,
        data: comentarios, 
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener los comentarios del auto.",
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  };


export const getHost = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { inicio, fin } = req.params;

  const fechaInicio = parseISO(inicio);
  const fechaFin = parseISO(fin);

  if (!isValid(fechaInicio) || !isValid(fechaFin) || fechaInicio > fechaFin) {
    res.status(400).json({
      success: false,
      message: "Fechas inválidas o fuera de rango.",
    });
    return;
  }

  try {
    const fechaInicio = parseISO(inicio).toISOString().split("T")[0];
    const fechaFin = parseISO(fin).toISOString().split("T")[0];
    const host = await prisma.usuario.findUnique({
      where: { idUsuario: id },
      include: {
        autos: {
          select: {
            idAuto: true,
            modelo: true,
            marca: true,
            precioRentaDiario: true,
            calificacionPromedio:true,
            imagenes:true,
            reservas: {
              where: {
                estado: "CONFIRMADA" ,
                fechaInicio: { lte: new Date(`${fechaFin}T23:59:59.999Z`) } ,
                fechaFin: { gte: new Date(`${fechaInicio}T00:00:00.000Z`) } ,
              },
            },
            disponibilidad: {
              where: {
                fechaInicio: { lte: new Date(`${fechaFin}T23:59:59.999Z`) },
                fechaFin: { gte: new Date(`${fechaInicio}T00:00:00.000Z`) },
              },
            },
          },
        },
      },
    });

    if (!host || !host.esAdmin) {
      res.status(400).json({
        success: false,
        message: "El usuario no es un host válido.",
      });
      return;
    }

      const autosConDisponibilidad = host.autos.map(auto => {
      const tieneReserva = auto.reservas.length > 0;
      const noDisponible = auto.disponibilidad.length > 0;
      const disponible = !tieneReserva && !noDisponible;

      return {
        idAuto: auto.idAuto,
        modelo: auto.modelo,
        marca: auto.marca,
        precio: auto.precioRentaDiario,
        calificacionPromedio: auto.calificacionPromedio,
        imagenes: auto.imagenes,
        disponible,
      };
    });

    res.status(200).json({
      success: true,
      host: {
        ...host,
        autos: autosConDisponibilidad,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener la información del host.",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};


export const getAutosDisponiblesPorFecha = async (req: Request, res: Response): Promise<void> => {
  const { inicio, fin } = req.params;

  const fechaInicio = parseISO(inicio);
  const fechaFin = parseISO(fin);

  if (!isValid(fechaInicio) || !isValid(fechaFin) || fechaInicio > fechaFin) {
    res.status(400).json({
      success: false,
      message: "Fechas inválidas o fuera de rango.",
    });
    return;
  }

  try {
    const fechaInicio = parseISO(inicio).toISOString().split("T")[0];
    const fechaFin = parseISO(fin).toISOString().split("T")[0];
    const autosDisponibles = await prisma.auto.findMany({
      where: {
        disponibilidad: {
          none: {
            AND: [
              {
                fechaInicio: { lte: new Date(`${fechaFin}T23:59:59.999Z`) },
              },
              {
                fechaFin: { gte: new Date(`${fechaInicio}T00:00:00.000Z`) },
              },
            ],
          },
        },
        reservas: {
          none: {
            AND: [
              { estado: "CONFIRMADA" },
              { fechaInicio: { lte: new Date(`${fechaFin}T23:59:59.999Z`) } },
              { fechaFin: { gte: new Date(`${fechaInicio}T00:00:00.000Z`) } },
            ],
          },
        },
      },
        select: {
          idAuto: true,
          marca:true,
          modelo:true,
          capacidadMaletero:true,
          asientos:true,
          transmision:true,
          combustible:true,
          kilometraje:true,
          precioRentaDiario:true,
          calificacionPromedio:true,
          imagenes:true,
        },
      });
  
      res.status(200).json({
        success: true,
        data: autosDisponibles,
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener autos disponibles.",
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  };

  export const getDrivers = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id, 10);
  
      if (isNaN(userId)) {
        res.status(400).json({ error: 'ID de usuario inválido' });
        return;
      }
  
      const usuario = await prisma.usuario.findUnique({
        where: { idUsuario: userId },
        include: {
          driversAsignados: {
            include: {
              driver: true,
            },
          },
        },
      });
  
      if (!usuario) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }
  
      const drivers = usuario.driversAsignados.map((asignacion) => asignacion.driver);
  
      res.status(200).json(drivers);
    } catch (error) {
      console.error('Error al obtener los drivers:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
  
export const getUsuarios = async (req: Request, res: Response) => {
  try {
    // Consulta a la base de datos usando Prisma
    const usuarios = await prisma.usuario.findMany({
      select: {
        idUsuario: true,
        nombreCompleto: true,
        email: true,
        telefono: true,
        fechaRegistro: true,
        esAdmin: true,
      },
    });

    res.status(200).json({
      success: true,
      data: usuarios,
    });
  } catch (error) {
    console.error("Error en getUsuarios:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los usuarios",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

export const getUsuarioId = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
  
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "ID inválido proporcionado.",
      });
      return;
    }
  
    try {
      const usuario = await prisma.usuario.findUnique({
        where: {
          idUsuario: id,
        }
      });
  
      if (!usuario) {
        res.status(404).json({
          success: false,
          message: "Usuario no encontrado.",
        });
        return;
      }
  
      res.status(200).json({
        success: true,
        data: usuario,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener el usuario",
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  };

export const getCalificacionesHost = async (req: Request, res: Response): Promise<void> => {
  const hostId = parseInt(req.params.id, 10);

  if (isNaN(hostId)) {
    res.status(400).json({
      success: false,
      message: "ID del host inválido proporcionado.",
    });
    return;
  }

  try {
    // Verificar que el usuario existe y es un host
    const host = await prisma.usuario.findUnique({
      where: { idUsuario: hostId },
      select: { host: true },
    });

    if (!host) {
      res.status(404).json({
        success: false,
        message: "El usuario no existe.",
      });
      return;
    }

    if (!host.host) {
      res.status(403).json({
        success: false,
        message: "El usuario no tiene permisos de host.",
      });
      return;
    }

    // Obtener las calificaciones dirigidas al host
    const calificaciones = await prisma.calificacionUsuario.findMany({
      where: { idCalificado: hostId },
      select: {
        idCalificacion: true, // 👈 Agrega esto
        idCalificador: true,
        comentario: true,
        puntuacion: true,
        fechaCreacion: true,
        calificador: {
          select: {
            idUsuario: true,
            nombreCompleto: true
          },
        },
      },
      orderBy: {
        fechaCreacion: "desc",
      },
    });


    res.status(200).json({
      success: true,
      data: calificaciones.map((calificacion) => ({
        idCalificacion: calificacion.idCalificacion, // 👈 Correcto aquí
        idCalificador: calificacion.idCalificador,
        nombre: calificacion.calificador.nombreCompleto,
        comentario: calificacion.comentario,
        puntuacion: calificacion.puntuacion,
        fechaCreacion: calificacion.fechaCreacion,
      })),
    });


  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener las calificaciones del host.",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

export const getHostSinFiltroFechas = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: "ID del host inválido proporcionado.",
    });
    return;
  }

  try {
    const host = await prisma.usuario.findUnique({
      where: { idUsuario: id },
      include: {
        autos: {
          select: {
            idAuto: true,
            modelo: true,
            marca: true,
            precioRentaDiario: true,
            calificacionPromedio: true,
            imagenes: true,
          },
        },
      },
    });

    if (!host || !host.host) {
      res.status(404).json({
        success: false,
        message: "El usuario no es un host o no existe.",
      });
      return;
    }

    const autosConDatos = host.autos.map(auto => ({
      idAuto: auto.idAuto,
      modelo: auto.modelo,
      marca: auto.marca,
      precio: auto.precioRentaDiario,
      calificacionPromedio: auto.calificacionPromedio,
      imagenes: auto.imagenes,
      disponible: true,
    }));

    res.status(200).json({
      success: true,
      host: {
        ...host,
        autos: autosConDatos,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener los autos del host.",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

// Función para marcar auto como Activo
async function marcarAutoComoActivo(idAuto: number) {
  return await prisma.auto.update({
    where: { idAuto: idAuto },
    data: { estado: 'ACTIVO' }
  });
}

// Controlador para manejar la solicitud de marcar un auto como activo
export const marcarActivo = async (req: Request, res: Response) => {
  try {
    const idAuto = parseInt(req.params.idAuto);
    
    // Validar id del auto
    if (isNaN(idAuto)) {
      return res.status(400).json({ error: 'ID de auto inválido' });
    }
    
    const autoActualizado = await marcarAutoComoActivo(idAuto);
    
    return res.status(200).json({
      mensaje: 'Auto marcado como activo exitosamente',
      auto: autoActualizado
    });
    
  } catch (error: any) {
    console.error('Error al marcar auto como activo:', error);
    
    // Manejar y devolver errores especificos
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Auto no encontrado' });
    }
    
    return res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

// Función para marcar auto como inactivo
async function marcarAutoComoInactivo(idAuto: number) {
  return await prisma.auto.update({
    where: { idAuto: idAuto },
    data: { estado: 'INACTIVO' }
  });
}

// Controlador para manejar la solicitud de marcar un auto como inactivo
export const marcarInactivo = async (req: Request, res: Response) => {
  try {
    const autoId = parseInt(req.params.id);
    
    // Validar id del auto
    if (isNaN(autoId)) {
      return res.status(400).json({ error: 'ID de auto inválido' });
    }
    
    const autoActualizado = await marcarAutoComoInactivo(autoId);
    
    return res.status(200).json({
      mensaje: 'Auto marcado como inactivo exitosamente',
      auto: autoActualizado
    });
    
  } catch (error: any) {
    console.error('Error al marcar auto como inactivo:', error);
    
    // Manejar y devolver errores especificos
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Auto no encontrado' });
    }
    
    return res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

// Función para poner un auto en mantenimiento
async function ponerAutoEnMantenimiento(
  idAuto: number, 
  data: {
    descripcion?: string, 
    tipoMantenimiento: 'PREVENTIVO' | 'CORRECTIVO' | 'REVISION', 
    kilometraje: number,
    costo?: number,
    fechaInicio?: Date,
    fechaFin?: Date
  }
) {
  return await prisma.$transaction(async (tx) => {
    // Crear registro de mantenimiento
    const mantenimiento = await tx.historialMantenimiento.create({
      data: {
        idAuto: idAuto,
        descripcion: data.descripcion || 'Mantenimiento general',
        fechaInicio: data.fechaInicio || new Date(),
        fechaFin: data.fechaFin ?? null, // Puede ser null para mantenimiento indefinido
        tipoMantenimiento: data.tipoMantenimiento,
        kilometraje: data.kilometraje,
        costo: data.costo ? data.costo : null
      }
    });

    // Crear registro de no disponibilidad
    await tx.disponibilidad.create({
      data: {
        idAuto: idAuto,
        fechaInicio: data.fechaInicio || new Date(),
        fechaFin: data.fechaFin || new Date(0),
        motivo: 'MANTENIMIENTO',
        descripcion: data.descripcion || 'Mantenimiento del vehículo'
      }
    });

    // Marcar auto como inactivo
    await tx.auto.update({
      where: { idAuto: idAuto },
      data: { estado: 'INACTIVO' }
    });

    return mantenimiento;
  });
}

// Controlador para poner un auto en mantenimiento
export const ponerEnMantenimiento = async (req: Request, res: Response) => {
  try {
    const idAuto = parseInt(req.params.idAuto);
    const { 
      descripcion, 
      tipoMantenimiento, 
      kilometraje, 
      costo, 
      fechaInicio, 
      fechaFin 
    } = req.body;
    
    // Validaciones
    if (isNaN(idAuto)) {
      return res.status(400).json({ error: 'ID de auto inválido' });
    }

    if (!tipoMantenimiento || !['PREVENTIVO', 'CORRECTIVO', 'REVISION'].includes(tipoMantenimiento)) {
      return res.status(400).json({ error: 'Tipo de mantenimiento inválido' });
    }

    if (!kilometraje || kilometraje <= 0) {
      return res.status(400).json({ error: 'Kilometraje inválido' });
    }

    // Verificar que el auto exista antes de ponerlo en mantenimiento
    const autoExistente = await prisma.auto.findUnique({
      where: { idAuto: idAuto }
    });

    if (!autoExistente) {
      return res.status(404).json({ error: 'Auto no encontrado' });
    }

    // Poner el auto en mantenimiento
    const mantenimiento = await ponerAutoEnMantenimiento(idAuto, {
      descripcion,
      tipoMantenimiento,
      kilometraje,
      costo,
      fechaInicio,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined
    });
    
    return res.status(200).json({
      mensaje: 'Auto puesto en mantenimiento exitosamente',
      mantenimiento: mantenimiento
    });
    
  } catch (error: any) {
    console.error('Error al poner auto en mantenimiento:', error);

    return res.status(500).json({
      error: 'Error al procesar la solicitud de mantenimiento',
      detalle: error.message || error.toString()
    });
  }
};

// Controlador para finalizar mantenimiento de un auto
export const finalizarMantenimiento = async (req: Request, res: Response) => {
  try {
    const idHistorial = parseInt(req.params.idHistorial);
    
    // Validar id del historial de mantenimiento
    if (isNaN(idHistorial)) {
      return res.status(400).json({ error: 'ID de historial de mantenimiento inválido' });
    }

    // Transacción para finalizar mantenimiento
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar registro de mantenimiento
      const mantenimiento = await tx.historialMantenimiento.update({
        where: { idHistorial: idHistorial },
        data: { 
          fechaFin: new Date() 
        },
        include: {
          auto: true
        }
      });

      // Buscar el registro de disponibilidad relacionado
      const disponibilidad = await tx.disponibilidad.findFirst({
        where: { 
          idAuto: mantenimiento.idAuto, 
          motivo: 'MANTENIMIENTO' 
        }
      });
      const fechaBolivia = new Date(Date.now() - (4 * 60 * 60 * 1000));
      
      // Actualizar registro de disponibilidad
      if (disponibilidad) {
        await tx.disponibilidad.update({
          where: { idDisponibilidad: disponibilidad.idDisponibilidad },
          data: { fechaFin: fechaBolivia }
        });
      }

      // Marcar el auto como activo nuevamente
      const autoActualizado = await tx.auto.update({
        where: { idAuto: mantenimiento.idAuto },
        data: { estado: 'ACTIVO' }
      });

      return { mantenimiento, autoActualizado };
    });
    
    return res.status(200).json({
      mensaje: 'Mantenimiento finalizado exitosamente',
      ...resultado
    });
    
  } catch (error: any) {
    console.error('Error al finalizar mantenimiento:', error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Registro de mantenimiento no encontrado' });
    }
    
    return res.status(500).json({ error: 'Error al procesar la solicitud de finalización de mantenimiento' });
  }
};

// Función para obtener todos los autos de un propietario con su estado actual (Gestionar vehiculos)
async function obtenerAutosPropietario(idPropietario: number) {
  // Obtener la fecha actual para comparar con las reservas y mantenimientos
  const fechaActual = new Date();

  // Obtener todos los autos del propietario
  const autos = await prisma.auto.findMany({
    where: {
      idPropietario: idPropietario
    },
    include: {
      // Incluir las reservas activas (no finalizadas)
      reservas: {
        where: {
          OR: [
            { estado: 'CONFIRMADA' },
            { estado: 'EN_CURSO' },
            { estado: 'APROBADA' }
          ]
        },
        orderBy: {
          fechaInicio: 'asc'
        },
        include: {
          cliente: {
            select: {
              idUsuario: true,
              nombreCompleto: true,
              email: true,
              telefono: true
            }
          }
        }
      },
      // Incluir mantenimientos actuales
      historialMantenimiento: {
        where: {
          OR: [
            { fechaFin: null },
            { fechaFin: { gte: fechaActual } }
          ],
          fechaInicio: { lte: fechaActual }
        },
        orderBy: {
          fechaInicio: 'asc'
        }
      },
      // Incluir disponibilidad (periodos en los que no está disponible)
      disponibilidad: {
        where: {
          fechaInicio: { lte: fechaActual },
          fechaFin: { gte: fechaActual }
        }
      },
      // Incluir información de ubicación
      ubicacion: true
    }
  });

  // Transformar los datos para agregar información de estado
  const autosConEstado = autos.map(auto => {
    // Identificar si hay una reserva en estado EN_CURSO con fecha fin pasada (necesita ser liberada)
    const reservaParaLiberar = auto.reservas.find(
      reserva => reserva.estado === 'EN_CURSO' && new Date(reserva.fechaFin) < fechaActual
    );
    
    // Si hay una reserva para liberar, es prioridad mostrarla
    if (reservaParaLiberar) {
      return {
        ...auto,
        reservas: undefined,
        historialMantenimiento: undefined,
        disponibilidad: undefined,
        estadoActual: {
          tipo: 'RENTA_FINALIZADA_POR_LIBERAR',
          datos: {
            idReserva: reservaParaLiberar.idReserva,
            fechaInicio: reservaParaLiberar.fechaInicio,
            fechaFin: reservaParaLiberar.fechaFin,
            estado: reservaParaLiberar.estado,
            cliente: reservaParaLiberar.cliente,
            accionPosible: 'FINALIZAR_RENTA'
          }
        }
      };
    }

    // Verificar otras condiciones si no hay reserva para liberar
    // Filtrar las reservas que siguen vigentes (fechaFin >= fechaActual)
    const reservasVigentes = auto.reservas.filter(reserva => 
      new Date(reserva.fechaFin) >= fechaActual
    );
    
    // Verificar si el auto está en una renta activa vigente
    const rentaActiva = reservasVigentes.length > 0 ? reservasVigentes[0] : null;
    
    // Verificar si el auto está en mantenimiento
    const mantenimientoActivo = auto.historialMantenimiento.length > 0 ? 
      auto.historialMantenimiento[0] : null;
    
    // Verificar si el auto está en periodo de no disponibilidad
    const periodoNoDisponible = auto.disponibilidad.length > 0 ? 
      auto.disponibilidad[0] : null;

    // Determinar el estado actual del auto
    let estadoActual = null;
    if (rentaActiva) {
      estadoActual = {
        tipo: 'RENTA_ACTIVA',
        datos: {
          idReserva: rentaActiva.idReserva,
          fechaInicio: rentaActiva.fechaInicio,
          fechaFin: rentaActiva.fechaFin,
          estado: rentaActiva.estado,
          cliente: rentaActiva.cliente,
          accionPosible: rentaActiva.estado === 'EN_CURSO' ? 'FINALIZAR_RENTA' : 'CANCELAR_RESERVA'
        }
      };
    } else if (mantenimientoActivo) {
      estadoActual = {
        tipo: 'EN_MANTENIMIENTO',
        datos: {
          idHistorial: mantenimientoActivo.idHistorial,
          fechaInicio: mantenimientoActivo.fechaInicio,
          fechaFinPrevista: mantenimientoActivo.fechaFin,
          tipoMantenimiento: mantenimientoActivo.tipoMantenimiento,
          descripcion: mantenimientoActivo.descripcion,
          accionPosible: 'FINALIZAR_MANTENIMIENTO'
        }
      };
    } else if (periodoNoDisponible) {
      estadoActual = {
        tipo: 'NO_DISPONIBLE',
        datos: {
          idDisponibilidad: periodoNoDisponible.idDisponibilidad,
          fechaInicio: periodoNoDisponible.fechaInicio,
          fechaFin: periodoNoDisponible.fechaFin,
          motivo: periodoNoDisponible.motivo,
          descripcion: periodoNoDisponible.descripcion,
          accionPosible: 'FINALIZAR_PERIODO_NO_DISPONIBLE'
        }
      };
    } else {
      estadoActual = {
        tipo: 'DISPONIBLE',
        datos: {
          accionPosible: auto.estado === 'ACTIVO' ? 'MARCAR_NO_DISPONIBLE' : 'MARCAR_DISPONIBLE'
        }
      };
    }

    // Retornar el auto con su estado actual
    return {
      ...auto,
      reservas: undefined, // Quitamos los arrays originales para evitar duplicación
      historialMantenimiento: undefined,
      disponibilidad: undefined,
      estadoActual
    };
  });

  return autosConEstado;
}

// Controlador para manejar la solicitud de obtener autos de un propietario
export const obtenerAutosDelPropietario = async (req: Request, res: Response) => {
  try {
    const idPropietario = parseInt(req.params.idArrendador);
    
    // Validar id del propietario
    if (isNaN(idPropietario)) {
      return res.status(400).json({ error: 'ID de propietario inválido' });
    }
    
    // Verificar si el propietario existe
    const propietarioExiste = await prisma.usuario.findUnique({
      where: { idUsuario: idPropietario }
    });
    
    if (!propietarioExiste) {
      return res.status(404).json({ error: 'Propietario no encontrado' });
    }
    
    const autos = await obtenerAutosPropietario(idPropietario);
    
    return res.status(200).json({
      cantidad: autos.length,
      autos: autos
    });
    
  } catch (error: any) {
    console.error('Error al obtener autos del propietario:', error);
    
    return res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      detalle: error.message 
    });
  }
};

// Función para liberar un auto de una renta en curso
async function liberarAutoDeRenta(idReserva: number) {
  // Obtener la fecha actual
  const fechaActual = new Date();

  // Buscar la reserva para verificar que exista y su estado
  const reserva = await prisma.reserva.findUnique({
    where: { idReserva },
    include: {
      auto: true
    }
  });

  // Verificar si la reserva existe
  if (!reserva) {
    throw new Error('Reserva no encontrada');
  }

  // Verificar que la reserva esté en estado "EN_CURSO"
  if (reserva.estado !== 'EN_CURSO') {
    throw new Error(`No se puede liberar una reserva con estado: ${reserva.estado}`);
  }

  // Verificar que la fecha actual sea posterior a la fecha de finalización de la reserva
  if (fechaActual < reserva.fechaFin) {
    throw new Error('No se puede finalizar la reserva antes de la fecha acordada');
  }

  // Actualizar la reserva a estado "FINALIZADA" en una transacción
  return await prisma.$transaction(async (tx) => {
    // Actualizar el estado de la reserva
    const reservaActualizada = await tx.reserva.update({
      where: { idReserva },
      data: { 
        estado: 'FINALIZADA',
        kilometrajeFinal: reserva.auto.kilometraje // Guardar el kilometraje final del auto
      },
      include: {
        auto: true,
        cliente: {
          select: {
            idUsuario: true,
            nombreCompleto: true,
            email: true,
            telefono: true
          }
        }
      }
    });

    // Actualizar las estadísticas del vehículo
    // Calculamos la duración de la renta en días
    const duracionRenta = Math.ceil(
      (reserva.fechaFin.getTime() - reserva.fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
    );

    await tx.auto.update({
      where: { idAuto: reserva.idAuto },
      data: {
        diasTotalRenta: {
          increment: duracionRenta
        },
        vecesAlquilado: {
          increment: 1
        }
      }
    });
    {/**
    // Crear notificación para el propietario del auto
    await tx.notificacion.create({
      data: {
        idUsuario: reserva.auto.idPropietario,
        titulo: 'Alquiler finalizado',
        mensaje: `La reserva del auto ${reserva.auto.marca} ${reserva.auto.modelo} ha finalizado.`,
        idEntidad: idReserva.toString(),
        tipoEntidad: 'RESERVA',
        tipo: 'ALQUILER_FINALIZADO',
        prioridad: 'MEDIA'
      }
    });

    // Crear notificación para el cliente
    await tx.notificacion.create({
      data: {
        idUsuario: reserva.idCliente,
        titulo: 'Alquiler finalizado',
        mensaje: `Tu alquiler del auto ${reserva.auto.marca} ${reserva.auto.modelo} ha finalizado.`,
        idEntidad: idReserva.toString(),
        tipoEntidad: 'RESERVA',
        tipo: 'ALQUILER_FINALIZADO',
        prioridad: 'MEDIA'
      }
    }); */}

    return reservaActualizada;
  });
}

// Controlador para manejar la solicitud de liberar un auto de una renta
export const liberarAuto = async (req: Request, res: Response) => {
  try {
    const idReserva = parseInt(req.params.idReserva);
    
    // Validar id de la reserva
    if (isNaN(idReserva)) {
      return res.status(400).json({ error: 'ID de reserva inválido' });
    }
    
    const reservaFinalizada = await liberarAutoDeRenta(idReserva);
    
    return res.status(200).json({
      mensaje: 'Auto liberado de renta exitosamente',
      reserva: reservaFinalizada
    });
    
  } catch (error: any) {
    console.error('Error al liberar auto de renta:', error);
    
    // Manejar y devolver errores específicos
    if (error.message === 'Reserva no encontrada') {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    
    if (error.message.includes('No se puede liberar') || 
        error.message.includes('No se puede finalizar')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    return res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      detalle: error.message || error.toString()
    });
  }
};
