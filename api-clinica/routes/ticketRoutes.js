import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import {
  createTicket,
  listMyTickets,
  listAdminTickets,
  getTicket,
  addTicketMessage,
  patchTicket,
} from '../controllers/ticketController.js';

const router = Router();

router.use(authenticateToken);

router.post('/', authorizeRoles(['Doctor', 'doctor']), createTicket);
router.get('/mios', authorizeRoles(['Doctor', 'doctor']), listMyTickets);
router.get('/admin/lista', authorizeRoles(['admin', 'Admin']), listAdminTickets);

router.get('/:id', getTicket);
router.post('/:id/mensajes', addTicketMessage);
router.patch('/:id', authorizeRoles(['admin', 'Admin']), patchTicket);

export default router;
