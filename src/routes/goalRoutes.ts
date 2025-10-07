import { Router } from "express";
import {
  createGoal,
  getGoals,
  getUserGoal,
  deleteGoal,
  editGoal,
} from "../controllers/goalController";
import { requireAuth } from "../middleWares/authMiddleware";

const goalRouter = Router();

goalRouter.use(requireAuth);

goalRouter
  .route("/")
  .post(createGoal)
  .get(getGoals);

goalRouter
  .route("/:goalId")
  .get(getUserGoal)
  .delete(deleteGoal)
  .put(editGoal);

export default goalRouter;
