import { Response } from "express";
import { ENV } from "../config/keys";
import { TOKEN_EXPIRY } from "./constants";

const { NODE_ENV } = ENV;

// Helper function to set secure cookies
export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const cookieOptions = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: TOKEN_EXPIRY.REFRESH_TOKEN,
  });
};

// Helper function to clear auth cookies
export const clearAuthCookies = (res: Response) => {
  const cookieOptions = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
};