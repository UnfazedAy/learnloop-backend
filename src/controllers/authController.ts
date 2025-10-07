import { supabase } from "../config/database";
import { asyncHandler } from "../middleWares/errorHandler";
import ErrorResponse from "../utils/errorResponse";
import { Request, Response, NextFunction } from "express";
import { MESSAGES, AUTH_MESSAGES } from "../utils/constants";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies";
import { SignUpRequestBody } from "../types/types";
import {
  isValidEmail,
  sanitizeInput,
  validateSignUpData,
  isValidPassword,
} from "../utils/fieldsValidations";
import logger from "../config/logger";

export const signUp = asyncHandler(
  async (
    req: Request<object, object, SignUpRequestBody>,
    res: Response,
    next: NextFunction
  ) => {
    const sanitizedData = sanitizeInput(req.body);

    // Validate the sanitized data
    const validationErrors = validateSignUpData(sanitizedData);
    if (validationErrors.length > 0) {
      return next(new ErrorResponse(validationErrors.join(", "), 400));
    }

    const { email, password, firstName, lastName, gender } = sanitizedData;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          gender,
        },
      },
    });

    if (signUpError) {
      // Handle specific Supabase errors
      if (signUpError.message.includes("already registered")) {
        return next(new ErrorResponse(AUTH_MESSAGES.ERROR.EMAIL_EXISTS, 409));
      }
      return next(new ErrorResponse(signUpError.message, 400));
    }

    if (!authData?.user) {
      return next(new ErrorResponse(MESSAGES.ERROR.INTERNAL_SERVER, 500));
    }

    res.status(201).json({
      success: true,
      message: AUTH_MESSAGES.SUCCESS.SIGNUP,
      data: {
        id: authData.user.id,
        email: authData.user.email,
        emailConfirmed: authData.user.email_confirmed_at ? true : false,
      },
    });
  }
);

export const login = asyncHandler(
  async (
    req: Request<object, object, { email: string; password: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorResponse("Please provide email and password", 400));
    }
    if (!isValidEmail(email.trim())) {
      return next(
        new ErrorResponse(AUTH_MESSAGES.ERROR.INVALID_EMAIL_FORMAT, 400)
      );
    }

    // confirm if email exists
    const { data: userRows, error: userError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (userError) {
      return next(new ErrorResponse(userError.message, 400));
    }

    if (!userRows) {
      return next(new ErrorResponse("User not found", 404));
    }

    const { data: authData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (loginError) {
      return next(new ErrorResponse(loginError.message, 400));
    }

    if (!authData?.user) {
      return next(new ErrorResponse("User login failed", 500));
    }

    setAuthCookies(
      res,
      authData.session.access_token,
      authData.session.refresh_token
    );

    res.status(200).json({
      success: true,
      message: MESSAGES.SUCCESS.LOGIN,
      data: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: authData.user.user_metadata.first_name,
        lastName: authData.user.user_metadata.last_name,
        accessToken: authData.session.access_token,
      },
    });
  }
);

export const logout = asyncHandler(
  async (
    req: Request<object, object, { accessToken: string }>,
    res: Response,
    next: NextFunction
  ) => {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Fallback for cookies
    if (!token && req.cookies && req.cookies["accessToken"]) {
      token = req.cookies["accessToken"];
    }
    if (!token) {
      return next(new ErrorResponse(AUTH_MESSAGES.ERROR.TOKEN_INVALID, 401));
    }
    const { error: signOutError } = await supabase.auth.admin.signOut(token);

    if (signOutError) {
      logger.error("Logout Error:", signOutError);
    }

    // Clear cookies
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: MESSAGES.SUCCESS.LOGOUT,
    });
  }
);

