import { Router } from 'express';
import healthRoutes from './health.routes.js';
import productRoutes from './product.routes.js';

/**
 * Aggregates all modular API routers. Future sprints add route modules here
 * (auth, orders, ...) without touching the bootstrap file.
 */
const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use('/products', productRoutes);

export default apiRouter;