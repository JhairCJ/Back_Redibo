// src/controllers/comentarioController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// En tu controlador de comentarios (comentarioController.ts)
export const obtenerComentariosPorAuto = async (req: Request, res: Response) => {
  const idAuto = parseInt(req.params.idAuto);

  if (isNaN(idAuto)) {
    return res.status(400).json({ error: "ID de auto no válido" });
  }

  try {
    const comentarios = await prisma.comentario.findMany({
      where: { idAuto },
      orderBy: { fechaCreacion: "desc" },
      select: {
        usuario: {
          select: {
            nombreCompleto: true,
          },
        },
        contenido: true,
        calificacion: true,
        fechaCreacion: true,
      },
    });

    const totalComentarios = comentarios.length;
    const promedioCalificacion = totalComentarios > 0 
      ? comentarios.reduce((sum, c) => sum + c.calificacion, 0) / totalComentarios
      : 0;

    const comentariosFormateados = comentarios.map((c) => ({
      autor: c.usuario.nombreCompleto,
      contenido: c.contenido,
      puntuacion: c.calificacion,
      fecha: c.fechaCreacion,
    }));

    res.json({
      comentarios: comentariosFormateados,
      promedioCalificacion: parseFloat(promedioCalificacion.toFixed(1)),
      totalComentarios
    });
  } catch (error) {
    console.error("Error al obtener comentarios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};