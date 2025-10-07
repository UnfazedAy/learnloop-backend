import { Router } from "express";
import { requireAuth } from "../middleWares/authMiddleware.js";
import { logProgress, getProgressStats } from "../controllers/progressController";

const progressRouter = Router();

progressRouter.use(requireAuth);

progressRouter.post("/:goalId/", logProgress);
progressRouter.get("/:goalId/stats", getProgressStats);

export default progressRouter;
