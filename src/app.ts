import express, { Application, Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { ENV } from "./config/keys";
import { errorHandler } from "./middleWares/errorHandler";
import authRouter from "./routes/authRoutes";
import userRouter from "./routes/userRoutes";
import goalRouter from "./routes/goalRoutes";
import progressRouter from "./routes/progressRoutes";

const { NODE_ENV } = ENV;

const app: Application = express();

const corsOptions: CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Dev logging
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/goals", goalRouter);
app.use("/api/v1/progress", progressRouter);

app.use(errorHandler);

// Catch-all route for 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Invalid route, please check the URL properly if you are sure this route exists.",
  });
});

export default app;
