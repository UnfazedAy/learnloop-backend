import { Response, CookieOptions } from "express";
import { ENV } from "../config/keys";
import { TOKEN_EXPIRY } from "./constants";

const { NODE_ENV } = ENV;

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  const isProd = NODE_ENV === "production";

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as CookieOptions["sameSite"],
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

export const clearAuthCookies = (res: Response) => {
  const isProd = NODE_ENV === "production";

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as CookieOptions["sameSite"],
    path: "/",
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
};
