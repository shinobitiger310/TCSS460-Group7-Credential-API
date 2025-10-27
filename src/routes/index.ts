import { Router } from 'express';
import { openRoutes } from './open';
import { closedRoutes } from './closed';

const routes = Router();

// Mount all route groups
routes.use('', openRoutes);

routes.use('', closedRoutes);

// Admin routes have been removed - students will implement these

export { routes };
