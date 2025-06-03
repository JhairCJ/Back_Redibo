import { PrismaClient, Usuario } from "@prisma/client";
import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { generateToken } from "../utils/generateToken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { updateGoogleProfile as updateGoogleProfileService } from "../services/auth.service";

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response): Promise<void> => {
  const { nombreCompleto, email, contraseña, fechaNacimiento, telefono } =
    req.body;

  try {
    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      res
        .status(400)
        .json({ message: "El correo electrónico ya está registrado." });
      return;
    }

    const newUser = await authService.createUser({
      nombreCompleto,
      email,
      contraseña,
      fechaNacimiento,
      telefono,
    });

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: { email: newUser.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const updateGoogleProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userDecoded = req.user as { email?: string };
  console.log("📍 REQ.USER:", userDecoded);

  if (!userDecoded || !userDecoded.email) {
     res.status(401).json({ message: "Token inválido o usuario no autenticado" });
  }
  const { nombreCompleto, fechaNacimiento, telefono } = req.body;
  const email = (req.user as { email: string }).email;

  if (!email) {
    res.status(401).json({ message: "Email no proporcionado" });
    return;
  }

  console.log(`📝 Actualizando perfil de Google para: ${email}`);

  try {
    const updatedUser = await authService.updateGoogleProfile(
      email,
      nombreCompleto,
      fechaNacimiento,
      telefono
    );
    // Generar token después de actualizar el perfil
    const token = generateToken({
      idUsuario: updatedUser.idUsuario,
      email: updatedUser.email,
      nombreCompleto: updatedUser.nombreCompleto,
    });
    res.json({
      message: "Perfil actualizado correctamente",
      token,
      user: {
        email: updatedUser.email,
        nombreCompleto: updatedUser.nombreCompleto,
      },
    });
  } catch (error: any) {
    console.error("Error al actualizar perfil:", error);
    res.status(400).json({
      message: error.message || "No se pudo actualizar el perfil con Google",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await authService.findUserByEmail(email);

    if (!user) {
      res
        .status(401)
        .json({ message: "Correo ingresado no se encuentra en el sistema." });
      return;
    }

    if (user.registradoCon === "google") {
      res.status(401).json({
        message:
          "Esta cuenta fue registrada con Google. Por favor, inicia sesión con Google.",
      });
    }

    const isValid = await authService.validatePassword(
      password,
      user.contraseña ?? ""
    );

    if (!isValid) {
      res.status(401).json({ message: "Datos invalidos" });
      return;
    }

    // Token
    const token = generateToken({
      idUsuario: user.idUsuario,
      email: user.email,
      nombreCompleto: user.nombreCompleto,
    });

    console.info("Login exitoso para usuario:", email);
    res.json({
      message: "Login exitoso",
      token,
      user: {
        email: user.email,
        nombreCompleto: user.nombreCompleto,
      },
    });
  } catch (error) {
    console.error("Error inesperado en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
    return;
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const { idUsuario } = req.user as { idUsuario: number };

  try {
    const user = await prisma.usuario.findUnique({
      where: { idUsuario },
      select: {
        idUsuario: true,
        nombreCompleto: true,
        email: true,
        telefono: true,
        fechaNacimiento: true,
        fotoPerfil: true,
        edicionesNombre: true,
        edicionesTelefono: true,
        edicionesFecha: true,
        driverBool: true,
        host: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Error en /me:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Formato de imagen no válido. Usa PNG."));
    }
    cb(null, true);
  },
});

export const uploadProfilePhoto = async (req: Request, res: Response) => {
  const { idUsuario } = req.user as { idUsuario: number };

  if (!req.file) {
    res.status(400).json({ message: "No se subió ninguna imagen." });
    return;
  }

  const imagePath = `/uploads/${req.file.filename}`;

  try {
    await prisma.usuario.update({
      where: { idUsuario },
      data: { fotoPerfil: imagePath },
    });

    res.json({
      message: "Foto de perfil actualizada exitosamente.",
      foto_perfil: imagePath,
    });
  } catch (error) {
    console.error("Error al guardar la foto de perfil:", error);
    res.status(500).json({ message: "Error al actualizar la foto de perfil." });
  }
};

export const deleteProfilePhoto = async (req: Request, res: Response) => {
  const { idUsuario } = req.user as { idUsuario: number };

  try {
    const user = await prisma.usuario.findUnique({
      where: { idUsuario },
      select: { fotoPerfil: true },
    });

    if (!user || !user.fotoPerfil) {
      res.status(400).json({ message: "No hay foto para eliminar." });
      return;
    }

    const filePath = path.join(__dirname, "../../", user.fotoPerfil);

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error eliminando el archivo:", err);
      } else {
        console.log("Foto eliminada del servidor:", filePath);
      }
    });

    await prisma.usuario.update({
      where: { idUsuario },
      data: { fotoPerfil: null },
    });

    res.json({ message: "Foto de perfil eliminada exitosamente." });
  } catch (error) {
    console.error("Error al eliminar la foto de perfil:", error);
    res.status(500).json({ message: "Error al eliminar la foto." });
  }
};

export const updateUserField = async (req: Request, res: Response) => {
  const { campo, valor }: { campo: CampoEditable; valor: string } = req.body;
  const { idUsuario } = req.user as { idUsuario: number };

  if (!campo || valor === undefined || valor === null) {
    res.status(400).json({ message: "Campo y valor son obligatorios." });
    return;
  }

  const camposPermitidos = [
    "nombreCompleto",
    "telefono",
    "fechaNacimiento",
  ] as const;
  type CampoEditable = (typeof camposPermitidos)[number];
  if (!camposPermitidos.includes(campo)) {
    res.status(400).json({ message: "Campo no permitido." });
    return;
  }

  const campoContadorMap: Record<CampoEditable, keyof Usuario> = {
    nombreCompleto: "edicionesNombre",
    telefono: "edicionesTelefono",
    fechaNacimiento: "edicionesFecha",
  };
  const campoContador = campoContadorMap[campo];

  try {
    const user = (await prisma.usuario.findUnique({
      where: { idUsuario },
      select: {
        [campo]: true,
        [campoContador]: true,
      },
    })) as any;

    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    const contadorValor = user[campoContador];
    if (typeof contadorValor === "number" && contadorValor >= 3) {
      res.status(403).json({
        message:
          "Has alcanzado el límite de 3 ediciones para este campo. Para más cambios, contacta al soporte.",
      });
      return;
    }

    const valorActual = user[campo];

    if (valorActual?.toString() === valor?.toString()) {
      res.status(200).json({
        message: "No hubo cambios en el valor.",
        edicionesRestantes: 3 - user[campoContador],
      });
    }

    // Validaciones personalizadas
    if (campo === "nombreCompleto") {
      if (typeof valor !== "string" || valor.length < 3 || valor.length > 50) {
        res
          .status(400)
          .json({ message: "El nombre debe tener entre 3 y 50 caracteres." });
      }
      const soloLetrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/;
      if (!soloLetrasRegex.test(valor)) {
        res
          .status(400)
          .json({
            message: "El nombre solo puede contener letras y espacios.",
          });
        return;
      }
      if (/\s{2,}/.test(valor)) {
        res
          .status(400)
          .json({
            message: "El nombre no debe tener más de un espacio consecutivo.",
          });
        return;
      }
      if (/^\s|\s$/.test(valor)) {
        res
          .status(400)
          .json({
            message: "El nombre no debe comenzar ni terminar con espacios.",
          });
        return;
      }
    }

    if (campo === "telefono") {
      const telefonoStr = valor.toString().trim();
      if (!/^[0-9]*$/.test(telefonoStr)) {
        res
          .status(400)
          .json({ message: "Formato inválido, ingrese solo números." });
        return;
      }
      if (!/^[0-9]{8}$/.test(telefonoStr)) {
        res
          .status(400)
          .json({ message: "El teléfono debe ser un número de 8 dígitos." });
        return;
      }
      if (!/^[67]/.test(telefonoStr)) {
        res
          .status(400)
          .json({ message: "El teléfono debe comenzar con 6 o 7." });
        return;
      }
    }
    if (campo === "fechaNacimiento") {
      const fechaValida = Date.parse(valor);
      if (isNaN(fechaValida)) {
        res.status(400).json({ message: "Fecha inválida." });
        return;
      }
    }

    // Conversión de valores
    let nuevoValor: any;
    if (campo === "telefono") {
      nuevoValor = valor.toString().trim();
    } else if (campo === "fechaNacimiento") {
      nuevoValor = new Date(valor);
    } else {
      nuevoValor = valor;
    }

    // Comparación
    let valoresIguales = false;
    if (campo === "telefono") {
      valoresIguales = valorActual === nuevoValor;
    } else if (campo === "fechaNacimiento") {
      const valorActualDate =
        valorActual instanceof Date
          ? valorActual
          : valorActual !== null
          ? new Date(valorActual)
          : null;
      const nuevoValorDate =
        nuevoValor instanceof Date ? nuevoValor : new Date(nuevoValor);
      valoresIguales =
        valorActualDate !== null &&
        valorActualDate.getTime() === nuevoValorDate.getTime();
    } else {
      valoresIguales = valorActual === nuevoValor;
    }

    if (valoresIguales) {
      res.status(200).json({
        message: "No hubo cambios en el valor.",
        edicionesRestantes:
          typeof user?.[campoContador] === "number"
            ? 3 - (user[campoContador] as number)
            : 3,
      });
      return;
    }

    const updatedUser = await prisma.usuario.update({
      where: { idUsuario },
      data: {
        [campo]: nuevoValor,
        [campoContador]: { increment: 1 },
      },
    });

    const edicionesRealizadas =
      typeof user?.[campoContador] === "number"
        ? (user[campoContador] as number)
        : 0;
    const edicionesRestantes = 2 - edicionesRealizadas;
    let infoExtra = "";
    if (edicionesRestantes === 1) {
      infoExtra =
        "Último intento: esta es tu última oportunidad para editar este campo.";
    } else if (edicionesRestantes === 0) {
      infoExtra =
        "Has alcanzado el límite de 3 ediciones para este campo. Para más cambios, contacta al soporte.";
    }

    res.json({
      message: `$${
        campo === "nombreCompleto"
          ? "Nombre"
          : campo === "telefono"
          ? "Teléfono"
          : "Fecha de nacimiento"
      } actualizado correctamente`,
      edicionesRestantes,
      infoExtra,
      user: {
        idUsuario: updatedUser.idUsuario,
        [campo]: updatedUser[campo],
        [campoContador]: updatedUser[campoContador as keyof typeof updatedUser],
      },
    });
  } catch (error) {
    console.error("Error al actualizar campo:", error);
    res.status(500).json({ message: "Error al actualizar el campo." });
    return;
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const idUsuario = Number(req.params.idUsuario); // Aseguramos que sea número

  if (isNaN(idUsuario)) {
    res.status(400).json({ message: "ID de usuario inválido" });
    return;
  }

  try {
    const user = await authService.getUserById(idUsuario); // Usamos el servicio

    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    res.status(200).json({
      idUsuario: user.idUsuario,
      nombreCompleto: user.nombreCompleto,
      email: user.email,
      telefono: user.telefono,
      fechaNacimiento: user.fechaNacimiento,
    });
  } catch (error) {
    console.error("Error al obtener el perfil:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const checkPhoneExists = async (req: Request, res: Response) => {
  const { telefono } = req.body;

  if (!telefono) {
    res.status(400).json({ message: "Teléfono no proporcionado" });
    return;
  }

  try {
    const user = await authService.findUserByPhone(telefono.toString());
    res.json({ exists: !!user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const deleteIncompleteUser = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email no proporcionado" });
    return;
  }

  console.log(`🗑️ Intentando eliminar usuario incompleto: ${email}`);

  try {
    const user = await authService.findUserByEmail(email);

    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    if (user.registradoCon !== "google") {
      res.status(400).json({
        message: "Solo se pueden eliminar usuarios registrados con Google",
      });
      return;
    }

    if (user.nombreCompleto && user.fechaNacimiento) {
      res.status(400).json({
        message: "No se puede eliminar un usuario con perfil completo",
      });
      return;
    }

    await prisma.usuario.delete({
      where: { email },
    });

    console.log(`✅ Usuario incompleto eliminado exitosamente: ${email}`);

    res.json({
      message: "Usuario incompleto eliminado exitosamente",
      email,
    });
  } catch (error: any) {
    console.error("Error al eliminar usuario incompleto:", error);

    if (error.code === "P2025") {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    res.status(500).json({
      message: "Error al eliminar el usuario incompleto",
    });
  }
};

export const registroDriver = async (req: Request, res: Response) => {
  try {
    const { idUsuario } = req.user as { idUsuario: number };

    const {
      sexo,
      telefono,
      nro_licencia,
      categoria,
      fecha_emision,
      fecha_vencimiento,
      anversoUrl,
      reversoUrl,
      rentersIds = [],
    } = req.body;

    if (
      !sexo ||
      !telefono ||
      !nro_licencia ||
      !categoria ||
      !fecha_emision ||
      !fecha_vencimiento ||
      !anversoUrl ||
      !reversoUrl
    ) {
      res.status(400).json({
        message: "Faltan datos requeridos para el registro del driver",
      });
      return;
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { idUsuario },
      include: { driver: true },
    });

    if (!usuarioExistente) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    if (usuarioExistente.driver) {
      res.status(400).json({
        message: "El usuario ya está registrado como driver",
      });
      return;
    }

    if (rentersIds.length > 0) {
      const rentersExistentes = await prisma.usuario.findMany({
        where: {
          idUsuario: { in: rentersIds },
        },
        select: { idUsuario: true },
      });

      if (rentersExistentes.length !== rentersIds.length) {
        res.status(400).json({
          message: "Algunos renters seleccionados no existen",
        });
        return;
      }
    }

    const fechaEmision = new Date(fecha_emision);
    const fechaExpiracion = new Date(fecha_vencimiento);

    if (isNaN(fechaEmision.getTime()) || isNaN(fechaExpiracion.getTime())) {
      res.status(400).json({ message: "Fechas de licencia inválidas" });
      return;
    }

    const resultado = await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { idUsuario },
        data: { driverBool: true },
      });

      const nuevoDriver = await tx.driver.create({
        data: {
          idUsuario,
          sexo,
          telefono,
          licencia: nro_licencia,
          fechaEmision,
          fechaExpiracion,
          tipoLicencia: categoria,
          anversoUrl,
          reversoUrl,
          disponible: true,
        },
      });

      if (rentersIds.length > 0) {
        const relacionesData = rentersIds.map((renterId: number) => ({
          idUsuario: renterId,
          idDriver: nuevoDriver.idDriver,
        }));

        await tx.usuarioDriver.createMany({
          data: relacionesData,
          skipDuplicates: true,
        });
      }

      return {
        driver: nuevoDriver,
        relacionesCreadas: rentersIds.length,
      };
    });

    console.log("✅ Driver registrado exitosamente:", {
      driverId: resultado.driver.idDriver,
      usuario: usuarioExistente.nombreCompleto,
      relacionesCreadas: resultado.relacionesCreadas,
    });

    res.status(201).json({
      message: "Driver registrado exitosamente",
      data: {
        driverId: resultado.driver.idDriver,
        relacionesCreadas: resultado.relacionesCreadas,
        rentersAsignados: rentersIds,
      },
    });
  } catch (error: any) {
    console.error("❌ Error en registro-driver:", error);

    if (error.code === "P2002") {
      res.status(409).json({
        message: "Ya existe un driver con estos datos",
        details: error.meta,
      });
      return;
    }

    if (error.code === "P2003") {
      res.status(400).json({
        message: "Error de referencia en base de datos",
        details: error.meta,
      });
      return;
    }

    res.status(500).json({
      message: "Error interno del servidor",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Error interno",
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const obtenerDriver = async (req: Request, res: Response) => {
  try {
    const { idUsuario } = req.user as { idUsuario: number };

    const driver = await prisma.driver.findUnique({
      where: { idUsuario },
      include: {
        usuario: {
          select: {
            idUsuario: true,
            nombreCompleto: true,
            email: true,
            fotoPerfil: true,
          },
        },
        asignadoA: {
          include: {
            usuario: {
              select: {
                idUsuario: true,
                nombreCompleto: true,
                email: true,
                telefono: true,
                fotoPerfil: true,
              },
            },
          },
        },
      },
    });

    if (!driver) {
      res.status(404).json({ message: "Driver no encontrado" });
      return;
    }

    res.json({
      message: "Driver encontrado",
      data: driver,
    });
  } catch (error) {
    console.error("❌ Error al obtener driver:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    await prisma.$disconnect();
  }
};
