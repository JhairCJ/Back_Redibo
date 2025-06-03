const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker/locale/es_MX');

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
  return await password;
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
  
  // Poblar registros de pagos
  console.log('📋 Registrando datos de pagos...');
  await crearRegistroPagos(reservasCreadas, autosCreados);
  
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

  // Actualizar estadísticas de Usuarios
  console.log('📊 Actualizando estadísticas de usuarios...');
  await actualizarEstadisticasUsuarios();
  
  console.log('✅ Base de datos poblada exitosamente!');
}

// Función para crear usuarios
async function crearUsuarios() {
  const usuarios = [];
  
  // Crear un usuario admin fijo para pruebas
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.usuario.create({
    data: {
      nombreCompleto: 'Admin Principal',
      email: 'admin@rentauto.com',
      telefono: '5551234567',
      direccion: 'Calle Administración #123, Ciudad de México',
      contraseña: adminPassword,
      fechaNacimiento: faker.date.past({ years: 30, refDate: new Date('2000-01-01') }),
      registradoCon: 'email', // Campo obligatorio
      esAdmin: true,
      host: true, // Los admins probablemente sean hosts
      verificado: true, // Los admins están verificados
      fechaRegistro: faker.date.past({ years: 1 }),
    }
  });
  usuarios.push(admin);
  
  // Crear usuarios administradores adicionales
  for (let i = 0; i < NUMERO_ADMINS - 1; i++) {
    const password = await hashPassword('adminpass');
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    const usuario = await prisma.usuario.create({
      data: {
        nombreCompleto: `${firstName} ${lastName}`,
        email: faker.internet.email({ 
          firstName: firstName.toLowerCase(),
          lastName: lastName.toLowerCase(),
          provider: 'rentauto.com' 
        }),
        telefono: faker.phone.number('##########'),
        direccion: faker.location.streetAddress(true),
        contraseña: password,
        fechaNacimiento: faker.date.past({ years: 40, refDate: new Date('1990-01-01') }),
        registradoCon: 'email',
        esAdmin: true,
        host: faker.datatype.boolean({ probability: 0.8 }), // 80% probabilidad de ser host
        verificado: true,
        fechaRegistro: faker.date.past({ years: 1 }),
      }
    });
    usuarios.push(usuario);
  }
  
  // Crear usuarios regulares
  for (let i = 0; i < NUMERO_USUARIOS - NUMERO_ADMINS; i++) {
    const password = await hashPassword('userpass');
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const registradoConOptions = ['email', 'google'];
    
    const usuario = await prisma.usuario.create({
      data: {
        nombreCompleto: `${firstName} ${lastName}`,
        email: faker.internet.email({ 
          firstName: firstName.toLowerCase(),
          lastName: lastName.toLowerCase()
        }),
        telefono: faker.phone.number('##########'),
        direccion: faker.location.streetAddress(true),
        contraseña: password,
        fechaNacimiento: faker.date.past({ years: 50, refDate: new Date('1990-01-01') }),
        registradoCon: faker.helpers.arrayElement(registradoConOptions),
        esAdmin: false,
        host: faker.datatype.boolean({ probability: 0.3 }), // 30% probabilidad de ser host
        driverBool: faker.datatype.boolean({ probability: 0.2 }), // 20% probabilidad de ser driver
        verificado: faker.datatype.boolean({ probability: 0.7 }), // 70% están verificados
        fechaRegistro: faker.date.past({ years: 1 }),
      }
    });
    usuarios.push(usuario);
  }
  
  return usuarios;
}

