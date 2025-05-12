// Este es solo un archivo para marcar la estructura del proyecto, por lo que debe ser eliminado 


/*
Vista rápida del funcionamiento y contenido de esta carpeta

Define las rutas (URL's) de la API

    - Mapeo de URL a controladores
    - Aplicación de middlewares específicos a rutas
*/

//imports globales
import { Request, Response } from 'express';

//imports locales
import { marcarActivo, marcarInactivo, ponerEnMantenimiento, finalizarMantenimiento } from '../controllers/autoController';
import { obtenerDetallesReservaAuto, obtenerSolicitudesDeReserva, aceptarReserva, denegarReserva } from '../controllers/reservaController';

const express = require('express');
const router = express.Router();

// ******* AUTO CONTROLLER ********
// Marcar auto como activo (disponible para renta)
router.put('/autos/:idAuto/activar', marcarActivo);
// Marcar auto como inactivo (no disponible para renta)
router.put('/autos/:idAuto/inactivar', marcarInactivo);
// Poner un auto en mantenimiento
router.post('/autos/:idAuto/mantenimiento', ponerEnMantenimiento);
// Finalizar mantenimiento de un auto
router.post('/mantenimiento/:idMantenimiento/finalizar', finalizarMantenimiento);

// ******* RESERVA CONTROLLER ********
// Obtener los datos de una reserva junto con detalles del auto
router.get('/reservas/:idReserva/detalles', obtenerDetallesReservaAuto);
// Obtener todas las reservas solicitadas de un propietario específico
router.get('/reservas/propietario/:idPropietario', obtenerSolicitudesDeReserva);
// Aceptar una reserva de id idReserva
router.put('/reservas/:idReserva/aceptar', aceptarReserva);
// Denegar una reserva de id idReserva
router.put('/reservas/:idReserva/denegar', denegarReserva);


router.get('/test', (req: Request, res: Response) => {
  res.send('Router funcionando correctamente!');
});
// router.get('/', index);

export default router;