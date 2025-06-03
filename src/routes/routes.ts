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
import { marcarActivo, marcarInactivo, ponerEnMantenimiento, finalizarMantenimiento, obtenerAutosDelPropietario, liberarAuto } from '../controllers/autoController';
import { obtenerDetallesReservaAuto, obtenerSolicitudesDeReserva, aceptarReserva, denegarReserva } from '../controllers/reservaController';
import { obtenerComentariosPorAuto } from '../controllers/comentarioController';

const express = require('express');
const router = express.Router();

// ******* AUTO CONTROLLER ********
// * GETTERS
// Obtener todos los autos de un arrendador con su estado
router.get('/autos/arrendador/:idArrendador', obtenerAutosDelPropietario);

// *PUTTERS
// Marcar auto como activo (disponible para renta)
router.put('/autos/:idAuto/activar', marcarActivo);
// Marcar auto como inactivo (no disponible para renta)
router.put('/autos/:idAuto/inactivar', marcarInactivo);

// *POSTERS
// Poner un auto en mantenimiento
router.post('/autos/:idAuto/mantenimiento', ponerEnMantenimiento);
// Finalizar mantenimiento de un auto
router.post('/mantenimiento/:idHistorial/finalizar', finalizarMantenimiento);


// ******* RESERVA CONTROLLER ********
// * GETTERS
// Obtener los datos de una reserva junto con detalles del auto
router.get('/reservas/:idReserva/detalles', obtenerDetallesReservaAuto);
// Obtener todas las reservas solicitadas de un propietario específico
router.get('/reservas/propietario/:idPropietario', obtenerSolicitudesDeReserva);
// * PUTTERS
// Aceptar una reserva de id idReserva
router.put('/reservas/:idReserva/aceptar', aceptarReserva);
// Denegar una reserva de id idReserva
router.put('/reservas/:idReserva/denegar', denegarReserva);
// Liberar una reserva de un auto
router.put('/reservas/:idReserva/liberar', liberarAuto);

// En la parte inferior de las rutas
router.get('/comentarios/auto/:idAuto', obtenerComentariosPorAuto);


router.get('/test', (req: Request, res: Response) => {
  res.send('Router funcionando correctamente!');
});
// router.get('/', index);

export default router;