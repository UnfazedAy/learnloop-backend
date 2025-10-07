import { Router } from "express";
import {
  updateProfile,
  getUserProfile,
  getUsers,
  getUserById,
  deleteAccount,
  updateNotificationSettings,
} from "../controllers/userController";
import { requireAuth } from "../middleWares/authMiddleware";

const userRouter: Router = Router();

userRouter
  .route("/update-profile")
  .put(requireAuth, updateProfile);

userRouter
  .route("/profile")
  .get(requireAuth, getUserProfile);

userRouter
  .route("/profiles")
  .get(requireAuth, getUsers);

userRouter
  .route("/:id")
  .get(requireAuth, getUserById);

userRouter
  .route("/delete-account")
  .delete(requireAuth, deleteAccount);

userRouter
  .route("/notification-settings")
  .put(requireAuth, updateNotificationSettings);

export default userRouter;
