import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const registrarDriverCompleto = async (data: {
  idUsuario: number;
  sexo: string;
  telefono: string;
  licencia: string;
  tipoLicencia: string;
  fechaEmision: Date;
  fechaExpiracion: Date;
  anversoUrl: string;
  reversoUrl: string;
  rentersIds: number[];
}) => {
  const {
    idUsuario,
    sexo,
    telefono,
    licencia,
    tipoLicencia,
    fechaEmision,
    fechaExpiracion,
    anversoUrl,
    reversoUrl,
    rentersIds
  } = data;

  if (!rentersIds || rentersIds.length === 0) {
    throw new Error('Debes asignar al menos un renter al driver.');
  }

  // Verificar si el usuario ya tiene teléfono registrado
  const usuario = await prisma.usuario.findUnique({
    where: { idUsuario },
    select: { telefono: true }
  });

  const telefonoFinal = usuario?.telefono ? String(usuario.telefono) : telefono;

  return await prisma.$transaction(async (tx) => {
    const nuevoDriver = await tx.driver.create({
      data: {
        idUsuario,
        sexo,
        telefono: telefonoFinal,
        licencia,
        tipoLicencia,
        fechaEmision,
        fechaExpiracion,
        anversoUrl,
        reversoUrl
      }
    });

    const operations = [];

    // 2. Si no tenía teléfono, actualizarlo ahora
    if (!usuario?.telefono) {
      operations.push(
        tx.usuario.update({
          where: { idUsuario },
          data: { telefono: String(telefono) }
        })
      );
    }

    // 3. Marcar al usuario como driver (driverBool = true)
    operations.push(
      tx.usuario.update({
        where: { idUsuario },
        data: { driverBool: true }
      })
    );

    // 4. Crear relaciones driver-renter
    for (const renterId of rentersIds) {
      operations.push(
        tx.usuarioDriver.create({
          data: {
            idUsuario: renterId,
            idDriver: nuevoDriver.idDriver
          }
        })
      );
    }

    // 5. Asignar renters
    for (const renterId of rentersIds) {
      operations.push(
        tx.usuario.update({
          where: { idUsuario: renterId },
          data: {
            assignedToDriver: idUsuario
          }
        })
      );
    }

    await Promise.all(operations);
    return nuevoDriver;
  });
};
 

