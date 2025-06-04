import { Request, Response, Router } from "express";
import { getAutos, getAutoId, getComentarios, getHost, getDrivers, getUsuarioId} from "../controllers/autoController";
import { getAutosDisponiblesPorFecha} from "../controllers/autoController";
import { getUsuarios } from "../controllers/autoController";
import { getCalificacionesHost } from  "../controllers/autoController";
import { getHostSinFiltroFechas } from "../controllers/autoController";

import { marcarActivo, marcarInactivo, ponerEnMantenimiento, finalizarMantenimiento, obtenerAutosDelPropietario, liberarAuto } from '../controllers/autoController';
import { obtenerDetallesReservaAuto, obtenerSolicitudesDeReserva, aceptarReserva, denegarReserva } from '../controllers/reservaController';
import { obtenerComentariosPorAuto } from '../controllers/comentarioController';

const router = Router();

router.get('/autos', getAutos);
router.get('/autos/:id', getAutoId);
router.get('/autos/:id/comentarios', getComentarios);
router.get('/autos/:id/host', getHost);
router.get('/autosDisponibles/:inicio/:fin', getAutosDisponiblesPorFecha);
router.get('/drivers/:id', getDrivers);
router.get('/usuarios', getUsuarios);
router.get('/host/:id', getCalificacionesHost);
router.get('/usuario/:id', getUsuarioId);
router.get('/hosts/:id', getHostSinFiltroFechas)



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

export default router;