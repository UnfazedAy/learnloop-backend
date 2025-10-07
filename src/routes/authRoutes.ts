import { Router } from "express";
import {
  signUp,
  login,
  completeProfile,
  logout,
  forgotPassword,
  resetPassword
} from "../controllers/authController";
import { requireAuth } from "../middleWares/authMiddleware.js";

const authRouter: Router = Router();

authRouter.post("/sign-up", signUp);
authRouter.post("/login", login);
authRouter.post("/logout", requireAuth, logout);
authRouter.post("/complete-profile", completeProfile);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
