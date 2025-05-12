const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker/locale/es_MX');
const bcrypt = require('bcrypt');

// Inicializar Prisma Client
const prisma = new PrismaClient();

// Configuración
const NUMERO_USUARIOS = 50;
const NUMERO_ADMINS = 3;
const NUMERO_UBICACIONES = 15;
const NUMERO_AUTOS = 80;
const NUMERO_RESERVAS = 120;
const NUMERO_COMENTARIOS = 180;
const NUMERO_NOTIFICACIONES = 200;
const SALT_ROUNDS = 10;

// Función para generar una contraseña hasheada
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Función principal
async function main() {
  console.log('🚀 Iniciando población de la base de datos...');

  
  // Poblar usuarios
  console.log('👤 Creando usuarios...');
  const usuariosCreados = await crearUsuarios();
  
  // Poblar ubicaciones
  console.log('📍 Creando ubicaciones...');
  const ubicacionesCreadas = await crearUbicaciones();
  
  // Poblar autos
  console.log('🚗 Creando autos...');
  const autosCreados = await crearAutos(usuariosCreados, ubicacionesCreadas);
  
  // Poblar imágenes de autos
  console.log('🖼️ Creando imágenes para autos...');
  await crearImagenesAutos(autosCreados);
  
  // Poblar disponibilidad
  console.log('📅 Configurando periodos de disponibilidad...');
  await crearDisponibilidad(autosCreados);
  
  // Poblar reservas
  console.log('📝 Creando reservas...');
  const reservasCreadas = await crearReservas(autosCreados, usuariosCreados);
  
  // Poblar pagos
  console.log('💰 Registrando pagos...');
  await crearPagos(reservasCreadas);
  
  // Poblar garantías
  console.log('🔐 Registrando garantías...');
  await crearGarantias(reservasCreadas);
  
  // Poblar historial de mantenimiento
  console.log('🔧 Registrando historial de mantenimiento...');
  await crearHistorialMantenimiento(autosCreados);
  
  // Poblar comentarios
  console.log('💬 Creando comentarios y calificaciones de autos...');
  await crearComentarios(autosCreados, usuariosCreados, reservasCreadas);
  
  // Poblar calificaciones de usuarios
  console.log('⭐ Creando calificaciones de usuarios...');
  await crearCalificacionesUsuarios(reservasCreadas);
  
  // Poblar notificaciones
  console.log('🔔 Creando notificaciones...');
  await crearNotificaciones(usuariosCreados, reservasCreadas, autosCreados);
  
  // Actualizar estadísticas de autos
  console.log('📊 Actualizando estadísticas de autos...');
  await actualizarEstadisticasAutos();
  
  console.log('✅ Base de datos poblada exitosamente!');
}

// Función para crear usuarios
async function crearUsuarios() {
  const usuarios = [];
  
  // Crear un usuario admin fijo para pruebas
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.usuario.create({
    data: {
      nombre: 'Admin',
      apellido: 'Principal',
      email: 'admin@rentauto.com',
      telefono: '5551234567',
      direccion: 'Calle Administración #123, Ciudad de México',
      contraseña: adminPassword,
      esAdmin: true,
      fechaRegistro: faker.date.past({ years: 1 }),
    }
  });
  usuarios.push(admin);
  
  // Crear usuarios administradores adicionales
  for (let i = 0; i < NUMERO_ADMINS - 1; i++) {
    const password = await hashPassword('adminpass');
    const usuario = await prisma.usuario.create({
      data: {
        nombre: faker.person.firstName(),
        apellido: faker.person.lastName(),
        email: faker.internet.email({ provider: 'rentauto.com' }),
        telefono: faker.phone.number('##########'),
        direccion: faker.location.streetAddress(true),
        contraseña: password,
        esAdmin: true,
        fechaRegistro: faker.date.past({ years: 1 }),
      }
    });
    usuarios.push(usuario);
  }
  
  // Crear usuarios regulares
  for (let i = 0; i < NUMERO_USUARIOS - NUMERO_ADMINS; i++) {
    const password = await hashPassword('userpass');
    const usuario = await prisma.usuario.create({
      data: {
        nombre: faker.person.firstName(),
        apellido: faker.person.lastName(),
        email: faker.internet.email(),
        telefono: faker.phone.number('##########'),
        direccion: faker.location.streetAddress(true),
        contraseña: password,
        esAdmin: false,
        fechaRegistro: faker.date.past({ years: 1 }),
      }
    });
    usuarios.push(usuario);
  }
  
  return usuarios;
}

// Función para crear ubicaciones
async function crearUbicaciones() {
  const ciudadesMexico = [
    { ciudad: 'Ciudad de México', lat: 19.4326, lon: -99.1332 },
    { ciudad: 'Guadalajara', lat: 20.6597, lon: -103.3496 },
    { ciudad: 'Monterrey', lat: 25.6866, lon: -100.3161 },
    { ciudad: 'Puebla', lat: 19.0414, lon: -98.2063 },
    { ciudad: 'Cancún', lat: 21.1619, lon: -86.8515 },
    { ciudad: 'Tijuana', lat: 32.5149, lon: -117.0382 },
    { ciudad: 'Mérida', lat: 20.9674, lon: -89.5926 },
    { ciudad: 'León', lat: 21.1167, lon: -101.6833 },
    { ciudad: 'Acapulco', lat: 16.8531, lon: -99.8237 },
    { ciudad: 'Querétaro', lat: 20.5881, lon: -100.3899 },
    { ciudad: 'Toluca', lat: 19.2826, lon: -99.6557 },
    { ciudad: 'Cuernavaca', lat: 18.9242, lon: -99.2216 },
    { ciudad: 'Oaxaca', lat: 17.0732, lon: -96.7266 },
    { ciudad: 'San Luis Potosí', lat: 22.1565, lon: -100.9855 },
    { ciudad: 'Zacatecas', lat: 22.7709, lon: -102.5832 }
  ];
  
  const ubicaciones = [];
  
  for (const ciudad of ciudadesMexico) {
    // Crear ubicación principal en el centro de la ciudad
    const ubicacionCentro = await prisma.ubicacion.create({
      data: {
        nombre: `Centro de ${ciudad.ciudad}`,
        descripcion: `Ubicación central en ${ciudad.ciudad}`,
        latitud: ciudad.lat,
        longitud: ciudad.lon,
        esActiva: true,
      }
    });
    ubicaciones.push(ubicacionCentro);
    
    // Crear ubicación alternativa en la misma ciudad (con ligera variación en coordenadas)
    if (ubicaciones.length < NUMERO_UBICACIONES) {
      const ubicacionAlternativa = await prisma.ubicacion.create({
        data: {
          nombre: `Área Norte de ${ciudad.ciudad}`,
          descripcion: `Ubicación alternativa en el norte de ${ciudad.ciudad}`,
          latitud: ciudad.lat + (Math.random() * 0.05),
          longitud: ciudad.lon + (Math.random() * 0.05),
          esActiva: Math.random() > 0.1, // 10% de probabilidad de estar inactiva
        }
      });
      ubicaciones.push(ubicacionAlternativa);
    }
  }
  
  return ubicaciones.slice(0, NUMERO_UBICACIONES);
}

