import { Router } from 'express';
import healthRoutes from './health.routes.js';
import productRoutes from './product.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import uploadRoutes from './upload.routes.js';

/**
 * Aggregates all modular API routers. New route modules register here without
 * touching the bootstrap file.
 */
const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/upload', uploadRoutes);

export default apiRouter;