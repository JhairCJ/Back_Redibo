// controllers/reservaController.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Función para obtener los datos detallados de un auto a partir de una reserva
 */
async function detallesReservaAuto(idReserva: number) {
  try {
    // Buscar la reserva con todos los datos relacionados
    const reserva = await prisma.reserva.findUnique({
      where: {
        idReserva: idReserva,
      },
      include: {
        auto: {
          include: {
            propietario: true,
          },
        },
        cliente: true,
      },
    });

    if (!reserva) {
      throw new Error("Reserva no encontrada");
    } else if (reserva.estado !== "APROBADA") {
      throw new Error("No se puede realizar el pago de la reserva");
    }

    const auto = reserva.auto;
    const propietario = auto.propietario;

    // Cantidad de dias
    const diffTiempo = Math.abs(
      reserva.fechaFin.getTime() - reserva.fechaInicio.getTime()
    );
    const dias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    // formatear la fecha (formato: día mes año)
    const formatearFecha = (fecha: Date) => {
      const opciones: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "short",
        year: "numeric",
      };
      return fecha.toLocaleDateString("es-ES", opciones).toLowerCase();
    };

    // costos del auto
    const precioDiario = Number(auto.precioRentaDiario);
    const precioTotal = precioDiario * dias;
    const garantia = Number(auto.montoGarantia);
    const total = precioTotal + garantia;

    // Construir el objeto carData
    const carData = {
      titulo: `${auto.marca} ${auto.modelo}`,
      tipo: auto.tipo,
      año: auto.año.toString(),
      precio: precioDiario,
      propietario: `${propietario.nombre} ${propietario.apellido}`,
      calificacion: auto.calificacionPromedio || 0,
      comentarios: auto.totalComentarios,
      descripcion: auto.descripcion || "",
      asientos: auto.asientos,
      transmision: auto.transmision === "AUTOMATICO" ? "Automático" : "Manual",
      reserva: {
        fechaInicio: formatearFecha(reserva.fechaInicio),
        fechaFin: formatearFecha(reserva.fechaFin),
        dias: dias,
      },
      costes: {
        precio: precioDiario,
        dias: dias,
        tarifa: 14, // !aun no se sabe si esto habra
        garantia: garantia,
        total: total,
      },
      imagenes: {
        galeria: [], //auto.imagenes ? JSON.parse(auto.imagenes) : []
      },
    };

    return carData;
  } catch (error) {
    console.error("Error al obtener detalles de la reserva:", error);
    throw error;
  }
}

