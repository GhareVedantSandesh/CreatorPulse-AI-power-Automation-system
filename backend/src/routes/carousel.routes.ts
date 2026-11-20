import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { carouselController } from '../controllers/carousel.controller';

const router = Router();

router.use(authMiddleware);

// Phase 1: Initiate async generation
router.post('/generate', carouselController.generate);

// Phase 3: Get job status and results
router.get('/jobs/:id', carouselController.getJob);

// History
router.get('/history', carouselController.getHistory);

// Legacy/Finalize: Save a generated carousel as a draft
router.post('/save', carouselController.save);

export default router;