// Función para crear ubicaciones
async function crearUbicaciones() {
  const ubicacionesBolivia = [
    // La Paz
    { nombre: 'Aeropuerto Internacional El Alto', descripcion: 'Punto de recogida en el aeropuerto de El Alto, La Paz', lat: -16.5133, lon: -68.1925, tipo: 'AEROPUERTO' },
    { nombre: 'Terminal de Buses La Paz', descripcion: 'Terminal principal de buses de La Paz', lat: -16.5000, lon: -68.1300, tipo: 'ESTANDAR' },
    { nombre: 'Plaza Murillo La Paz', descripcion: 'Recogida en el centro histórico de La Paz', lat: -16.4955, lon: -68.1336, tipo: 'ESTANDAR' },
    { nombre: 'Zona Sur La Paz - Calacoto', descripcion: 'Punto de recogida en la zona residencial de Calacoto', lat: -16.5400, lon: -68.0800, tipo: 'ESTANDAR' },
    { nombre: 'Universidad Mayor de San Andrés', descripcion: 'Campus universitario UMSA, La Paz', lat: -16.5400, lon: -68.1200, tipo: 'ESTANDAR' },
    
    // Santa Cruz de la Sierra
    { nombre: 'Aeropuerto Viru Viru Santa Cruz', descripcion: 'Aeropuerto Internacional Viru Viru', lat: -17.6448, lon: -63.1354, tipo: 'AEROPUERTO' },
    { nombre: 'Terminal Bimodal Santa Cruz', descripcion: 'Terminal de buses principal de Santa Cruz', lat: -17.7850, lon: -63.1821, tipo: 'ESTANDAR' },
    { nombre: 'Plaza 24 de Septiembre', descripcion: 'Plaza principal del centro de Santa Cruz', lat: -17.7833, lon: -63.1821, tipo: 'ESTANDAR' },
    { nombre: 'Mall Ventura Santa Cruz', descripcion: 'Centro comercial Ventura, Santa Cruz', lat: -17.7600, lon: -63.1500, tipo: 'ESTANDAR' },
    { nombre: 'Universidad Gabriel René Moreno', descripcion: 'Campus UAGRM, Santa Cruz', lat: -17.7700, lon: -63.2000, tipo: 'ESTANDAR' },
    
    // Cochabamba
    { nombre: 'Aeropuerto Jorge Wilstermann', descripcion: 'Aeropuerto Internacional Jorge Wilstermann', lat: -17.4211, lon: -66.1771, tipo: 'AEROPUERTO' },
    { nombre: 'Terminal de Buses Cochabamba', descripcion: 'Terminal principal de buses de Cochabamba', lat: -17.3895, lon: -66.1568, tipo: 'ESTANDAR' },
    { nombre: 'Plaza 14 de Septiembre', descripcion: 'Plaza principal de Cochabamba', lat: -17.3936, lon: -66.1570, tipo: 'ESTANDAR' },
    { nombre: 'Universidad Mayor de San Simón', descripcion: 'Campus UMSS, Cochabamba', lat: -17.3940, lon: -66.1450, tipo: 'ESTANDAR' },
    { nombre: 'Quillacollo Centro', descripcion: 'Centro de Quillacollo, Cochabamba', lat: -17.3922, lon: -66.2781, tipo: 'ESTANDAR' },
    
    // Sucre
    { nombre: 'Aeropuerto Alcantarí Sucre', descripcion: 'Aeropuerto Internacional Alcantarí', lat: -19.0071, lon: -65.2881, tipo: 'AEROPUERTO' },
    { nombre: 'Terminal de Buses Sucre', descripcion: 'Terminal de buses de Sucre', lat: -19.0196, lon: -65.2619, tipo: 'ESTANDAR' },
    { nombre: 'Plaza 25 de Mayo Sucre', descripcion: 'Plaza principal histórica de Sucre', lat: -19.0196, lon: -65.2619, tipo: 'ESTANDAR' },
    { nombre: 'Universidad San Francisco Xavier', descripcion: 'Campus USFX, Sucre', lat: -19.0300, lon: -65.2500, tipo: 'ESTANDAR' },
    
    // El Alto
    { nombre: 'Plaza Ballivián El Alto', descripcion: 'Plaza principal de El Alto', lat: -16.5050, lon: -68.1500, tipo: 'ESTANDAR' },
    { nombre: 'Terminal 16 de Julio El Alto', descripcion: 'Terminal de buses de El Alto', lat: -16.5000, lon: -68.1600, tipo: 'ESTANDAR' },
    { nombre: 'Ceja El Alto', descripcion: 'Zona comercial La Ceja, El Alto', lat: -16.5100, lon: -68.1400, tipo: 'ESTANDAR' },
    
    // Oruro
    { nombre: 'Terminal de Buses Oruro', descripcion: 'Terminal principal de buses de Oruro', lat: -17.9833, lon: -67.1500, tipo: 'ESTANDAR' },
    { nombre: 'Plaza 10 de Febrero Oruro', descripcion: 'Plaza principal de Oruro', lat: -17.9630, lon: -67.1070, tipo: 'ESTANDAR' },
    { nombre: 'Universidad Técnica de Oruro', descripcion: 'Campus UTO, Oruro', lat: -17.9700, lon: -67.1200, tipo: 'ESTANDAR' },
    
    // Potosí
    { nombre: 'Terminal de Buses Potosí', descripcion: 'Terminal de buses de Potosí', lat: -19.5836, lon: -65.7531, tipo: 'ESTANDAR' },
    { nombre: 'Plaza 10 de Noviembre Potosí', descripcion: 'Plaza principal histórica de Potosí', lat: -19.5836, lon: -65.7531, tipo: 'ESTANDAR' },
    
    // Tarija
    { nombre: 'Aeropuerto Capitán Oriel Lea Plaza', descripcion: 'Aeropuerto de Tarija', lat: -21.5557, lon: -64.7013, tipo: 'AEROPUERTO' },
    { nombre: 'Terminal de Buses Tarija', descripcion: 'Terminal principal de buses de Tarija', lat: -21.5355, lon: -64.7296, tipo: 'ESTANDAR' },
    { nombre: 'Plaza Luis de Fuentes Tarija', descripcion: 'Plaza principal de Tarija', lat: -21.5355, lon: -64.7296, tipo: 'ESTANDAR' },
    
    // Trinidad
    { nombre: 'Aeropuerto Trinidad', descripcion: 'Aeropuerto de Trinidad, Beni', lat: -14.8186, lon: -64.9180, tipo: 'AEROPUERTO' },
    { nombre: 'Terminal de Buses Trinidad', descripcion: 'Terminal de buses de Trinidad', lat: -14.8336, lon: -64.9000, tipo: 'ESTANDAR' },
    
    // Montero
    { nombre: 'Terminal de Buses Montero', descripcion: 'Terminal de buses de Montero', lat: -17.3386, lon: -63.2503, tipo: 'ESTANDAR' },
    { nombre: 'Plaza Principal Montero', descripcion: 'Plaza central de Montero', lat: -17.3386, lon: -63.2503, tipo: 'ESTANDAR' },
    
    // Riberalta
    { nombre: 'Aeropuerto Riberalta', descripcion: 'Aeropuerto de Riberalta, Beni', lat: -11.0058, lon: -66.0631, tipo: 'AEROPUERTO' },
    { nombre: 'Plaza Principal Riberalta', descripcion: 'Plaza central de Riberalta', lat: -11.0058, lon: -66.0631, tipo: 'ESTANDAR' },
    
    // Yacuiba
    { nombre: 'Terminal de Buses Yacuiba', descripcion: 'Terminal fronterizo de Yacuiba', lat: -22.0167, lon: -63.6667, tipo: 'ESTANDAR' },
    { nombre: 'Frontera Yacuiba-Pocitos', descripcion: 'Punto fronterizo Yacuiba-Argentina', lat: -22.0200, lon: -63.6700, tipo: 'ESTANDAR' },
    
    // Cobija
    { nombre: 'Aeropuerto Capitán Anibal Arab', descripcion: 'Aeropuerto de Cobija, Pando', lat: -11.0400, lon: -68.7800, tipo: 'AEROPUERTO' },
    { nombre: 'Plaza Principal Cobija', descripcion: 'Plaza central de Cobija', lat: -11.0267, lon: -68.7692, tipo: 'ESTANDAR' },
    
    // Villazón
    { nombre: 'Terminal Fronterizo Villazón', descripcion: 'Terminal fronterizo Villazón-La Quiaca', lat: -22.0869, lon: -65.5944, tipo: 'ESTANDAR' },
    
    // Sacaba
    { nombre: 'Plaza Principal Sacaba', descripcion: 'Plaza central de Sacaba, Cochabamba', lat: -17.3978, lon: -66.0386, tipo: 'ESTANDAR' },
    
    // Warnes
    { nombre: 'Terminal de Buses Warnes', descripcion: 'Terminal de buses de Warnes', lat: -17.5167, lon: -63.1667, tipo: 'ESTANDAR' }
  ];
  
  const ubicaciones = [];
  
  for (let i = 0; i < Math.min(NUMERO_UBICACIONES, ubicacionesBolivia.length); i++) {
    const ubicacionData = ubicacionesBolivia[i];
    
    try {
      const ubicacion = await prisma.ubicacion.create({
        data: {
          nombre: ubicacionData.nombre,
          descripcion: ubicacionData.descripcion,
          latitud: ubicacionData.lat,
          longitud: ubicacionData.lon,
          esActiva: Math.random() > 0.05, // 95% de probabilidad de estar activa
          tipo: ubicacionData.tipo, // Campo requerido según el esquema
        }
      });
      ubicaciones.push(ubicacion);
    } catch (error) {
      console.error(`Error creando ubicación ${ubicacionData.nombre}:`, error);
      // Continúa con la siguiente ubicación si hay un error
    }
  }
  
  console.log(`✅ ${ubicaciones.length} ubicaciones creadas exitosamente`);
  return ubicaciones;
}

