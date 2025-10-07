import { supabase } from "../config/database";
import { asyncHandler } from "./errorHandler.js";
import ErrorResponse from "../utils/errorResponse.js";
import { Request, Response, NextFunction } from "express";
import { UserProfile } from "../types/types";

export const requireAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token && req.cookies && req.cookies["accessToken"]) {
      token = req.cookies["accessToken"];
    }
    if (!token) {
      return next(
        new ErrorResponse(
          "Not authorized to access this route, please login",
          401
        )
      );
    }
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return next(new ErrorResponse("Not authorized, token invalid", 401));
    }
    const { data: userData, error: userError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (userError || !userData) {
      return next(new ErrorResponse("User not found", 404));
    }
    req.user = userData as UserProfile;
    console.log(req.user);
    next();
  }
);