// Función para crear autos
async function crearAutos(usuarios, ubicaciones) {
  const marcasModelos = [
    { marca: 'Toyota', modelos: ['Corolla', 'Camry', 'RAV4', 'Yaris', 'Hilux', 'Prius'] },
    { marca: 'Honda', modelos: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Fit'] },
    { marca: 'Nissan', modelos: ['Sentra', 'Versa', 'Altima', 'X-Trail', 'Kicks', 'March'] },
    { marca: 'Volkswagen', modelos: ['Jetta', 'Golf', 'Tiguan', 'Vento', 'Polo', 'Taos'] },
    { marca: 'Chevrolet', modelos: ['Aveo', 'Onix', 'Spark', 'Trax', 'Malibu', 'Equinox'] },
    { marca: 'Ford', modelos: ['Focus', 'Fiesta', 'Escape', 'EcoSport', 'Explorer', 'Mustang'] },
    { marca: 'Mazda', modelos: ['Mazda3', 'Mazda6', 'CX-3', 'CX-5', 'CX-30'] },
    { marca: 'Kia', modelos: ['Rio', 'Forte', 'Sportage', 'Seltos', 'Soul'] },
    { marca: 'Hyundai', modelos: ['Accent', 'Elantra', 'Tucson', 'Creta', 'i10'] },
    { marca: 'BMW', modelos: ['Serie 1', 'Serie 3', 'X1', 'X3', 'X5'] },
    { marca: 'Mercedes-Benz', modelos: ['Clase A', 'Clase C', 'GLA', 'GLC', 'GLE'] },
    { marca: 'Audi', modelos: ['A1', 'A3', 'A4', 'Q3', 'Q5'] }
  ];
  
  const tipos = ['Sedán', 'SUV', 'Hatchback', 'Pickup', 'Coupé', 'Convertible', 'Crossover'];
  const colores = ['Rojo', 'Azul', 'Negro', 'Blanco', 'Plata', 'Gris', 'Verde', 'Amarillo', 'Naranja', 'Café'];
  
  const autos = [];
  
  // Obtener solo usuarios no administradores para ser propietarios
  const propietariosPotenciales = usuarios.filter(u => !u.esAdmin);
  
  for (let i = 0; i < NUMERO_AUTOS; i++) {
    // Seleccionar marca y modelo al azar
    const marcaModeloIndex = Math.floor(Math.random() * marcasModelos.length);
    const marca = marcasModelos[marcaModeloIndex].marca;
    const modeloIndex = Math.floor(Math.random() * marcasModelos[marcaModeloIndex].modelos.length);
    const modelo = marcasModelos[marcaModeloIndex].modelos[modeloIndex];
    
    // Seleccionar propietario al azar (no admin)
    const propietarioIndex = Math.floor(Math.random() * propietariosPotenciales.length);
    const propietario = propietariosPotenciales[propietarioIndex];
    
    // Seleccionar ubicación al azar
    const ubicacionIndex = Math.floor(Math.random() * ubicaciones.length);
    const ubicacion = ubicaciones[ubicacionIndex];
    
    // Generar año entre 2010 y 2024
    const año = 2010 + Math.floor(Math.random() * 15);
    
    // Generar placa única
    const placa = `${faker.string.alpha(3).toUpperCase()}${faker.string.numeric(3)}${faker.string.alpha(1).toUpperCase()}`;
    
    // Tipo de auto al azar
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    
    // Color al azar
    const color = colores[Math.floor(Math.random() * colores.length)];
    
    // Generar precio de renta (entre 150 y 600 pesos)
    const precioRentaDiario = 150 + Math.floor(Math.random() * 450);
    
    // Generar monto de garantía (entre 5000 y 20000 pesos)
    const montoGarantia = 1000 + Math.floor(Math.random() * 4000);
    
    // Determinar transmisión
    const transmision = Math.random() > 0.6 ? 'AUTOMATICO' : 'MANUAL';
    
    // Determinar combustible
    const combustibleRandom = Math.random();
    let combustible = 'GASOLINA';
    if (combustibleRandom > 0.8) combustible = 'DIESEL';
    else if (combustibleRandom > 0.7) combustible = 'HIBRIDO';
    else if (combustibleRandom > 0.95) combustible = 'ELECTRICO';
    
    // Crear auto
    const auto = await prisma.auto.create({
      data: {
        idPropietario: propietario.idUsuario,
        idUbicacion: ubicacion.idUbicacion,
        marca,
        modelo,
        descripcion: `${marca} ${modelo} ${año} en excelentes condiciones. ${
          Math.random() > 0.7 ? 'Recientemente revisado. ' : ''
        }${
          Math.random() > 0.5 ? 'A/C, radio, USB. ' : ''
        }${
          Math.random() > 0.6 ? 'Ideal para viajes familiares. ' : ''
        }${
          Math.random() > 0.8 ? 'Bajo consumo de combustible.' : ''
        }`,
        precioRentaDiario,
        montoGarantia,
        kilometraje: Math.floor(Math.random() * 100000) + 5000,
        tipo,
        año,
        placa,
        color,
        estado: Math.random() > 0.1 ? 'ACTIVO' : 'INACTIVO', // 10% inactivos
        fechaAdquisicion: faker.date.past({ years: 5 }),
        asientos: tipo === 'Pickup' ? 5 : (tipo === 'SUV' ? 7 : 5),
        capacidadMaletero: tipo === 'SUV' ? 500 : (tipo === 'Sedán' ? 400 : 350),
        transmision,
        combustible,
        calificacionPromedio: null, // Se actualizará después
        totalComentarios: 0, // Se actualizará después
        diasTotalRenta: 0, // Se actualizará después
        vecesAlquilado: 0 // Se actualizará después
      }
    });
    
    autos.push(auto);
  }
  
  return autos;
}

// Función para crear imágenes de autos
async function crearImagenesAutos(autos) {
  const imagenPorAuto = 3; // Número de imágenes por auto
  
  for (const auto of autos) {
    const autoNombre = `${auto.marca}_${auto.modelo}_${auto.año}`.replace(/\s/g, '');
    
    for (let i = 1; i <= imagenPorAuto; i++) {
      await prisma.imagen.create({
        data: {
          idAuto: auto.idAuto,
          direccionImagen: `https://storage.rentauto.com/autos/${autoNombre}_${i}.jpg`
        }
      });
    }
  }
}

// Función para crear periodos de disponibilidad
async function crearDisponibilidad(autos) {
  // Solo algunos autos tendrán periodos de no disponibilidad
  const autosConNoDisponibilidad = autos.filter(() => Math.random() > 0.7);
  
  const motivos = ['MANTENIMIENTO', 'REPARACION', 'USO_PERSONAL', 'OTRO'];
  
  for (const auto of autosConNoDisponibilidad) {
    // Generar entre 1 y 3 periodos de no disponibilidad
    const numPeriodos = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numPeriodos; i++) {
      // Fechas aleatorias en los próximos 3 meses
      const fechaInicio = faker.date.soon({ days: 90 });
      const duracionDias = Math.floor(Math.random() * 7) + 1; // Entre 1 y 7 días
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + duracionDias);
      
      // Motivo aleatorio
      const motivo = motivos[Math.floor(Math.random() * motivos.length)];
      
      // Descripción según el motivo
      let descripcion = '';
      if (motivo === 'MANTENIMIENTO') {
        descripcion = 'Mantenimiento programado';
      } else if (motivo === 'REPARACION') {
        descripcion = 'Reparación necesaria';
      } else if (motivo === 'USO_PERSONAL') {
        descripcion = 'Uso personal del propietario';
      } else {
        descripcion = 'Otro motivo de no disponibilidad';
      }
      
      await prisma.disponibilidad.create({
        data: {
          idAuto: auto.idAuto,
          fechaInicio,
          fechaFin,
          motivo,
          descripcion
        }
      });
    }
  }
}

