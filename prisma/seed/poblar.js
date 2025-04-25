import { PrismaClient, Transmision, Combustible, EstadoAuto, TipoMantenimiento, MotivoNoDisponibilidad, EstadoReserva, EstadoGarantia, MetodoPago, TipoPago } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seeder...');

  // Limpiar la base de datos (opcional)
  await limpiarBaseDeDatos();

  // 1. Crear usuarios
  console.log('Creando usuarios...');
  const usuarios = await crearUsuarios();

  // 2. Crear autos
  console.log('Creando autos...');
  const autos = await crearAutos(usuarios);

  // 3. Crear periodos de no disponibilidad
  console.log('Creando periodos de no disponibilidad...');
  await crearDisponibilidad(autos);

  // 4. Crear reservas
  console.log('Creando reservas...');
  const reservas = await crearReservas(autos, usuarios);

  // 5. Crear pagos
  console.log('Creando pagos...');
  await crearPagos(reservas);

  // 6. Crear garantías
  console.log('Creando garantías...');
  await crearGarantias(reservas);

  // 7. Crear historial de mantenimiento
  console.log('Creando historial de mantenimiento...');
  await crearHistorialMantenimiento(autos);

  // 8. Crear comentarios
  console.log('Creando comentarios...');
  await crearComentarios(autos, usuarios, reservas);

  console.log('Seeder completado exitosamente');
}

async function limpiarBaseDeDatos() {
  // Eliminar registros en orden para respetar las restricciones de claves foráneas
  await prisma.comentario.deleteMany({});
  await prisma.historialMantenimiento.deleteMany({});
  await prisma.garantia.deleteMany({});
  await prisma.pago.deleteMany({});
  await prisma.reserva.deleteMany({});
  await prisma.disponibilidad.deleteMany({});
  await prisma.auto.deleteMany({});
  await prisma.usuario.deleteMany({});
}

async function crearUsuarios() {
  const passwordHash = await hash('123456', 10);
  
  const usuarios = await Promise.all([
    prisma.usuario.create({
      data: {
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@rentacar.com',
        telefono: '591-77777777',
        direccion: 'Calle Principal #123',
        contraseña: passwordHash,
        esAdmin: true
      },
    }),
    prisma.usuario.create({
      data: {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@example.com',
        telefono: '591-76543210',
        direccion: 'Av. Las Américas #456',
        contraseña: passwordHash
      },
    }),
    prisma.usuario.create({
      data: {
        nombre: 'María',
        apellido: 'González',
        email: 'maria@example.com',
        telefono: '591-76123456',
        direccion: 'Calle Los Pinos #789',
        contraseña: passwordHash
      },
    }),
    prisma.usuario.create({
      data: {
        nombre: 'Carlos',
        apellido: 'Rodríguez',
        email: 'carlos@example.com',
        telefono: '591-70123456',
        direccion: 'Av. Siempre Viva #123',
        contraseña: passwordHash
      },
    }),
    prisma.usuario.create({
      data: {
        nombre: 'Ana',
        apellido: 'López',
        email: 'ana@example.com',
        telefono: '591-71234567',
        direccion: 'Calle Las Flores #321',
        contraseña: passwordHash
      },
    }),
  ]);

  console.log(`Creados ${usuarios.length} usuarios`);
  return usuarios;
}

async function crearAutos(usuarios) {
  const marcasModelos = [
    { marca: 'Toyota', modelo: 'Corolla', tipo: 'Sedán', precio: 35.0, garantia: 150.0 },
    { marca: 'Honda', modelo: 'Civic', tipo: 'Sedán', precio: 38.0, garantia: 150.0 },
    { marca: 'Ford', modelo: 'Explorer', tipo: 'SUV', precio: 50.0, garantia: 200.0 },
    { marca: 'Chevrolet', modelo: 'Spark', tipo: 'Hatchback', precio: 25.0, garantia: 100.0 },
    { marca: 'Nissan', modelo: 'X-Trail', tipo: 'SUV', precio: 45.0, garantia: 200.0 },
    { marca: 'Volkswagen', modelo: 'Golf', tipo: 'Hatchback', precio: 30.0, garantia: 150.0 },
    { marca: 'Suzuki', modelo: 'Vitara', tipo: 'SUV', precio: 42.0, garantia: 200.0 },
    { marca: 'Hyundai', modelo: 'Tucson', tipo: 'SUV', precio: 47.0, garantia: 200.0 },
  ];

  const colores = ['Rojo', 'Azul', 'Negro', 'Blanco', 'Gris', 'Plata'];
  const combustibles = [Combustible.GASOLINA, Combustible.DIESEL, Combustible.ELECTRICO, Combustible.HIBRIDO];
  const transmisiones = [Transmision.AUTOMATICO, Transmision.MANUAL];

  const autos = [];

  // Distribuimos autos entre usuarios, excepto el admin (usuarios[0])
  for (let i = 0; i < marcasModelos.length; i++) {
    const usuarioIndex = (i % (usuarios.length - 1)) + 1; // +1 para saltar al admin
    const auto = marcasModelos[i];
    
    const placa = `ABC-${1000 + i}`;
    const año = 2015 + Math.floor(Math.random() * 9); // Años entre 2015-2023
    const kilometraje = Math.floor(Math.random() * 50000);
    
    const nuevoAuto = await prisma.auto.create({
      data: {
        idPropietario: usuarios[usuarioIndex].idUsuario,
        marca: auto.marca,
        modelo: auto.modelo,
        descripcion: `${auto.marca} ${auto.modelo} en excelente estado, ideal para viajes.`,
        precioRentaDiario: auto.precio,
        montoGarantia: auto.garantia,
        kilometraje: kilometraje,
        tipo: auto.tipo,
        año: año,
        placa: placa,
        color: colores[Math.floor(Math.random() * colores.length)],
        asientos: auto.tipo === 'SUV' ? 7 : 5,
        transmision: transmisiones[Math.floor(Math.random() * transmisiones.length)],
        combustible: combustibles[Math.floor(Math.random() * combustibles.length)],
        imagenes: `/${auto.marca.toLowerCase()}_${auto.modelo.toLowerCase()}.jpg`,
        estado: EstadoAuto.ACTIVO
      }
    });
    
    autos.push(nuevoAuto);
  }

  console.log(`Creados ${autos.length} autos`);
  return autos;
}

async function crearDisponibilidad(autos) {
  const motivos = [
    MotivoNoDisponibilidad.MANTENIMIENTO,
    MotivoNoDisponibilidad.REPARACION, 
    MotivoNoDisponibilidad.USO_PERSONAL,
    MotivoNoDisponibilidad.OTRO
  ];

  const hoy = new Date();
  const disponibilidades = [];

  // Crearemos periodos de no disponibilidad para algunos autos (no todos)
  for (let i = 0; i < 5; i++) {
    const autoIndex = Math.floor(Math.random() * autos.length);
    const motivo = motivos[Math.floor(Math.random() * motivos.length)];
    
    // Fechas aleatorias en el futuro (entre 1 y 30 días)
    const diasEnFuturo = Math.floor(Math.random() * 30) + 1;
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(hoy.getDate() + diasEnFuturo);
    
    const duracion = Math.floor(Math.random() * 5) + 1; // Entre 1 y 5 días
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaInicio.getDate() + duracion);
    
    const disponibilidad = await prisma.disponibilidad.create({
      data: {
        idAuto: autos[autoIndex].idAuto,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        motivo: motivo,
        descripcion: motivo === MotivoNoDisponibilidad.MANTENIMIENTO 
          ? 'Mantenimiento programado' 
          : motivo === MotivoNoDisponibilidad.REPARACION 
            ? 'Reparación necesaria'
            : motivo === MotivoNoDisponibilidad.USO_PERSONAL
              ? 'Uso personal del propietario'
              : 'Otros motivos'
      }
    });
    
    disponibilidades.push(disponibilidad);
  }

  console.log(`Creados ${disponibilidades.length} periodos de no disponibilidad`);
  return disponibilidades;
}

async function crearReservas(autos, usuarios) {
  const hoy = new Date();
  const reservas = [];
  
  // Creamos 20 reservas en estado SOLICITADA
  for (let i = 0; i < 20; i++) {
    const autoIndex = Math.floor(Math.random() * autos.length);
    const clienteIndex = Math.floor(Math.random() * (usuarios.length - 1)) + 1; // +1 para saltar al admin
    
    // Fechas futuras para reservas no finalizadas
    const diasEnFuturo = Math.floor(Math.random() * 30) + 1; // Entre 1 y 30 días en futuro
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(hoy.getDate() + diasEnFuturo);
    
    const duracion = Math.floor(Math.random() * 5) + 1; // Entre 1 y 5 días
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaInicio.getDate() + duracion);

    // Fecha de solicitud es hoy o hace pocos días
    const fechaSolicitud = new Date(hoy);
    fechaSolicitud.setDate(hoy.getDate() - Math.floor(Math.random() * 5)); // 0-5 días atrás
    
    // Fecha límite de pago
    const fechaLimitePago = new Date(fechaSolicitud);
    fechaLimitePago.setDate(fechaSolicitud.getDate() + 2); // 2 días después de solicitud
    
    const precioRentaDiario = autos[autoIndex].precioRentaDiario;
    const montoTotal = precioRentaDiario * duracion;
    
    const reserva = await prisma.reserva.create({
      data: {
        idAuto: autos[autoIndex].idAuto,
        idCliente: usuarios[clienteIndex].idUsuario,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        estado: EstadoReserva.SOLICITADA,
        fechaSolicitud: fechaSolicitud,
        fechaAprobacion: null, // Sin fecha de aprobación para estado SOLICITADA
        fechaLimitePago: fechaLimitePago,
        montoTotal: montoTotal,
        kilometrajeInicial: null, // Aún no inicia
        kilometrajeFinal: null,   // Aún no finaliza
        estaPagada: false
      }
    });
    
    reservas.push(reserva);
  }

  console.log(`Creadas ${reservas.length} reservas solicitadas`);
  {/**
  // Imprimir IDs de reservas solicitadas
  console.log('IDs de reservas solicitadas:');
  reservas.forEach(r => console.log(`ID: ${r.idReserva}, Auto: ${r.idAuto}, Cliente: ${r.idCliente}`));
  
  */}
  
  return reservas;
}

async function crearPagos(reservas) {
  const metodosPago = [MetodoPago.QR, MetodoPago.TARJETA_DEBITO];
  const pagos = [];

  // Crear pagos para reservas pagadas o finalizadas
  for (const reserva of reservas) {
    if (reserva.estaPagada || reserva.estado === EstadoReserva.FINALIZADA) {
      const metodoPago = metodosPago[Math.floor(Math.random() * metodosPago.length)];
      
      // Pago de renta
      const pagoRenta = await prisma.pago.create({
        data: {
          idReserva: reserva.idReserva,
          monto: reserva.montoTotal,
          metodoPago: metodoPago,
          referencia: `REF-${Math.floor(Math.random() * 10000)}`,
          comprobante: `/comprobantes/pago_${reserva.idReserva}.pdf`,
          tipo: TipoPago.RENTA
        }
      });
      
      pagos.push(pagoRenta);
      
      // Algunos también tendrán pago de garantía
      if (Math.random() > 0.3) {
        const auto = await prisma.auto.findUnique({
          where: { idAuto: reserva.idAuto }
        });
        
        const pagoGarantia = await prisma.pago.create({
          data: {
            idReserva: reserva.idReserva,
            monto: auto.montoGarantia,
            metodoPago: metodoPago,
            referencia: `GREF-${Math.floor(Math.random() * 10000)}`,
            comprobante: `/comprobantes/garantia_${reserva.idReserva}.pdf`,
            tipo: TipoPago.GARANTIA
          }
        });
        
        pagos.push(pagoGarantia);
      }
    }
  }

  console.log(`Creados ${pagos.length} pagos`);
  return pagos;
}

async function crearGarantias(reservas) {
  const garantias = [];

  // Crear garantías para reservas con pagos de garantía
  for (const reserva of reservas) {
    // Verificar si tiene un pago de garantía
    const pagoGarantia = await prisma.pago.findFirst({
      where: {
        idReserva: reserva.idReserva,
        tipo: TipoPago.GARANTIA
      }
    });
    
    if (pagoGarantia) {
      const estado = reserva.estado === EstadoReserva.FINALIZADA 
        ? EstadoGarantia.LIBERADA 
        : EstadoGarantia.DEPOSITADA;
      
      const fechaLiberacion = estado === EstadoGarantia.LIBERADA
        ? new Date(reserva.fechaFin) // Un día después de finalizar la reserva
        : null;
      
      const garantia = await prisma.garantia.create({
        data: {
          idReserva: reserva.idReserva,
          monto: pagoGarantia.monto,
          estado: estado,
          fechaLiberacion: fechaLiberacion,
          comprobante: `/comprobantes/devolucion_${reserva.idReserva}.pdf`
        }
      });
      
      garantias.push(garantia);
    }
  }

  console.log(`Creadas ${garantias.length} garantías`);
  return garantias;
}

async function crearHistorialMantenimiento(autos) {
  const tiposMantenimiento = [
    TipoMantenimiento.PREVENTIVO,
    TipoMantenimiento.CORRECTIVO,
    TipoMantenimiento.REVISION
  ];
  
  const historialMantenimiento = [];

  // Crear historial de mantenimiento para algunos autos
  for (const auto of autos) {
    // Número aleatorio de registros de mantenimiento por auto (0-3)
    const numRegistros = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numRegistros; i++) {
      const tipoMantenimiento = tiposMantenimiento[Math.floor(Math.random() * tiposMantenimiento.length)];
      
      // Fecha aleatoria en el pasado (entre 1 y 365 días)
      const diasEnPasado = Math.floor(Math.random() * 365) + 1;
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - diasEnPasado);
      
      // Duración aleatoria (1-7 días)
      const duracion = Math.floor(Math.random() * 7) + 1;
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + duracion);
      
      const kilometrajeMantenimiento = auto.kilometraje - Math.floor(Math.random() * 5000);
      const costo = tipoMantenimiento === TipoMantenimiento.CORRECTIVO
        ? 100 + Math.floor(Math.random() * 400) // Entre 100 y 500
        : 50 + Math.floor(Math.random() * 100); // Entre 50 y 150
      
      const descripcion = tipoMantenimiento === TipoMantenimiento.PREVENTIVO
        ? 'Cambio de aceite y filtros'
        : tipoMantenimiento === TipoMantenimiento.CORRECTIVO
          ? 'Reparación de sistema de frenos'
          : 'Revisión general';
      
      const mantenimiento = await prisma.historialMantenimiento.create({
        data: {
          idAuto: auto.idAuto,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          descripcion: descripcion,
          costo: costo,
          tipoMantenimiento: tipoMantenimiento,
          kilometraje: kilometrajeMantenimiento
        }
      });
      
      historialMantenimiento.push(mantenimiento);
    }
  }

  console.log(`Creados ${historialMantenimiento.length} registros de mantenimiento`);
  return historialMantenimiento;
}

async function crearComentarios(autos, usuarios, reservas) {
  const frases = [
    'Excelente vehículo, muy cómodo y económico.',
    'Buena experiencia, aunque el auto consumía más combustible del esperado.',
    'Todo bien, el propietario fue muy amable y puntual.',
    'El auto estaba limpio y en perfectas condiciones.',
    'Recomiendo este vehículo para viajes largos.',
    'Un poco pequeño para mi familia, pero cumplió su propósito.',
    'Sin problemas durante el alquiler, volvería a rentar.',
    'El aire acondicionado no funcionaba bien, pero el resto perfecto.',
    'Auto muy bien mantenido y en excelentes condiciones.',
    'Buena relación calidad-precio.'
  ];
  
  const comentarios = [];

  // Crear comentarios para reservas finalizadas
  for (const reserva of reservas) {
    if (reserva.estado === EstadoReserva.FINALIZADA) {
      // No todos los usuarios dejan comentarios
      if (Math.random() > 0.3) {
        const calificacion = Math.floor(Math.random() * 3) + 3; // Entre 3 y 5 estrellas
        const fraseIndex = Math.floor(Math.random() * frases.length);
        
        const comentario = await prisma.comentario.create({
          data: {
            idAuto: reserva.idAuto,
            idUsuario: reserva.idCliente,
            contenido: frases[fraseIndex],
            calificacion: calificacion,
            fechaCreacion: new Date(reserva.fechaFin),
            idReserva: reserva.idReserva
          }
        });
        
        comentarios.push(comentario);
        
        // Actualizar calificación promedio y total de comentarios del auto
        const autoComentarios = await prisma.comentario.findMany({
          where: { idAuto: reserva.idAuto }
        });
        
        const totalComentarios = autoComentarios.length;
        const sumaCalificaciones = autoComentarios.reduce((sum, c) => sum + c.calificacion, 0);
        const promedio = sumaCalificaciones / totalComentarios;
        
        await prisma.auto.update({
          where: { idAuto: reserva.idAuto },
          data: {
            calificacionPromedio: promedio,
            totalComentarios: totalComentarios
          }
        });
      }
    }
  }

  console.log(`Creados ${comentarios.length} comentarios`);
  return comentarios;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });