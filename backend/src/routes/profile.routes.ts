import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { profileController } from '../controllers/profile.controller';

const router = Router();

router.get('/', authMiddleware, profileController.getProfile);
router.put('/', authMiddleware, profileController.updateProfile);
router.post('/onboarding', authMiddleware, profileController.completeOnboarding);

// Brand Kit
router.get('/brand-kit', authMiddleware, profileController.getBrandKit);
router.put('/brand-kit', authMiddleware, profileController.updateBrandKit);

export default router;