// Función para crear reservas
async function crearReservas(autos, usuarios) {
  const reservas = [];
  const estadosReserva = ['SOLICITADA', 'APROBADA', 'RECHAZADA', 'CONFIRMADA', 'CANCELADA', 'EN_CURSO', 'FINALIZADA'];
  
  // Filtrar usuarios no administradores
  const clientesPotenciales = usuarios.filter(u => !u.esAdmin);
  
  // Para cada auto, crear entre 0 y 5 reservas
  for (const auto of autos) {
    // Evitar que el propietario rente su propio auto
    const clientesDisponibles = clientesPotenciales.filter(u => u.idUsuario !== auto.idPropietario);
    
    // Número aleatorio de reservas para este auto
    const numReservas = Math.floor(Math.random() * 6); // 0 a 5 reservas
    
    for (let i = 0; i < numReservas && reservas.length < NUMERO_RESERVAS; i++) {
      // Seleccionar cliente al azar
      const clienteIndex = Math.floor(Math.random() * clientesDisponibles.length);
      const cliente = clientesDisponibles[clienteIndex];
      
      // Determinar si la reserva es pasada, actual o futura
      const tipoReserva = Math.random();
      
      let fechaInicio;
      let fechaFin;
      let estado;
      
      if (tipoReserva < 0.5) { // Reserva pasada
        fechaInicio = faker.date.past({ years: 1, refDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) });
        const duracionDias = Math.floor(Math.random() * 10) + 1; // 1 a 10 días
        fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaInicio.getDate() + duracionDias);
        
        // Estados posibles para reservas pasadas
        const estadosPasados = ['FINALIZADA', 'CANCELADA', 'RECHAZADA'];
        estado = estadosPasados[Math.floor(Math.random() * estadosPasados.length)];
      } else if (tipoReserva < 0.6) { // Reserva en curso
        fechaInicio = faker.date.recent({ days: 5 });
        const duracionDias = Math.floor(Math.random() * 5) + 1; // 1 a 5 días
        fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaInicio.getDate() + duracionDias);
        estado = 'EN_CURSO';
      } else { // Reserva futura
        fechaInicio = faker.date.soon({ days: 60 });
        const duracionDias = Math.floor(Math.random() * 7) + 1; // 1 a 7 días
        fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaInicio.getDate() + duracionDias);
        
        // Estados posibles para reservas futuras
        const estadosFuturos = ['SOLICITADA', 'APROBADA', 'CONFIRMADA'];
        estado = estadosFuturos[Math.floor(Math.random() * estadosFuturos.length)];
      }
      
      // Calcular monto total basado en días y precio del auto
      const tiempoMS = fechaFin.getTime() - fechaInicio.getTime();
      const dias = Math.ceil(tiempoMS / (1000 * 60 * 60 * 24));
      const montoTotal = auto.precioRentaDiario * dias;
      
      // Fecha de solicitud (siempre anterior a la fecha de inicio)
      const fechaSolicitud = new Date(fechaInicio);
      fechaSolicitud.setDate(fechaInicio.getDate() - Math.floor(Math.random() * 14) - 1); // 1 a 14 días antes
      
      // Fecha límite de pago (siempre después de solicitud pero antes de inicio)
      const fechaLimitePago = new Date(fechaInicio);
      fechaLimitePago.setDate(fechaInicio.getDate() - 1);
      
      // Fecha de aprobación (si aplica)
      let fechaAprobacion = null;
      if (['APROBADA', 'CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(estado)) {
        fechaAprobacion = new Date(fechaSolicitud);
        fechaAprobacion.setDate(fechaSolicitud.getDate() + Math.floor(Math.random() * 2) + 1); // 1 a 2 días después
      }
      
      // Kilometraje (solo para reservas finalizadas o en curso)
      let kilometrajeInicial = null;
      let kilometrajeFinal = null;
      
      if (['EN_CURSO', 'FINALIZADA'].includes(estado)) {
        kilometrajeInicial = auto.kilometraje;
        kilometrajeFinal = estado === 'FINALIZADA' ? kilometrajeInicial + Math.floor(Math.random() * 500) + 50 : null;
      }
      
      // Estado de pago
      const estaPagada = ['CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(estado);
      
      const reserva = await prisma.reserva.create({
        data: {
          fechaInicio,
          fechaFin,
          idAuto: auto.idAuto,
          idCliente: cliente.idUsuario,
          estado,
          fechaSolicitud,
          fechaAprobacion,
          fechaLimitePago,
          montoTotal,
          kilometrajeInicial,
          kilometrajeFinal,
          estaPagada
        }
      });
      
      reservas.push(reserva);
    }
  }
  
  return reservas;
}

