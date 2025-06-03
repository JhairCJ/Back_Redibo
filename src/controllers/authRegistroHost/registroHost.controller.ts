import { Request, Response } from "express";
import { registrarHostCompleto } from "../../services/pago.service";

export const registrarHostCompletoController = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = req.user as { idUsuario: number };
    const {
      placa,
      soat,
      // Datos adicionales del auto que faltan
      marca,
      modelo,
      descripcion,
      precioRentaDiario,
      montoGarantia,
      tipo: tipoAuto,
      año,
      color,
      asientos,
      capacidadMaletero,
      transmision,
      combustible,
      idUbicacion,
      // Datos de pago
      tipo: tipoPago,
      numero_tarjeta: numeroTarjeta,
      fecha_expiracion: fechaExpiracion,
      cvv,
      titular,
      detalles_metodo: detallesMetodo,
    } = req.body;

    console.log('📋 Datos recibidos:', req.body);
    console.log('📁 Archivos recibidos:', req.files);

    // Obtener las imágenes del auto
    const imagenes = (req.files as any)?.imagenes || [];
    const qrImage = (req.files as any)?.qrImage?.[0];

    // Validaciones básicas
    if (!placa || !soat) {
      res.status(400).json({ message: "Placa y SOAT son requeridos" });
      return;
    }

    if (imagenes.length < 1) {
      res.status(400).json({ message: "Se requiere al menos una imagen del vehículo" });
      return;
    }

    let ubicacionId = parseInt(idUbicacion) || 1; // Usar ubicación por defecto

    // Mapear el tipo de pago
    const tipoFinal = 
      tipoPago === "TARJETA_DEBITO" ? "TARJETA_DEBITO" : 
      tipoPago === "QR" ? "QR" : 
      tipoPago === "EFECTIVO" ? "EFECTIVO" : null;

    if (!tipoFinal) {
      res.status(400).json({ message: "Tipo de método de pago inválido" });
      return;
    }

    // Llamar al servicio
    const resultado = await registrarHostCompleto({
      idPropietario: usuario.idUsuario,
      // Datos del auto
      placa,
      soat,
      marca: marca || "No especificada",
      modelo: modelo || "No especificado", 
      descripcion: descripcion || "Auto disponible para renta",
      precioRentaDiario: parseFloat(precioRentaDiario) || 50.00,
      montoGarantia: parseFloat(montoGarantia) || 200.00,
      tipoAuto: tipoAuto || "SEDAN",
      año: parseInt(año) || new Date().getFullYear(),
      color: color || "No especificado",
      asientos: parseInt(asientos) || 5,
      capacidadMaletero: parseInt(capacidadMaletero) || 400,
      transmision: transmision || "MANUAL",
      combustible: combustible || "GASOLINA",
      idUbicacion: ubicacionId,
      imagenes: imagenes.map((f: any) => f.filename),
      // Datos de pago
      tipo: tipoFinal,
      numeroTarjeta,
      fechaExpiracion,
      titular,
      imagenQr: qrImage?.filename,
      detallesMetodoPago: detallesMetodo,
    });

    // resultado is an array: [auto, usuario]
    const [auto, usuarioResult] = resultado;

    console.log('✅ Registro completado:', resultado);

    res.status(201).json({ 
      success: true, 
      message: "Host registrado exitosamente",
      data: {
        autoId: auto?.idAuto || null,
        usuario: usuarioResult.host
      }
    });

  } catch (error) {
    console.error("❌ Error al registrar host:", error);
    
    // Manejo de errores más específico
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        res.status(409).json({ message: "La placa ya está registrada" });
        return;
      }
      if (error.message.includes('Foreign key constraint')) {
        res.status(400).json({ message: "Datos de referencia inválidos" });
        return;
      }
    }
    
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};