// Función para crear autos
async function crearAutos(usuarios, ubicaciones) {
  const marcasModelos = [
    { marca: 'Toyota', modelos: ['Corolla', 'Camry', 'RAV4', 'Yaris', 'Hilux', 'Prius', 'Land Cruiser', 'Fortuner'] },
    { marca: 'Honda', modelos: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Fit', 'City'] },
    { marca: 'Nissan', modelos: ['Sentra', 'Versa', 'Altima', 'X-Trail', 'Kicks', 'March', 'Frontier'] },
    { marca: 'Volkswagen', modelos: ['Jetta', 'Golf', 'Tiguan', 'Vento', 'Polo', 'Gol', 'Amarok'] },
    { marca: 'Chevrolet', modelos: ['Aveo', 'Onix', 'Spark', 'Trax', 'Cruze', 'D-Max', 'S10'] },
    { marca: 'Ford', modelos: ['Focus', 'Fiesta', 'Escape', 'EcoSport', 'Explorer', 'Ranger', 'F-150'] },
    { marca: 'Mazda', modelos: ['Mazda3', 'Mazda6', 'CX-3', 'CX-5', 'CX-30', 'BT-50'] },
    { marca: 'Kia', modelos: ['Rio', 'Forte', 'Sportage', 'Seltos', 'Soul', 'Picanto'] },
    { marca: 'Hyundai', modelos: ['Accent', 'Elantra', 'Tucson', 'Creta', 'i10', 'Santa Fe'] },
    { marca: 'Suzuki', modelos: ['Swift', 'Vitara', 'Jimny', 'Baleno', 'Ertiga', 'Grand Vitara'] },
    { marca: 'Mitsubishi', modelos: ['Lancer', 'ASX', 'Outlander', 'Montero', 'L200'] },
    { marca: 'BMW', modelos: ['Serie 1', 'Serie 3', 'X1', 'X3', 'X5'] },
    { marca: 'Mercedes-Benz', modelos: ['Clase A', 'Clase C', 'GLA', 'GLC', 'GLE'] },
    { marca: 'Audi', modelos: ['A1', 'A3', 'A4', 'Q3', 'Q5'] }
  ];
  
  const tipos = ['Sedán', 'SUV', 'Hatchback', 'Pickup', 'Crossover', 'Todoterreno'];
  const colores = ['Rojo', 'Azul', 'Negro', 'Blanco', 'Plata', 'Gris', 'Verde', 'Dorado', 'Café'];
  
  const autos = [];
  
  // Obtener solo usuarios que pueden ser propietarios (no admin y que sean hosts)
  const propietariosPotenciales = usuarios.filter(u => !u.esAdmin && u.host);
  
  // Si no hay suficientes hosts, incluir algunos usuarios regulares
  if (propietariosPotenciales.length < NUMERO_AUTOS / 3) {
    const usuariosRegulares = usuarios.filter(u => !u.esAdmin && !u.host).slice(0, 10);
    propietariosPotenciales.push(...usuariosRegulares);
  }
  
  for (let i = 0; i < NUMERO_AUTOS; i++) {
    // Seleccionar marca y modelo al azar
    const marcaModeloIndex = Math.floor(Math.random() * marcasModelos.length);
    const marca = marcasModelos[marcaModeloIndex].marca;
    const modeloIndex = Math.floor(Math.random() * marcasModelos[marcaModeloIndex].modelos.length);
    const modelo = marcasModelos[marcaModeloIndex].modelos[modeloIndex];
    
    // Seleccionar propietario al azar
    const propietarioIndex = Math.floor(Math.random() * propietariosPotenciales.length);
    const propietario = propietariosPotenciales[propietarioIndex];
    
    // Seleccionar ubicación al azar
    const ubicacionIndex = Math.floor(Math.random() * ubicaciones.length);
    const ubicacion = ubicaciones[ubicacionIndex];
    
    // Generar año entre 2012 y 2024 (autos más nuevos para Bolivia)
    const año = 2012 + Math.floor(Math.random() * 13);
    
    // Generar placa boliviana (formato: ABC-1234)
    const placa = `${faker.string.alpha(3).toUpperCase()}-${faker.string.numeric(4)}`;
    
    // Tipo de auto al azar
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    
    // Color al azar
    const color = colores[Math.floor(Math.random() * colores.length)];
    
    // Generar precio de renta en bolivianos (entre 200 y 800 Bs)
    const precioRentaDiario = 200 + Math.floor(Math.random() * 600);
    
    // Generar monto de garantía en bolivianos (entre 1500 y 5000 Bs)
    const montoGarantia = 1500 + Math.floor(Math.random() * 3500);
    
    // Determinar transmisión (más manuales en Bolivia)
    const transmision = Math.random() > 0.3 ? 'MANUAL' : 'AUTOMATICO';
    
    // Determinar combustible (más gasolina y diesel en Bolivia)
    const combustibleRandom = Math.random();
    let combustible = 'GASOLINA';
    if (combustibleRandom > 0.65) combustible = 'DIESEL';
    else if (combustibleRandom > 0.95) combustible = 'HIBRIDO';
    else if (combustibleRandom > 0.99) combustible = 'ELECTRICO';
    
    // Generar SOAT (formato boliviano)
    const soat = `SOAT-${faker.string.numeric(8)}`;
    
    try {
      // Crear auto
      const auto = await prisma.auto.create({
        data: {
          idPropietario: propietario.idUsuario,
          idUbicacion: ubicacion.idUbicacion,
          marca,
          modelo,
          descripcion: `${marca} ${modelo} ${año} en excelentes condiciones. ${
            Math.random() > 0.7 ? 'Mantenimiento al día. ' : ''
          }${
            Math.random() > 0.5 ? 'Aire acondicionado, radio, USB. ' : ''
          }${
            Math.random() > 0.6 ? 'Ideal para viajes por Bolivia. ' : ''
          }${
            Math.random() > 0.8 ? 'Bajo consumo de combustible. ' : ''
          }${
            tipo === 'Todoterreno' || tipo === 'Pickup' ? 'Perfecto para caminos de tierra. ' : ''
          }`.trim(),
          precioRentaDiario,
          montoGarantia,
          kilometraje: Math.floor(Math.random() * 150000) + 10000,
          tipo,
          año,
          placa,
          soat,
          color,
          estado: Math.random() > 0.05 ? 'ACTIVO' : 'INACTIVO', // 95% activos
          fechaAdquisicion: faker.date.past({ years: 3 }),
          asientos: tipo === 'Pickup' ? 5 : (tipo === 'SUV' || tipo === 'Todoterreno' ? 7 : 5),
          capacidadMaletero: tipo === 'SUV' || tipo === 'Todoterreno' ? 500 : (tipo === 'Sedán' ? 400 : 350),
          transmision,
          combustible,
          calificacionPromedio: null, // Se actualizará después
          totalComentarios: 0, // Se actualizará después
          diasTotalRenta: null, // Se actualizará después
          vecesAlquilado: null // Se actualizará después
        }
      });
      
      autos.push(auto);
    } catch (error) {
      console.log(`Error creando auto ${i + 1}:`, error.message);
      // Si hay error de placa duplicada, intentar con otra placa
      if (error.code === 'P2002' && error.meta?.target?.includes('placa')) {
        i--; // Reintentar este auto
        continue;
      }
      throw error;
    }
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
  
  const descripciones = {
    MANTENIMIENTO: 'Mantenimiento programado del vehículo',
    REPARACION: 'Reparación técnica necesaria',
    USO_PERSONAL: 'Uso personal del propietario',
    OTRO: 'Motivo especial de no disponibilidad'
  };
  
  for (const auto of autosConNoDisponibilidad) {
    // Generar entre 1 y 3 periodos de no disponibilidad
    const numPeriodos = Math.floor(Math.random() * 3) + 1;
    const periodosData = [];
    
    for (let i = 0; i < numPeriodos; i++) {
      // Fechas aleatorias en los próximos 3 meses
      const fechaInicio = faker.date.soon({ days: 90 });
      const duracionDias = Math.floor(Math.random() * 7) + 1; // Entre 1 y 7 días
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + duracionDias);
      
      // Motivo aleatorio
      const motivo = motivos[Math.floor(Math.random() * motivos.length)];
      
      periodosData.push({
        idAuto: auto.idAuto,
        fechaInicio,
        fechaFin,
        motivo,
        descripcion: descripciones[motivo]
      });
    }
    
    // Crear todos los periodos del auto en una sola operación
    await prisma.disponibilidad.createMany({
      data: periodosData
    });
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
      
      // Crear reserva sin registro de pagos (se creará cuando haya pagos)
      const reserva = await prisma.reserva.create({
        data: {
          fechaInicio,
          fechaFin,
          idAuto: auto.idAuto,
          idCliente: cliente.idUsuario,
          // idRegistroPagos se asignará cuando se cree el registro de pagos
          estado,
          fechaSolicitud,
          fechaAprobacion,
          fechaLimitePago,
          kilometrajeInicial,
          kilometrajeFinal
        }
      });
      
      reservas.push(reserva);
    }
  }
  
  return reservas;
}