// Función para crear pagos
async function crearPagos(reservas) {
  const metodosPago = ['QR', 'TARJETA_DEBITO'];
  
  for (const reserva of reservas) {
    // Solo crear pagos para reservas aprobadas, confirmadas, en curso o finalizadas
    if (['APROBADA', 'CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(reserva.estado)) {
      // Método de pago aleatorio
      const metodoPago = metodosPago[Math.floor(Math.random() * metodosPago.length)];
      
      // Fecha de pago (después de la aprobación pero antes del inicio)
      const fechaPago = new Date(reserva.fechaAprobacion || reserva.fechaSolicitud);
      fechaPago.setDate(fechaPago.getDate() + Math.floor(Math.random() * 2) + 1);
      
      // Referencias según método de pago
      const referencia = metodoPago === 'QR' 
        ? `QR${faker.string.alphanumeric(8).toUpperCase()}`
        : `TD${faker.string.numeric(6)}`;
      
      const comprobante = `https://storage.rentauto.com/comprobantes/pago_${reserva.idReserva}_${faker.string.alphanumeric(6)}.pdf`;
      
      // Crear pago de renta
      if (reserva.estado !== 'APROBADA') {
        await prisma.pago.create({
          data: {
            idReserva: reserva.idReserva,
            monto: reserva.montoTotal,
            fechaPago,
            metodoPago,
            referencia,
            comprobante,
            tipo: 'RENTA'
          }
        });
      }
      
      // Para algunos casos, crear también el pago de garantía
      if (['CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(reserva.estado) && Math.random() > 0.3) {
        // Buscar el auto relacionado con la reserva
        const auto = await prisma.auto.findUnique({
          where: { idAuto: reserva.idAuto }
        });
        
        if (auto) {
          await prisma.pago.create({
            data: {
              idReserva: reserva.idReserva,
              monto: auto.montoGarantia,
              fechaPago: new Date(fechaPago),
              metodoPago,
              referencia: `G${referencia}`,
              comprobante: `https://storage.rentauto.com/comprobantes/garantia_${reserva.idReserva}_${faker.string.alphanumeric(6)}.pdf`,
              tipo: 'GARANTIA'
            }
          });
        }
      }
    }
  }
}

// Función para crear garantías
async function crearGarantias(reservas) {
  for (const reserva of reservas) {
    // Solo crear garantías para reservas confirmadas, en curso o finalizadas
    if (['CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(reserva.estado)) {
      // Buscar el auto relacionado con la reserva
      const auto = await prisma.auto.findUnique({
        where: { idAuto: reserva.idAuto }
      });
      
      if (auto) {
        // Estado de la garantía según el estado de la reserva
        let estadoGarantia = 'DEPOSITADA';
        let fechaLiberacion = null;
        
        if (reserva.estado === 'FINALIZADA') {
          estadoGarantia = Math.random() > 0.1 ? 'LIBERADA' : 'RETENIDA';
          if (estadoGarantia === 'LIBERADA') {
            fechaLiberacion = new Date(reserva.fechaFin);
            fechaLiberacion.setDate(reserva.fechaFin.getDate() + Math.floor(Math.random() * 3) + 1);
          }
        }
        
        // Fecha de depósito (1-2 días después de la aprobación)
        const fechaDeposito = new Date(reserva.fechaAprobacion || reserva.fechaSolicitud);
        fechaDeposito.setDate(fechaDeposito.getDate() + Math.floor(Math.random() * 2) + 1);
        
        await prisma.garantia.create({
          data: {
            idReserva: reserva.idReserva,
            monto: auto.montoGarantia,
            fechaDeposito,
            fechaLiberacion,
            estado: estadoGarantia,
            comprobante: Math.random() > 0.3 ? `https://storage.rentauto.com/comprobantes/garantia_${reserva.idReserva}.pdf` : null
          }
        });
      }
    }
  }
}

// Función para crear historial de mantenimiento
async function crearHistorialMantenimiento(autos) {
  const tiposMantenimiento = ['PREVENTIVO', 'CORRECTIVO', 'REVISION'];
  
  // Solo algunos autos tendrán historial de mantenimiento
  const autosConMantenimiento = autos.filter(() => Math.random() > 0.3);
  
  for (const auto of autosConMantenimiento) {
    // Número aleatorio de registros de mantenimiento (1-5)
    const numRegistros = Math.floor(Math.random() * 5) + 1;
    
    // Kilometraje actual del auto
    let kilometrajeActual = auto.kilometraje;
    
    for (let i = 0; i < numRegistros; i++) {
      // Tipo de mantenimiento aleatorio
      const tipoMantenimiento = tiposMantenimiento[Math.floor(Math.random() * tiposMantenimiento.length)];
      
      // Fecha de mantenimiento en el último año
      const fechaInicio = faker.date.past({ years: 1 });
      
      // Fecha fin (algunos pueden estar en curso, otros ya terminados)
      let fechaFin = null;
      if (Math.random() > 0.2) { // 80% ya están terminados
        fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaInicio.getDate() + Math.floor(Math.random() * 5) + 1); // 1-5 días después
      }
      
      // Descripción según el tipo de mantenimiento
      let descripcion = '';
      if (tipoMantenimiento === 'PREVENTIVO') {
        descripcion = `Mantenimiento preventivo ${Math.floor(Math.random() * 10) + 1}0,000 km. ${
          Math.random() > 0.5 ? 'Cambio de aceite y filtros. ' : ''
        }${
          Math.random() > 0.6 ? 'Revisión de frenos. ' : ''
        }${
          Math.random() > 0.7 ? 'Alineación y balanceo. ' : ''
        }`;
      } else if (tipoMantenimiento === 'CORRECTIVO') {
        descripcion = `Reparación ${
          Math.random() > 0.3 ? 'de sistema de frenos. ' : 
          Math.random() > 0.5 ? 'del sistema eléctrico. ' : 
          Math.random() > 0.7 ? 'de la transmisión. ' : 'del motor. '
        }${
          Math.random() > 0.5 ? 'Incluyó cambio de piezas. ' : ''
        }`;
      } else {
        descripcion = `Revisión general del vehículo. ${
          Math.random() > 0.6 ? 'Verificación de niveles. ' : ''
        }${
          Math.random() > 0.7 ? 'Inspección de neumáticos. ' : ''
        }`;
      }
      
      // Costo del mantenimiento
      const costo = tipoMantenimiento === 'CORRECTIVO' 
        ? 2000 + Math.floor(Math.random() * 8000) // 2000-10000 para correctivos
        : tipoMantenimiento === 'PREVENTIVO'
          ? 800 + Math.floor(Math.random() * 2200) // 800-3000 para preventivos
          : 500 + Math.floor(Math.random() * 500); // 500-1000 para revisiones
      
      // Kilometraje aleatorio para este mantenimiento (siempre menor al actual)
      const kilometraje = kilometrajeActual - Math.floor(Math.random() * 5000) - 1000;
      kilometrajeActual = kilometraje; // Actualizar para el siguiente registro
      
      await prisma.historialMantenimiento.create({
        data: {
          idAuto: auto.idAuto,
          fechaInicio,
          fechaFin,
          descripcion,
          costo,
          tipoMantenimiento,
          kilometraje
        }
      });
    }
  }
}

// Función para crear comentarios y actualizar calificaciones
async function crearComentarios(autos, usuarios, reservas) {
  // Filtrar reservas finalizadas
  const reservasFinalizadas = reservas.filter(r => r.estado === 'FINALIZADA');
  
  // Comentarios predefinidos según calificación
  const comentariosPorCalificacion = {
    1: [
      'Muy mala experiencia, no lo recomendaría.',
      'El auto estaba en pésimas condiciones.',
      'Muchos problemas con este vehículo.',
      'No cumplió con mis expectativas en absoluto.',
      'Definitivamente no volvería a rentar este auto.'
    ],
    2: [
      'Experiencia por debajo de lo esperado.',
      'El auto tenía varios detalles que no se mencionaron.',
      'Funcionó, pero con varios problemas.',
      'No estoy satisfecho con la renta.',
      'Muchos aspectos por mejorar.'
    ],
    3: [
      'Una experiencia normal, sin destacar.',
      'El auto cumplió su función básica.',
      'Servicio aceptable, pero podría mejorar.',
      'Relación precio-calidad justa.',
      'Ni bueno ni malo, simplemente estándar.'
    ],
    4: [
      'Buena experiencia en general.',
      'Auto en buenas condiciones, recomendable.',
      'Satisfecho con el servicio y el vehículo.',
      'Experiencia positiva, lo rentaría de nuevo.',
      'Buena opción para viajes cortos y largos.'
    ],
    5: [
      'Excelente vehículo, totalmente recomendado.',
      'La mejor experiencia de renta que he tenido.',
      'Auto impecable y en perfectas condiciones.',
      'Superó todas mis expectativas, 100% satisfecho.',
      'Definitivamente volveré a rentar este auto.'
    ]
  };
  
  // Para cada reserva finalizada, crear un comentario con probabilidad alta
  for (const reserva of reservasFinalizadas) {
    // 85% de probabilidad de tener comentario
    if (Math.random() <= 0.85) {
      // Calificación aleatoria (con mayor probabilidad de buenas calificaciones)
      const calificacionRandom = Math.random();
      let calificacion;
      if (calificacionRandom < 0.05) calificacion = 1;
      else if (calificacionRandom < 0.15) calificacion = 2;
      else if (calificacionRandom < 0.35) calificacion = 3;
      else if (calificacionRandom < 0.7) calificacion = 4;
      else calificacion = 5;
      
      // Seleccionar comentario aleatorio según calificación
      const comentarios = comentariosPorCalificacion[calificacion];
      const contenido = comentarios[Math.floor(Math.random() * comentarios.length)];
      
      // Fecha de creación (entre la fecha de finalización y una semana después)
      const fechaCreacion = new Date(reserva.fechaFin);
      fechaCreacion.setDate(fechaCreacion.getDate() + Math.floor(Math.random() * 7) + 1);
      
      await prisma.comentario.create({
        data: {
          idAuto: reserva.idAuto,
          idUsuario: reserva.idCliente,
          contenido,
          calificacion,
          fechaCreacion,
          idReserva: reserva.idReserva
        }
      });
    }
  }
  
  // Crear algunos comentarios adicionales (no vinculados a reservas)
  const numeroComentariosAdicionales = NUMERO_COMENTARIOS - reservasFinalizadas.length;
  if (numeroComentariosAdicionales > 0) {
    for (let i = 0; i < numeroComentariosAdicionales; i++) {
      // Seleccionar auto al azar
      const autoIndex = Math.floor(Math.random() * autos.length);
      const auto = autos[autoIndex];
      
      // Seleccionar usuario al azar (que no sea el propietario)
      const usuariosDisponibles = usuarios.filter(u => u.idUsuario !== auto.idPropietario && !u.esAdmin);
      if (usuariosDisponibles.length === 0) continue;
      
      const usuarioIndex = Math.floor(Math.random() * usuariosDisponibles.length);
      const usuario = usuariosDisponibles[usuarioIndex];
      
      // Calificación aleatoria
      const calificacionRandom = Math.random();
      let calificacion;
      if (calificacionRandom < 0.05) calificacion = 1;
      else if (calificacionRandom < 0.15) calificacion = 2;
      else if (calificacionRandom < 0.35) calificacion = 3;
      else if (calificacionRandom < 0.7) calificacion = 4;
      else calificacion = 5;
      
      // Seleccionar comentario aleatorio según calificación
      const comentarios = comentariosPorCalificacion[calificacion];
      const contenido = comentarios[Math.floor(Math.random() * comentarios.length)];
      
      // Fecha de creación (en el último año)
      const fechaCreacion = faker.date.past({ years: 1 });
      
      await prisma.comentario.create({
        data: {
          idAuto: auto.idAuto,
          idUsuario: usuario.idUsuario,
          contenido,
          calificacion,
          fechaCreacion
        }
      });
    }
  }
}

// Función para crear calificaciones de usuarios
async function crearCalificacionesUsuarios(reservas) {
  // Filtrar reservas finalizadas
  const reservasFinalizadas = reservas.filter(r => r.estado === 'FINALIZADA');
  
  // Comentarios predefinidos para arrendadores según calificación
  const comentariosArrendador = {
    1: [
      'Propietario poco responsable y difícil de contactar.',
      'No cumplió con las condiciones acordadas.',
      'Auto entregado en malas condiciones.',
      'Mala atención y servicio deficiente.',
      'Problemas con la devolución del depósito.'
    ],
    2: [
      'Servicio por debajo de lo esperado.',
      'Varios inconvenientes con el propietario.',
      'Comunicación deficiente.',
      'No fue puntual en la entrega.',
      'Auto con condiciones diferentes a las anunciadas.'
    ],
    3: [
      'Servicio regular, sin destacar.',
      'Atención estándar durante la renta.',
      'Sin problemas graves pero puede mejorar.',
      'Comunicación aceptable.',
      'Propietario correcto pero sin valor agregado.'
    ],
    4: [
      'Buen propietario, atento y responsable.',
      'Buena comunicación durante toda la renta.',
      'Auto entregado en buenas condiciones.',
      'Proceso de renta sencillo y agradable.',
      'Recomendable para futuras rentas.'
    ],
    5: [
      'Excelente propietario, muy recomendable.',
      'Servicio impecable y gran atención.',
      'Muy profesional y puntual.',
      'La mejor experiencia de renta que he tenido.',
      'Auto en perfectas condiciones y trato excelente.'
    ]
  };
  
  // Comentarios predefinidos para arrendatarios según calificación
  const comentariosArrendatario = {
    1: [
      'Cliente irresponsable con el vehículo.',
      'No respetó las condiciones de uso.',
      'Devolvió el auto con daños.',
      'Pésima comunicación y puntualidad.',
      'No seguía las instrucciones de uso del vehículo.'
    ],
    2: [
      'Cliente con poca seriedad.',
      'Devolvió el auto sucio y con problemas.',
      'Difícil comunicación durante la renta.',
      'No cuidó adecuadamente el vehículo.',
      'Varios inconvenientes con este cliente.'
    ],
    3: [
      'Cliente normal, sin problemas graves.',
      'Cuidado básico del vehículo.',
      'Comunicación estándar durante la renta.',
      'Sin contratiempos importantes.',
      'Experiencia regular con este cliente.'
    ],
    4: [
      'Buen cliente, responsable con el auto.',
      'Buena comunicación durante la renta.',
      'Devolvió el vehículo en buenas condiciones.',
      'Respetuoso con las normas establecidas.',
      'Recomendable para futuras rentas.'
    ],
    5: [
      'Cliente excelente, muy recomendable.',
      'Cuidó el auto perfectamente.',
      'Comunicación y puntualidad excelentes.',
      'El mejor cliente que he tenido.',
      'Totalmente confiable y responsable.'
    ]
  };
  
  for (const reserva of reservasFinalizadas) {
    // Obtener datos necesarios
    const auto = await prisma.auto.findUnique({
      where: { idAuto: reserva.idAuto }
    });
    
    if (!auto) continue;
    
    // 80% de probabilidad de que haya calificaciones en ambas direcciones
    if (Math.random() <= 0.8) {
      // 1. Calificación del arrendatario al arrendador
      const calificacionAlArrendador = Math.floor(Math.random() * 5) + 1;
      const comentariosArrendadorArray = comentariosArrendador[calificacionAlArrendador];
      const comentarioAlArrendador = comentariosArrendadorArray[Math.floor(Math.random() * comentariosArrendadorArray.length)];
      
      // Fecha de creación (entre la fecha de finalización y una semana después)
      const fechaCreacionArrendador = new Date(reserva.fechaFin);
      fechaCreacionArrendador.setDate(fechaCreacionArrendador.getDate() + Math.floor(Math.random() * 5) + 1);
      
      await prisma.calificacionUsuario.create({
        data: {
          idCalificador: reserva.idCliente, // El cliente califica
          idCalificado: auto.idPropietario, // Al propietario
          puntuacion: calificacionAlArrendador,
          comentario: comentarioAlArrendador,
          fechaCreacion: fechaCreacionArrendador,
          idReserva: reserva.idReserva,
          tipoCalificacion: 'ARRENDADOR'
        }
      });
      
      // 2. Calificación del arrendador al arrendatario
      const calificacionAlArrendatario = Math.floor(Math.random() * 5) + 1;
      const comentariosArrendatarioArray = comentariosArrendatario[calificacionAlArrendatario];
      const comentarioAlArrendatario = comentariosArrendatarioArray[Math.floor(Math.random() * comentariosArrendatarioArray.length)];
      
      // Fecha de creación (entre la fecha de finalización y una semana después)
      const fechaCreacionArrendatario = new Date(reserva.fechaFin);
      fechaCreacionArrendatario.setDate(fechaCreacionArrendatario.getDate() + Math.floor(Math.random() * 5) + 1);
      
      await prisma.calificacionUsuario.create({
        data: {
          idCalificador: auto.idPropietario, // El propietario califica
          idCalificado: reserva.idCliente, // Al cliente
          puntuacion: calificacionAlArrendatario,
          comentario: comentarioAlArrendatario,
          fechaCreacion: fechaCreacionArrendatario,
          idReserva: reserva.idReserva,
          tipoCalificacion: 'ARRENDATARIO'
        }
      });
    }
  }
}

// Función para crear notificaciones
async function crearNotificaciones(usuarios, reservas, autos) {
  // Plantillas de notificaciones según el tipo
  const plantillasNotificaciones = {
    RESERVA_SOLICITADA: {
      titulo: 'Nueva solicitud de reserva',
      mensaje: 'Has recibido una nueva solicitud de reserva para tu vehículo {modelo}.',
      prioridad: 'ALTA'
    },
    RESERVA_APROBADA: {
      titulo: 'Reserva aprobada',
      mensaje: 'Tu solicitud de reserva para el vehículo {modelo} ha sido aprobada.',
      prioridad: 'ALTA'
    },
    RESERVA_RECHAZADA: {
      titulo: 'Reserva rechazada',
      mensaje: 'Lo sentimos, tu solicitud de reserva para el vehículo {modelo} ha sido rechazada.',
      prioridad: 'MEDIA'
    },
    DEPOSITO_CONFIRMADO: {
      titulo: 'Pago confirmado',
      mensaje: 'Se ha confirmado el pago para tu reserva del vehículo {modelo}.',
      prioridad: 'ALTA'
    },
    DEPOSITO_RECIBIDO: {
      titulo: 'Depósito recibido',
      mensaje: 'Se ha recibido el depósito de garantía para la reserva del vehículo {modelo}.',
      prioridad: 'MEDIA'
    },
    RESERVA_CANCELADA: {
      titulo: 'Reserva cancelada',
      mensaje: 'Tu reserva para el vehículo {modelo} ha sido cancelada.',
      prioridad: 'ALTA'
    },
    ALQUILER_FINALIZADO: {
      titulo: 'Alquiler finalizado',
      mensaje: 'Tu periodo de alquiler del vehículo {modelo} ha finalizado.',
      prioridad: 'MEDIA'
    },
    RESERVA_MODIFICADA: {
      titulo: 'Reserva modificada',
      mensaje: 'Se han realizado cambios en tu reserva para el vehículo {modelo}.',
      prioridad: 'MEDIA'
    },
    VEHICULO_CALIFICADO: {
      titulo: 'Nuevo comentario recibido',
      mensaje: 'Has recibido una nueva calificación para tu vehículo {modelo}.',
      prioridad: 'BAJA'
    }
  };
  
  // Para cada reserva, crear notificaciones correspondientes
  for (const reserva of reservas) {
    // Obtener auto y usuarios relacionados
    const auto = await prisma.auto.findUnique({
      where: { idAuto: reserva.idAuto }
    });
    
    if (!auto) continue;
    
    const propietario = await prisma.usuario.findUnique({
      where: { idUsuario: auto.idPropietario }
    });
    
    const cliente = await prisma.usuario.findUnique({
      where: { idUsuario: reserva.idCliente }
    });
    
    if (!propietario || !cliente) continue;
    
    // Crear notificaciones según el estado de la reserva
    let tiposNotificacion = [];
    
    switch (reserva.estado) {
      case 'SOLICITADA':
        tiposNotificacion.push({ tipo: 'RESERVA_SOLICITADA', usuario: propietario });
        break;
      case 'APROBADA':
        tiposNotificacion.push({ tipo: 'RESERVA_APROBADA', usuario: cliente });
        break;
      case 'RECHAZADA':
        tiposNotificacion.push({ tipo: 'RESERVA_RECHAZADA', usuario: cliente });
        break;
      case 'CONFIRMADA':
        tiposNotificacion.push({ tipo: 'DEPOSITO_CONFIRMADO', usuario: propietario });
        tiposNotificacion.push({ tipo: 'DEPOSITO_RECIBIDO', usuario: cliente });
        break;
      case 'CANCELADA':
        tiposNotificacion.push({ tipo: 'RESERVA_CANCELADA', usuario: propietario });
        tiposNotificacion.push({ tipo: 'RESERVA_CANCELADA', usuario: cliente });
        break;
      case 'FINALIZADA':
        tiposNotificacion.push({ tipo: 'ALQUILER_FINALIZADO', usuario: propietario });
        tiposNotificacion.push({ tipo: 'ALQUILER_FINALIZADO', usuario: cliente });
        
        // Posible notificación de calificación para algunos casos
        if (Math.random() > 0.7) {
          tiposNotificacion.push({ tipo: 'VEHICULO_CALIFICADO', usuario: propietario });
        }
        break;
    }
    
    // Crear las notificaciones
    for (const { tipo, usuario } of tiposNotificacion) {
      const plantilla = plantillasNotificaciones[tipo];
      
      // Reemplazar placeholders en el mensaje
      const mensaje = plantilla.mensaje.replace('{modelo}', `${auto.marca} ${auto.modelo}`);
      
      // Fecha de creación (acorde al estado de la reserva)
      let fechaCreacion;
      switch (tipo) {
        case 'RESERVA_SOLICITADA':
          fechaCreacion = reserva.fechaSolicitud;
          break;
        case 'RESERVA_APROBADA':
        case 'RESERVA_RECHAZADA':
          fechaCreacion = reserva.fechaAprobacion || reserva.fechaSolicitud;
          break;
        case 'ALQUILER_FINALIZADO':
          fechaCreacion = reserva.fechaFin;
          break;
        default:
          // Corrección: asegurarse que la fecha 'from' sea anterior a la fecha 'to'
          const ahora = new Date();
          const fechaBase = reserva.fechaSolicitud && reserva.fechaSolicitud <= ahora ? 
                         reserva.fechaSolicitud : 
                         new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás por defecto
          
          fechaCreacion = faker.date.between({ 
            from: fechaBase, 
            to: ahora 
          });
      }
      
      // Estado de lectura (más antiguas tienen más probabilidad de estar leídas)
      const ahora = new Date();
      const diasDesdeCreacion = (ahora - fechaCreacion) / (1000 * 60 * 60 * 24);
      const probabilidadLeida = Math.min(0.9, diasDesdeCreacion / 30); // Mayor probabilidad si es más antiguo
      const leido = Math.random() < probabilidadLeida;
      const leidoEn = leido ? new Date(fechaCreacion.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null; // 0-24h después
      
      await prisma.notificacion.create({
        data: {
          idUsuario: usuario.idUsuario,
          titulo: plantilla.titulo,
          mensaje,
          idEntidad: reserva.idReserva.toString(),
          tipoEntidad: 'RESERVA',
          leido,
          leidoEn,
          creadoEn: fechaCreacion,
          haSidoBorrada: Math.random() < 0.2, // 20% borradas
          tipo,
          prioridad: plantilla.prioridad
        }
      });
    }
  }
  
  // Crear algunas notificaciones adicionales aleatorias
  const tiposNotificacion = Object.keys(plantillasNotificaciones);
  const notificacionesAdicionales = NUMERO_NOTIFICACIONES - await prisma.notificacion.count();
  
  if (notificacionesAdicionales > 0) {
    for (let i = 0; i < notificacionesAdicionales; i++) {
      // Seleccionar usuario al azar
      const usuarioIndex = Math.floor(Math.random() * usuarios.length);
      const usuario = usuarios[usuarioIndex];
      
      // Seleccionar tipo de notificación al azar
      const tipoIndex = Math.floor(Math.random() * tiposNotificacion.length);
      const tipo = tiposNotificacion[tipoIndex];
      const plantilla = plantillasNotificaciones[tipo];
      
      // Seleccionar auto al azar
      const autoIndex = Math.floor(Math.random() * autos.length);
      const auto = autos[autoIndex];
      
      // Reemplazar placeholders en el mensaje
      const mensaje = plantilla.mensaje.replace('{modelo}', `${auto.marca} ${auto.modelo}`);
      
      // Corrección: asegurarse que se genere una fecha válida en el pasado
      const fechaCreacion = faker.date.past({ days: 90 }); // Usa past en lugar de recent para evitar problemas
      
      // Estado de lectura
      const leido = Math.random() < 0.7; // 70% leídas
      const leidoEn = leido ? new Date(fechaCreacion.getTime() + Math.random() * 48 * 60 * 60 * 1000) : null; // 0-48h después
      
      await prisma.notificacion.create({
        data: {
          idUsuario: usuario.idUsuario,
          titulo: plantilla.titulo,
          mensaje,
          idEntidad: auto.idAuto.toString(),
          tipoEntidad: 'AUTO',
          leido,
          leidoEn,
          creadoEn: fechaCreacion,
          haSidoBorrada: Math.random() < 0.2, // 20% borradas
          tipo,
          prioridad: plantilla.prioridad
        }
      });
    }
  }
}

// Función para actualizar estadísticas de autos
async function actualizarEstadisticasAutos() {
  // Obtener todos los autos
  const autos = await prisma.auto.findMany();
  
  for (const auto of autos) {
    // 1. Actualizar calificación promedio y total de comentarios
    const comentarios = await prisma.comentario.findMany({
      where: { idAuto: auto.idAuto }
    });
    
    const totalComentarios = comentarios.length;
    let calificacionPromedio = null;
    
    if (totalComentarios > 0) {
      const sumaCalificaciones = comentarios.reduce((sum, comment) => sum + comment.calificacion, 0);
      calificacionPromedio = parseFloat((sumaCalificaciones / totalComentarios).toFixed(1));
    }
    
    // 2. Calcular veces alquilado y días totales de renta
    const reservas = await prisma.reserva.findMany({
      where: { 
        idAuto: auto.idAuto,
        estado: { in: ['CONFIRMADA', 'EN_CURSO', 'FINALIZADA'] }
      }
    });
    
    const vecesAlquilado = reservas.length;
    let diasTotalRenta = 0;
    
    for (const reserva of reservas) {
      const tiempoMS = reserva.fechaFin.getTime() - reserva.fechaInicio.getTime();
      const dias = Math.ceil(tiempoMS / (1000 * 60 * 60 * 24));
      diasTotalRenta += dias;
    }
    
    // Actualizar auto
    await prisma.auto.update({
      where: { idAuto: auto.idAuto },
      data: {
        calificacionPromedio,
        totalComentarios,
        vecesAlquilado,
        diasTotalRenta
      }
    });
  }
}

// Ejecutar el script
main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });