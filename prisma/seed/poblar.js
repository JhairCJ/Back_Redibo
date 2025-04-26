
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
  
  // Creamos primero al admin (ID 1)
  const admin = await prisma.usuario.create({
    data: {
      nombre: 'Admin',
      apellido: 'Sistema',
      email: 'admin@rentacar.com',
      telefono: '591-77777777',
      direccion: 'Calle Principal #123',
      contraseña: passwordHash,
      esAdmin: true
    },
  });
  
  // Luego creamos rentadores (propietarios) con IDs 2-11
  const rentadores = [];
  const nombresRentadores = [
    { nombre: 'Juan', apellido: 'Pérez' },
    { nombre: 'María', apellido: 'González' },
    { nombre: 'Carlos', apellido: 'Rodríguez' },
    { nombre: 'Ana', apellido: 'López' },
    { nombre: 'Luis', apellido: 'Martínez' },
    { nombre: 'Laura', apellido: 'Sánchez' },
    { nombre: 'Roberto', apellido: 'Torres' },
    { nombre: 'Patricia', apellido: 'Fernández' },
    { nombre: 'Miguel', apellido: 'García' },
    { nombre: 'Sofía', apellido: 'Ramírez' }
  ];
  
  for (let i = 0; i < nombresRentadores.length; i++) {
    const rentador = await prisma.usuario.create({
      data: {
        nombre: nombresRentadores[i].nombre,
        apellido: nombresRentadores[i].apellido,
        email: `${nombresRentadores[i].nombre.toLowerCase()}@rentacar.com`,
        telefono: `591-7${i}543210`,
        direccion: `Av. Los Propietarios #${i+100}`,
        contraseña: passwordHash
      },
    });
    rentadores.push(rentador);
  }
  
  // Finalmente creamos clientes (no propietarios) con IDs 12+
  const clientes = [];
  const nombresClientes = [
    { nombre: 'Fernando', apellido: 'Gómez' },
    { nombre: 'Valentina', apellido: 'Díaz' },
    { nombre: 'Javier', apellido: 'Morales' },
    { nombre: 'Carolina', apellido: 'Vargas' },
    { nombre: 'Gustavo', apellido: 'Castro' },
    { nombre: 'Daniela', apellido: 'Ortega' },
    { nombre: 'Eduardo', apellido: 'Mendoza' },
    { nombre: 'Gabriela', apellido: 'Flores' },
    { nombre: 'Héctor', apellido: 'Herrera' },
    { nombre: 'Alejandra', apellido: 'Paredes' },
    { nombre: 'Ricardo', apellido: 'Rojas' },
    { nombre: 'Natalia', apellido: 'Medina' },
    { nombre: 'César', apellido: 'Navarro' },
    { nombre: 'Valeria', apellido: 'Quintana' },
    { nombre: 'Andrés', apellido: 'Cárdenas' }
  ];
  
  for (let i = 0; i < nombresClientes.length; i++) {
    const cliente = await prisma.usuario.create({
      data: {
        nombre: nombresClientes[i].nombre,
        apellido: nombresClientes[i].apellido,
        email: `${nombresClientes[i].nombre.toLowerCase()}${Math.floor(Math.random() * 100)}@example.com`,
        telefono: `591-6${i}123456`,
        direccion: `Calle Los Clientes #${i+200}`,
        contraseña: passwordHash
      },
    });
    clientes.push(cliente);
  }
  
  // Concatenamos todos los usuarios
  const usuarios = [admin, ...rentadores, ...clientes];
  
  console.log(`Creados ${usuarios.length} usuarios (1 admin, ${rentadores.length} rentadores, ${clientes.length} clientes)`);
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
    { marca: 'Toyota', modelo: 'RAV4', tipo: 'SUV', precio: 48.0, garantia: 200.0 },
    { marca: 'Honda', modelo: 'HR-V', tipo: 'SUV', precio: 40.0, garantia: 180.0 },
    { marca: 'Kia', modelo: 'Sportage', tipo: 'SUV', precio: 45.0, garantia: 200.0 },
    { marca: 'Mazda', modelo: 'CX-5', tipo: 'SUV', precio: 46.0, garantia: 200.0 },
    { marca: 'Nissan', modelo: 'Sentra', tipo: 'Sedán', precio: 32.0, garantia: 150.0 },
    { marca: 'Toyota', modelo: 'Yaris', tipo: 'Hatchback', precio: 28.0, garantia: 120.0 },
    { marca: 'Chevrolet', modelo: 'Onix', tipo: 'Hatchback', precio: 27.0, garantia: 120.0 },
    { marca: 'Volkswagen', modelo: 'Polo', tipo: 'Hatchback', precio: 29.0, garantia: 130.0 },
    { marca: 'Ford', modelo: 'Fiesta', tipo: 'Hatchback', precio: 27.0, garantia: 120.0 },
    { marca: 'Renault', modelo: 'Duster', tipo: 'SUV', precio: 38.0, garantia: 180.0 },
    { marca: 'Mitsubishi', modelo: 'L200', tipo: 'Pickup', precio: 55.0, garantia: 250.0 },
    { marca: 'Toyota', modelo: 'Hilux', tipo: 'Pickup', precio: 60.0, garantia: 250.0 }
  ];

  const colores = ['Rojo', 'Azul', 'Negro', 'Blanco', 'Gris', 'Plata', 'Verde', 'Amarillo', 'Café', 'Beige'];
  const combustibles = [Combustible.GASOLINA, Combustible.DIESEL, Combustible.ELECTRICO, Combustible.HIBRIDO];
  const transmisiones = [Transmision.AUTOMATICO, Transmision.MANUAL];

  const autos = [];
  
  // Definimos IDs de rentadores (del 2 al 11)
  const rentadoresIds = usuarios.filter(u => u.idUsuario >= 2 && u.idUsuario <= 11).map(u => u.idUsuario);

  // Distribuimos autos entre rentadores
  for (let i = 0; i < marcasModelos.length; i++) {
    // Asignamos de forma circular a los rentadores
    const rentadorId = rentadoresIds[i % rentadoresIds.length];
    const auto = marcasModelos[i];
    
    const placa = `ABC-${1000 + i}`;
    const año = 2015 + Math.floor(Math.random() * 9); // Años entre 2015-2023
    const kilometraje = Math.floor(Math.random() * 50000);
    
    // Algunos autos tienen mejor calificación inicial
    const tieneCalificacion = Math.random() > 0.6;
    const calificacionPromedio = tieneCalificacion ? 3 + Math.random() * 2 : null; // Entre 3 y 5
    const totalComentarios = tieneCalificacion ? Math.floor(Math.random() * 10) + 1 : 0;
    
    const nuevoAuto = await prisma.auto.create({
      data: {
        idPropietario: rentadorId,
        marca: auto.marca,
        modelo: auto.modelo,
        descripcion: `${auto.marca} ${auto.modelo} en excelente estado, ideal para viajes. ${
          auto.tipo === 'SUV' ? 'Espacioso y cómodo para toda la familia.' : 
          auto.tipo === 'Pickup' ? 'Perfecto para trabajo y aventuras.' : 
          'Económico y confortable.'
        }`,
        precioRentaDiario: auto.precio,
        montoGarantia: auto.garantia,
        kilometraje: kilometraje,
        tipo: auto.tipo,
        año: año,
        placa: placa,
        color: colores[Math.floor(Math.random() * colores.length)],
        asientos: auto.tipo === 'SUV' ? 7 : auto.tipo === 'Pickup' ? 5 : 5,
        transmision: transmisiones[Math.floor(Math.random() * transmisiones.length)],
        combustible: combustibles[Math.floor(Math.random() * combustibles.length)],
        imagenes: `/${auto.marca.toLowerCase()}_${auto.modelo.toLowerCase()}.jpg`,
        estado: EstadoAuto.ACTIVO,
        calificacionPromedio: calificacionPromedio,
        totalComentarios: totalComentarios
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

  // Crearemos periodos de no disponibilidad para algunos autos (aproximadamente 30%)
  for (let i = 0; i < Math.floor(autos.length * 0.3); i++) {
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
  
  // Obtener IDs de clientes (los que no son admin ni rentadores)
  const clientesIds = usuarios
    .filter(u => u.idUsuario > 11 && !u.esAdmin)
    .map(u => u.idUsuario);
  
  // Estados posibles de reserva
  const estados = [
    EstadoReserva.SOLICITADA,
    EstadoReserva.APROBADA,
    EstadoReserva.RECHAZADA,
    EstadoReserva.CANCELADA,
    EstadoReserva.FINALIZADA,
    EstadoReserva.EN_CURSO
  ];
  
  // Distribuimos de forma que haya más SOLICITADAS, APROBADAS y FINALIZADAS
  const distribucionEstados = [
    ...Array(15).fill(EstadoReserva.SOLICITADA),
    ...Array(10).fill(EstadoReserva.APROBADA),
    ...Array(5).fill(EstadoReserva.RECHAZADA),
    ...Array(3).fill(EstadoReserva.CANCELADA),
    ...Array(10).fill(EstadoReserva.FINALIZADA),
    ...Array(7).fill(EstadoReserva.EN_CURSO)
  ];
  
  // Crear 50 reservas con diferentes estados
  for (let i = 0; i < 50; i++) {
    const autoIndex = Math.floor(Math.random() * autos.length);
    const clienteIndex = Math.floor(Math.random() * clientesIds.length);
    const clienteId = clientesIds[clienteIndex];
    
    const estado = distribucionEstados[i % distribucionEstados.length];
    
    // Definir fechas según el estado
    let fechaInicio, fechaFin, fechaSolicitud, fechaAprobacion, fechaLimitePago;
    let estaPagada = false;
    let kilometrajeInicial = null;
    let kilometrajeFinal = null;
    
    // Fecha de solicitud es hoy o hace pocos días
    fechaSolicitud = new Date(hoy);
    fechaSolicitud.setDate(hoy.getDate() - Math.floor(Math.random() * 15)); // 0-15 días atrás
    
    // Fecha límite de pago
    fechaLimitePago = new Date(fechaSolicitud);
    fechaLimitePago.setDate(fechaSolicitud.getDate() + 2); // 2 días después de solicitud
    
    if (estado === EstadoReserva.SOLICITADA) {
      // Fechas futuras para reservas solicitadas
      const diasEnFuturo = Math.floor(Math.random() * 30) + 1;
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() + diasEnFuturo);
      
      const duracion = Math.floor(Math.random() * 5) + 1;
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + duracion);
      
      fechaAprobacion = null;
      estaPagada = false;
    } 
    else if (estado === EstadoReserva.APROBADA) {
      // Fechas futuras para reservas aprobadas
      const diasEnFuturo = Math.floor(Math.random() * 20) + 1;
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() + diasEnFuturo);
      
      const duracion = Math.floor(Math.random() * 5) + 1;
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + duracion);
      
      fechaAprobacion = new Date(fechaSolicitud);
      fechaAprobacion.setDate(fechaSolicitud.getDate() + 1);
      
      estaPagada = Math.random() > 0.3; // 70% están pagadas
    }
    else if (estado === EstadoReserva.EN_CURSO) {
      // Fechas para reservas en curso
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - Math.floor(Math.random() * 3)); // 0-3 días atrás
      
      const duracion = Math.floor(Math.random() * 5) + 1;
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + duracion);
      
      fechaAprobacion = new Date(fechaSolicitud);
      fechaAprobacion.setDate(fechaSolicitud.getDate() + 1);
      
      estaPagada = true;
      kilometrajeInicial = autos[autoIndex].kilometraje;
    }
    else if (estado === EstadoReserva.FINALIZADA) {
      // Fechas pasadas para reservas finalizadas
      const diasEnPasado = Math.floor(Math.random() * 60) + 5; // 5-65 días atrás
      fechaFin = new Date(hoy);
      fechaFin.setDate(hoy.getDate() - diasEnPasado);
      
      const duracion = Math.floor(Math.random() * 5) + 1;
      fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaFin.getDate() - duracion);
      
      fechaSolicitud = new Date(fechaInicio);
      fechaSolicitud.setDate(fechaInicio.getDate() - Math.floor(Math.random() * 10) - 1);
      
      fechaAprobacion = new Date(fechaSolicitud);
      fechaAprobacion.setDate(fechaSolicitud.getDate() + 1);
      
      fechaLimitePago = new Date(fechaAprobacion);
      fechaLimitePago.setDate(fechaAprobacion.getDate() + 1);
      
      estaPagada = true;
      kilometrajeInicial = autos[autoIndex].kilometraje - Math.floor(Math.random() * 500);
      kilometrajeFinal = kilometrajeInicial + Math.floor(Math.random() * 500) + 50;
    }
    else if (estado === EstadoReserva.RECHAZADA || estado === EstadoReserva.CANCELADA) {
      // Fechas para reservas rechazadas o canceladas
      const diasEnFuturo = Math.floor(Math.random() * 20) + 5;
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() + diasEnFuturo);
      
      const duracion = Math.floor(Math.random() * 5) + 1;
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + duracion);
      
      if (estado === EstadoReserva.RECHAZADA) {
        fechaAprobacion = null;
      } else {
        fechaAprobacion = new Date(fechaSolicitud);
        fechaAprobacion.setDate(fechaSolicitud.getDate() + 1);
      }
      
      estaPagada = false;
    }
    
    const precioRentaDiario = autos[autoIndex].precioRentaDiario;
    const duracionDias = Math.floor((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
    const montoTotal = precioRentaDiario * duracionDias;
    
    const reserva = await prisma.reserva.create({
      data: {
        idAuto: autos[autoIndex].idAuto,
        idCliente: clienteId,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        estado: estado,
        fechaSolicitud: fechaSolicitud,
        fechaAprobacion: fechaAprobacion,
        fechaLimitePago: fechaLimitePago,
        montoTotal: montoTotal,
        kilometrajeInicial: kilometrajeInicial,
        kilometrajeFinal: kilometrajeFinal,
        estaPagada: estaPagada
      }
    });
    
    reservas.push(reserva);
  }

  console.log(`Creadas ${reservas.length} reservas con diferentes estados`);
  return reservas;
}

async function crearPagos(reservas) {
  const metodosPago = [MetodoPago.QR, MetodoPago.TARJETA_DEBITO, MetodoPago.EFECTIVO, MetodoPago.TRANSFERENCIA];
  const pagos = [];

  // Crear pagos para reservas pagadas, en curso o finalizadas
  for (const reserva of reservas) {
    if (reserva.estaPagada || 
        reserva.estado === EstadoReserva.FINALIZADA || 
        reserva.estado === EstadoReserva.EN_CURSO) {
      
      const metodoPago = metodosPago[Math.floor(Math.random() * metodosPago.length)];
      
      // Pago de renta
      const pagoRenta = await prisma.pago.create({
        data: {
          idReserva: reserva.idReserva,
          monto: reserva.montoTotal,
          metodoPago: metodoPago,
          referencia: `REF-${Math.floor(Math.random() * 10000)}`,
          comprobante: `/comprobantes/pago_${reserva.idReserva}.pdf`,
          tipo: TipoPago.RENTA,
          fechaPago: new Date(reserva.fechaAprobacion || reserva.fechaSolicitud)
        }
      });
      
      pagos.push(pagoRenta);
      
      // La mayoría también tendrán pago de garantía
      if (Math.random() > 0.2) {
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
            tipo: TipoPago.GARANTIA,
            fechaPago: new Date(reserva.fechaAprobacion || reserva.fechaSolicitud)
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
      let estado;
      
      if (reserva.estado === EstadoReserva.FINALIZADA) {
        estado = EstadoGarantia.LIBERADA;
      } else if (reserva.estado === EstadoReserva.EN_CURSO) {
        estado = EstadoGarantia.DEPOSITADA;
      } else if (reserva.estado === EstadoReserva.APROBADA && reserva.estaPagada) {
        estado = EstadoGarantia.DEPOSITADA;
      } else {
        estado = EstadoGarantia.PENDIENTE;
      }
      
      const fechaLiberacion = estado === EstadoGarantia.LIBERADA
        ? new Date(reserva.fechaFin) // Un día después de finalizar la reserva
        : null;
      
      const garantia = await prisma.garantia.create({
        data: {
          idReserva: reserva.idReserva,
          monto: pagoGarantia.monto,
          estado: estado,
          fechaLiberacion: fechaLiberacion,
          comprobante: fechaLiberacion ? `/comprobantes/devolucion_${reserva.idReserva}.pdf` : null
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