// Función para crear registros de pagos
async function crearRegistroPagos(reservas, autos) {
  const registrosPagos = [];
  
  for (const reserva of reservas) {
    // Solo crear registros de pagos para reservas que requieren pago
    // (aprobadas, confirmadas, en curso o finalizadas)
    if (['APROBADA', 'CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(reserva.estado)) {
      
      // Obtener información del auto para calcular monto
      const auto = await prisma.auto.findUnique({
        where: { idAuto: reserva.idAuto }
      });
      
      if (auto) {
        // Calcular monto total basado en días y precio del auto
        const tiempoMS = reserva.fechaFin.getTime() - reserva.fechaInicio.getTime();
        const dias = Math.ceil(tiempoMS / (1000 * 60 * 60 * 24));
        const montoTotal = auto.precioRentaDiario * dias;
        
        // Crear registro de pagos
        const registroPagos = await prisma.registroPagos.create({
          data: {
            idReserva: reserva.idReserva,
            montoTotal,
            concepto: `Renta de ${auto.marca} ${auto.modelo} - ${dias} día${dias > 1 ? 's' : ''}`,
            estaPagado: ['CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(reserva.estado)
          }
        });
        
        registrosPagos.push(registroPagos);
      }
    }
  }
  
  return registrosPagos;
}

// Función para crear pagos
async function crearPagos(reservas) {
  const metodosPago = ['QR', 'TARJETA_DEBITO'];
  const pagos = [];
  
  for (const reserva of reservas) {
    // Solo crear pagos para reservas que tienen registro de pagos
    const registroPagos = await prisma.registroPagos.findUnique({
      where: { idReserva: reserva.idReserva }
    });
    
    if (registroPagos && ['APROBADA', 'CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(reserva.estado)) {
      
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
      
      // Crear pago de renta (solo si no es estado APROBADA que aún no paga)
      if (reserva.estado !== 'APROBADA') {
        const pagoRenta = await prisma.pago.create({
          data: {
            idRegistroPagos: registroPagos.idRegistroPagos,
            monto: registroPagos.montoTotal,
            fechaPago,
            metodoPago,
            referencia,
            comprobante,
            tipo: 'RENTA'
          }
        });
        pagos.push(pagoRenta);
      }
      
      // Para reservas confirmadas, en curso o finalizadas, crear también pago de garantía (70% de probabilidad)
      if (['CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(reserva.estado) && Math.random() > 0.3) {
        // Buscar el auto relacionado con la reserva
        const auto = await prisma.auto.findUnique({
          where: { idAuto: reserva.idAuto }
        });
        
        if (auto) {
          // Crear pago de garantía
          const pagoGarantia = await prisma.pago.create({
            data: {
              idRegistroPagos: registroPagos.idRegistroPagos,
              monto: auto.montoGarantia,
              fechaPago: new Date(fechaPago),
              metodoPago,
              referencia: `G${referencia}`,
              comprobante: `https://storage.rentauto.com/comprobantes/garantia_${reserva.idReserva}_${faker.string.alphanumeric(6)}.pdf`,
              tipo: 'GARANTIA'
            }
          });
          pagos.push(pagoGarantia);
        }
      }
    }
  }
  
  return pagos;
}

// Función para crear garantías
async function crearGarantias(reservas) {
  const garantias = [];
  
  for (const reserva of reservas) {
    // Solo procesar reservas confirmadas, en curso o finalizadas
    if (['CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(reserva.estado)) {
      
      // Buscar si existe un pago de garantía para esta reserva
      const registroPagos = await prisma.registroPagos.findUnique({
        where: { idReserva: reserva.idReserva },
        include: {
          pagos: {
            where: { tipo: 'GARANTIA' }
          }
        }
      });
      
      if (registroPagos?.pagos.length > 0) {
        for (const pagoGarantia of registroPagos.pagos) {
          // Verificar si ya existe una garantía para este pago
          const garantiaExistente = await prisma.garantia.findUnique({
            where: { idPago: pagoGarantia.idPago }
          });
          
          if (!garantiaExistente) {
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
            
            const garantia = await prisma.garantia.create({
              data: {
                idPago: pagoGarantia.idPago,
                fechaLiberacion,
                estado: estadoGarantia
              }
            });
            
            garantias.push(garantia);
          }
        }
      }
    }
  }
  
  return garantias;
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
    
    // 80% de probabilidad de que haya calificación del arrendatario al arrendador
    if (Math.random() <= 0.8) {
      // Calificación del arrendatario al arrendador
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
    }
  }
  {/** 
  // Crear calificaciones del arrendador al arrendatario como registros separados sin idReserva
  // (ya que idReserva debe ser único y ya se usó arriba)
  for (const reserva of reservasFinalizadas) {
    // Obtener datos necesarios
    const auto = await prisma.auto.findUnique({
      where: { idAuto: reserva.idAuto }
    });
    
    if (!auto) continue;
    
    // 70% de probabilidad de que haya calificación del arrendador al arrendatario
    if (Math.random() <= 0.7) {
      // Calificación del arrendador al arrendatario
      const calificacionAlArrendatario = Math.floor(Math.random() * 5) + 1;
      const comentariosArrendatarioArray = comentariosArrendatario[calificacionAlArrendatario];
      const comentarioAlArrendatario = comentariosArrendatarioArray[Math.floor(Math.random() * comentariosArrendatarioArray.length)];
      
      // Fecha de creación (entre la fecha de finalización y una semana después)
      const fechaCreacionArrendatario = new Date(reserva.fechaFin);
      fechaCreacionArrendatario.setDate(fechaCreacionArrendatario.getDate() + Math.floor(Math.random() * 5) + 1);
      
      // Verificar que no exista ya una calificación para esta reserva
      const existeCalificacion = await prisma.calificacionUsuario.findUnique({
        where: { idReserva: reserva.idReserva }
      });
      
      await prisma.calificacionUsuario.create({
        data: {
          idCalificador: auto.idPropietario, // El propietario califica
          idCalificado: reserva.idCliente, // Al cliente
          puntuacion: calificacionAlArrendatario,
          comentario: comentarioAlArrendatario,
          fechaCreacion: fechaCreacionArrendatario,
          // No incluir idReserva si ya existe una calificación para esta reserva
          ...(existeCalificacion ? {} : { idReserva: reserva.idReserva }),
          tipoCalificacion: 'ARRENDATARIO'
        }
      });
    }
  }
    */}
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
    try {
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
            // Asegurar que la fecha esté en el pasado
            const ahora = new Date();
            const fechaBase = reserva.fechaSolicitud && reserva.fechaSolicitud <= ahora ? 
                           reserva.fechaSolicitud : 
                           new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás por defecto
            
            fechaCreacion = new Date(
              fechaBase.getTime() + Math.random() * (ahora.getTime() - fechaBase.getTime())
            );
        }
        
        // Estado de lectura (más antiguas tienen más probabilidad de estar leídas)
        const ahora = new Date();
        const diasDesdeCreacion = (ahora - fechaCreacion) / (1000 * 60 * 60 * 24);
        const probabilidadLeida = Math.min(0.9, diasDesdeCreacion / 30); // Mayor probabilidad si es más antiguo
        const leido = Math.random() < probabilidadLeida;
        const leidoEn = leido ? new Date(fechaCreacion.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null; // 0-24h después
        
        try {
          // Verificar si ya existe una notificación similar para evitar duplicados
          const notificacionExistente = await prisma.notificacion.findFirst({
            where: {
              idUsuario: usuario.idUsuario,
              idEntidad: reserva.idReserva.toString(),
              tipo: tipo
            }
          });

          if (!notificacionExistente) {
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
        } catch (error) {
          console.error(`Error creando notificación para usuario ${usuario.idUsuario}:`, error);
          // Continuar con la siguiente notificación en caso de error
        }
      }
    } catch (error) {
      console.error(`Error procesando reserva ${reserva.idReserva}:`, error);
      // Continuar con la siguiente reserva en caso de error
    }
  }
  
  // Crear algunas notificaciones adicionales aleatorias solo si NUMERO_NOTIFICACIONES está definido
  if (typeof NUMERO_NOTIFICACIONES !== 'undefined') {
    const tiposNotificacion = Object.keys(plantillasNotificaciones);
    const notificacionesActuales = await prisma.notificacion.count();
    const notificacionesAdicionales = NUMERO_NOTIFICACIONES - notificacionesActuales;
    
    if (notificacionesAdicionales > 0) {
      for (let i = 0; i < notificacionesAdicionales; i++) {
        try {
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
          
          // Generar una fecha válida en el pasado (últimos 90 días)
          const ahora = new Date();
          const hace90Dias = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);
          const fechaCreacion = new Date(
            hace90Dias.getTime() + Math.random() * (ahora.getTime() - hace90Dias.getTime())
          );
          
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
        } catch (error) {
          console.error(`Error creando notificación adicional ${i}:`, error);
          // Continuar con la siguiente notificación en caso de error
        }
      }
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

// Función para actualizar estadísticas de usuarios
async function actualizarEstadisticasUsuarios() {
  // Obtener todos los usuarios
  const usuarios = await prisma.usuario.findMany();
  
  for (const usuario of usuarios) {
    // Obtener todas las calificaciones recibidas por este usuario
    const calificacionesRecibidas = await prisma.calificacionUsuario.findMany({
      where: { idCalificado: usuario.idUsuario }
    });
    
    let calificacionPromedio = null;
    
    if (calificacionesRecibidas.length > 0) {
      const sumaCalificaciones = calificacionesRecibidas.reduce((sum, calificacion) => sum + calificacion.puntuacion, 0);
      calificacionPromedio = parseFloat((sumaCalificaciones / calificacionesRecibidas.length).toFixed(1));
    }
    
    // Actualizar usuario con su calificación promedio
    await prisma.usuario.update({
      where: { idUsuario: usuario.idUsuario },
      data: {
        calificacionPromedio
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