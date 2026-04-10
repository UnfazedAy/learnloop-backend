import { Router } from "express";
import { requireAuth } from "../middleWares/authMiddleware.js";
import {
  getProgress,
  getProgressStats,
  logProgress,
} from "../controllers/progressController";

const progressRouter = Router();

progressRouter.use(requireAuth);

progressRouter.get("/", getProgress);
progressRouter.get("/stats", getProgressStats);
progressRouter.post("/:goalId/", logProgress);

export default progressRouter;