export const forgotPassword = asyncHandler(
  async (
    req: Request<object, object, { email: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { email } = req.body;

    if (!isValidEmail(email.trim().toLowerCase())) {
      return next(
        new ErrorResponse(AUTH_MESSAGES.ERROR.INVALID_EMAIL_FORMAT, 400)
      );
    }

    // check if user exists
    const { data: userRows, error: userError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (userError) {
      return next(new ErrorResponse(userError.message, 400));
    }
    if (!userRows) {
      return next(new ErrorResponse("User not found", 404));
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase()
    );

    if (resetError) {
      return next(new ErrorResponse(resetError.message, 400));
    }

    res.status(200).json({
      success: true,
      message: AUTH_MESSAGES.SUCCESS.PASSWORD_RESET_SENT,
    });
  }
);

export const resetPassword = asyncHandler(
  async (
    req: Request<
      object,
      object,
      { newPassword: string; accessToken: string; refreshToken: string }
    >,
    res: Response,
    next: NextFunction
  ) => {
    const { newPassword, accessToken, refreshToken } = req.body;

    if (!newPassword) {
      return next(new ErrorResponse("New password is required", 400));
    }

    if (!accessToken || !refreshToken) {
      return next(new ErrorResponse("Reset tokens are required", 400));
    }

    // Validate password strength
    if (!isValidPassword(newPassword)) {
      return next(
        new ErrorResponse("Password does not meet security requirements", 400)
      );
    }

    try {
      // Set the session using the tokens from the reset email
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

      if (sessionError || !sessionData.session) {
        logger.warn(`Invalid reset session: ${sessionError?.message}`);
        return next(
          new ErrorResponse("Reset link has expired or is invalid", 401)
        );
      }

      // Now update the password using the established session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        logger.error(`Password update failed: ${updateError.message}`);
        return next(new ErrorResponse("Failed to update password", 400));
      }

      // Optionally, sign out all sessions to force re-login with new password
      await supabase.auth.signOut();

      logger.info("Password reset successful");

      res.status(200).json({
        success: true,
        message: AUTH_MESSAGES.SUCCESS.PASSWORD_RESET_SUCCESS,
      });
    } catch (error) {
      logger.error("Reset password error:", error);
      return next(new ErrorResponse("Password reset failed", 500));
    }
  }
);

export const completeProfile = asyncHandler(
  async (
    req: Request<object, object, { accessToken: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const { accessToken } = req.body;

    if (!accessToken) {
      return next(new ErrorResponse(AUTH_MESSAGES.ERROR.TOKEN_INVALID, 400));
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(
      accessToken
    );

    if (userError) {
      return next(
        new ErrorResponse(`Unable to get user ${userError.message}`, 400)
      );
    }

    if (!userData) {
      return next(new ErrorResponse("User not found", 404));
    }

    // check if user profile is already complete
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileData && !profileError) {
      return res.status(200).json({
        success: true,
        message: "Profile already complete",
        data: {
          id: profileData.id,
          email: profileData.email,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          gender: profileData.gender,
        },
      });
    }

    // insert new profile
    const { error: insertError } = await supabase.from("user_profiles").insert({
      id: userData.user.id,
      email: userData.user.email,
      first_name: userData.user.user_metadata.first_name,
      last_name: userData.user.user_metadata.last_name,
      gender: userData.user.user_metadata.gender,
    });

    if (insertError) {
      return next(new ErrorResponse(insertError.message, 400));
    }

    res.status(200).json({
      success: true,
      message: "Profile completed successfully",
      data: {
        id: userData.user.id,
        email: userData.user.email,
        firstName: userData.user.user_metadata.first_name,
        lastName: userData.user.user_metadata.last_name,
        gender: userData.user.user_metadata.gender,
      },
    });
  }
);

export const refresh_token = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new ErrorResponse("Refresh token is required", 400));
    }

    const { data, error } = await supabase.auth.refreshSession(refreshToken);

    if (error) {
      return next(new ErrorResponse(error.message, 401));
    }

    if (!data.session) {
      return next(new ErrorResponse("Session data is missing", 500));
    }

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    });
  }
);