export const obtenerDetallesReservaAuto = async (
  req: Request,
  res: Response
) => {
  try {
    const idReserva = parseInt(req.params.idReserva);

    // Verificamos que el ID sea un número válido
    if (isNaN(idReserva)) {
      return res.status(400).json({
        error: "El ID de reserva debe ser un número válido",
      });
    }

    // Llamamos a nuestra función para obtener los detalles
    const datosReserva = await detallesReservaAuto(idReserva);

    // Devolvemos los datos en formato JSON
    res.json(datosReserva);
  } catch (error: any) {
    console.error("Error al obtener detalles de reserva:", error);

    // Error de reserva no encontrada
    if (error.message === "Reserva no encontrada") {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    // Error de reserva que no esta en estado aprobada
    if (error.message === "No se puede realizar el pago de la reserva") {
      return res.status(403).json({ error: "No se puede realizar el pago de la reserva" });
    }

    res.status(500).json({
      error: "Error al procesar la solicitud",
      mensaje: error.message,
    });
  }
};

/**
 * Obtiene todas las reservas solicitadas de los autos de un propietario específico
  */

async function obtenerSolicitudes(idPropietario: number) {
  try {
    // Buscar todos los autos del propietario
    const autos = await prisma.auto.findMany({
      where: {
        idPropietario: idPropietario,
      },
      include: {
        reservas: {
          where: {
            estado: 'SOLICITADA',
          },
          include: {
            cliente: true,
          },
          orderBy: {
            fechaSolicitud: 'desc',
          },
        },
      },
    });

    if (autos.length === 0) {
      return {
        autos: [],
        cantidad: 0,
      };
    }

    // Formatear los datos de cada auto con sus solicitudes pendientes
    const autosFormateados = autos.map((auto) => {
      // Formatear la fecha para cada solicitud (formato: día mes)
      const formatearFechaRango = (fechaInicio: Date, fechaFin: Date) => {
        const opcionesMes: Intl.DateTimeFormatOptions = {
          day: 'numeric',
          month: 'short',
        };
        const inicio = fechaInicio.toLocaleDateString('es-ES', opcionesMes);
        const fin = fechaFin.toLocaleDateString('es-ES', opcionesMes);
        return `${inicio} - ${fin}`;
      };

      // Mapear cada solicitud pendiente
      const solicitudesPendientes = auto.reservas.map((reserva) => {
        return {
          idReserva: reserva.idReserva.toString(),
          nombreSolicitante: `${reserva.cliente.nombre} ${reserva.cliente.apellido}`,
          fechas: formatearFechaRango(reserva.fechaInicio, reserva.fechaFin),
        };
      });

      // Verificar si el auto está actualmente rentado
      const fechaActual = new Date();
      const estaRentado = auto.reservas.some(
        (reserva) =>
          reserva.estado === 'APROBADA' &&
          fechaActual >= reserva.fechaInicio &&
          fechaActual <= reserva.fechaFin
      );

      // Construir el objeto de auto con sus solicitudes
      return {
        idAuto: auto.idAuto.toString(),
        nombre: `${auto.marca} ${auto.modelo} ${auto.año}`,
        placa: auto.placa,
        precioPorDia: Number(auto.precioRentaDiario),
        imagen: [],
        solicitudesPendientes: solicitudesPendientes,
        estaRentado: estaRentado,
      };
    });

    return {
      autos: autosFormateados,
      cantidad: autosFormateados.length,
    };
  } catch (error) {
    console.error('Error al obtener autos del propietario:', error);
    throw error;
  }
}

/**
 * Controlador para manejar la solicitud HTTP y devolver las reservas solicitadas
 */
export const obtenerSolicitudesDeReserva = async (req: Request, res: Response) => {
  try {
    const idPropietario = parseInt(req.params.idPropietario);
    
    // Verificar que el ID sea un número válido
    if (isNaN(idPropietario)) {
      return res.status(400).json({ 
        error: 'El ID del propietario debe ser un número válido' 
      });
    }
    
    // Verificar que el propietario existe
    const propietario = await prisma.usuario.findUnique({
      where: { idUsuario: idPropietario }
    });
    
    if (!propietario) {
      return res.status(404).json({ error: 'Propietario no encontrado' });
    }
    
    // Obtenemos las reservas solicitadas
    const datosReservas = await obtenerSolicitudes(idPropietario);
    
    // Devolvemos los datos en formato JSON
    res.json(datosReservas);
  } catch (error: any) {
    console.error('Error al obtener reservas solicitadas:', error);
    
    res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      mensaje: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Función para aceptar una reserva cambiando su estado a 'APROBADA'
 */

export const aceptarReserva = async (req: Request, res: Response) => {
  try {
    const idReserva = parseInt(req.params.idReserva);

    // Verificamos que el ID sea un número válido
    if (isNaN(idReserva)) {
      return res.status(400).json({
        error: "El ID de reserva debe ser un número válido",
      });
    }

    // Buscar la reserva para verificar que existe
    const reservaExistente = await prisma.reserva.findUnique({
      where: {
        idReserva: idReserva,
      },
    });

    if (!reservaExistente) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    } else if (reservaExistente.estado !== "SOLICITADA") {
      return res.status(400).json({
        error: "Esta reserva ya fue procesada previamente",
      });
    }
    // Actualizar el estado de la reserva a 'APROBADA'
    const reservaActualizada = await prisma.reserva.update({
      where: {
        idReserva: idReserva,
      },
      data: {
        estado: "APROBADA",
      },
    });

    res.json({
      message: "Reserva aprobada exitosamente",
      reserva: {
        idReserva: reservaActualizada.idReserva,
        estado: reservaActualizada.estado,
        fechaInicio: reservaActualizada.fechaInicio,
        fechaFin: reservaActualizada.fechaFin,
      },
    });
  } catch (error: any) {
    console.error("Error al aceptar la reserva:", error);
    res.status(500).json({
      error: "Error al procesar la solicitud de aprobación",
      mensaje: error.message,
    });
  }
};

/**
 * Función para denegar una reserva cambiando su estado a 'RECHAZADA'
 */

export const denegarReserva = async (req: Request, res: Response) => {
  try {
    const idReserva = parseInt(req.params.idReserva);

    // Verificamos que el ID sea un número válido
    if (isNaN(idReserva)) {
      return res.status(400).json({
        error: "El ID de reserva debe ser un número válido",
      });
    }

    // Buscar la reserva para verificar que existe
    const reservaExistente = await prisma.reserva.findUnique({
      where: {
        idReserva: idReserva,
      },
    });

    if (!reservaExistente) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    } else if (reservaExistente.estado !== "SOLICITADA") {
      return res.status(400).json({
        error: "Esta reserva ya fue procesada previamente",
      });
    }

    // Actualizar el estado de la reserva a 'RECHAZADA'
    const reservaActualizada = await prisma.reserva.update({
      where: {
        idReserva: idReserva,
      },
      data: {
        estado: "RECHAZADA",
        // Si tu modelo tiene un campo para almacenar el motivo del rechazo, podrías incluirlo aquí
        // motivoRechazo: motivoRechazo || "Sin especificar",
      },
    });

    res.json({
      message: "Reserva rechazada exitosamente",
      reserva: {
        idReserva: reservaActualizada.idReserva,
        estado: reservaActualizada.estado,
        fechaInicio: reservaActualizada.fechaInicio,
        fechaFin: reservaActualizada.fechaFin,
      },
    });
  } catch (error: any) {
    console.error("Error al rechazar la reserva:", error);
    res.status(500).json({
      error: "Error al procesar la solicitud de rechazo",
      mensaje: error.message,
    });
  }
};