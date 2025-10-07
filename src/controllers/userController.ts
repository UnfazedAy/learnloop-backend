import { supabase } from "../config/database";
import { asyncHandler } from "../middleWares/errorHandler";
import ErrorResponse from "../utils/errorResponse";
import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

interface UserProfileEditableFields {
  firstName?: string;
  lastName?: string;
}

export const getUserProfile = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.user as { id: string };

    const { data: profileData, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      return next(new ErrorResponse("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: profileData,
    });
  }
);

export const getUsers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Extract pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);

    const offset = (page - 1) * limit;

    // Get total count for pagination metadata
    const { count: totalCount, error: countError } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true });

    if (countError) {
      return next(new ErrorResponse("Unable to fetch user count", 500));
    }

    // Fetch paginated profiles
    const { data: profiles, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (fetchError) {
      return next(new ErrorResponse("Unable to fetch profiles", 500));
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((totalCount || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.status(200).json({
      success: true,
      data: profiles,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: totalCount || 0,
        limit,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null,
      },
    });
  }
);

export const updateProfile = asyncHandler(
  async (
    req: Request<object, object, UserProfileEditableFields>,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.user as { id: string };
    const { firstName, lastName } = req.body;

    const { data: existingProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("first_name, last_name")
      .eq("id", id)
      .single();

    if (fetchError) {
      return next(new ErrorResponse("User not found", 404));
    }

    const updatedProfileData = {
      first_name: firstName?.trim() || existingProfile.first_name,
      last_name: lastName?.trim() || existingProfile.last_name,
    };

    const { data: profileData, error: updateError } = await supabase
      .from("user_profiles")
      .update(updatedProfileData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return next(new ErrorResponse(updateError.message, 400));
    }

    const metadataUpdates: Record<string, string> = {};
    if (firstName?.trim()) metadataUpdates.first_name = firstName;
    if (lastName?.trim()) metadataUpdates.last_name = lastName;

    if (Object.keys(metadataUpdates).length > 0) {
      const { error: metadataError } = await supabase.auth.admin.updateUserById(id, {
        user_metadata: metadataUpdates,
      });

      if (metadataError) {
        logger.warn("Auth metadata update failed:", metadataError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: profileData,
    });
  }
);

export const getUserById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const { data: user, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      return next(new ErrorResponse("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  }
);

export const deleteAccount = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.user as { id: string };

    // Delete user from auth and cascade to profile
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      return next(new ErrorResponse("Unable to delete account", 500));
    }

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  }
);

export const updateNotificationSettings = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.user as { id: string };
    const { email, push } = req.body;

    // ✅ Basic validation
    if (typeof email !== "boolean" && typeof push !== "boolean") {
      res.status(400);
      throw new Error(
        "Invalid payload: must include at least one valid boolean field (email or push)"
      );
    }

    // Fetch current preferences
    const { data: currentProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("notification_preferences")
      .eq("id", id)
      .single();

    if (fetchError) {
      return next(new ErrorResponse(`User profile not found: ${fetchError.message}`, 404));
    }

    const updatedPreferences = {
      ...currentProfile.notification_preferences,
      ...(email !== undefined ? { email } : {}),
      ...(push !== undefined ? { push } : {}),
    };

    const { data, error } = await supabase
      .from("user_profiles")
      .update({ notification_preferences: updatedPreferences })
      .eq("id", id)
      .select("notification_preferences")
      .single();

    if (error) {
      return next(new ErrorResponse(`Failed to update notification settings: ${error.message}`, 500));
    }

    res.json({
      success: true,
      message: "Notification settings updated successfully",
      preferences: data.notification_preferences,
    });
  }
);