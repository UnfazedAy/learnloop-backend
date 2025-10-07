import { supabase } from "../config/database";
import { asyncHandler } from "../middleWares/errorHandler";
import ErrorResponse from "../utils/errorResponse";
import { Request, Response, NextFunction } from "express";
import { Goal } from "../types/types";

export const createGoal = asyncHandler(
  async (
    req: Request<object, object, Goal>,
    res: Response,
    next: NextFunction
  ) => {
    const { title, description, goalType, targetValue, targetUnit, frequency } =
      req.body;

    // Validate required fields
    if (!title || !goalType || !targetValue || !targetUnit) {
      return next(new ErrorResponse("Missing required fields", 400));
    }

    const userId = req.user.id;

    // Insert the new goal into the database
    const { data: goal, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title,
        description,
        goal_type: goalType,
        target_value: targetValue,
        target_unit: targetUnit,
        frequency,
      })
      .select("*")
      .single();

    if (error) {
      return next(new ErrorResponse(error.message, 500));
    }

    res.status(201).json({
      success: true,
      data: goal,
      message: "Goal created successfully",
    });
  }
);

export const getGoals = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;

    // Filtering parameters
    const { frequency, goal_type, target_unit } = req.query;

    // Sorting parameters
    const sortBy = (req.query.sortBy as string) || "created_at";
    const sortOrder = (req.query.sortOrder as string) || "desc";

    // Field selection parameters
    const selectFields = req.query.select as string;

    // Validate sort order
    const validSortOrders = ["asc", "desc"];
    if (!validSortOrders.includes(sortOrder.toLowerCase())) {
      return next(
        new ErrorResponse("Invalid sort order. Use 'asc' or 'desc'", 400)
      );
    }

    // Validate sortBy field (basic validation - you might want to expand this)
    const validSortFields = [
      "id",
      "title",
      "description",
      "goal_type",
      "target_value",
      "target_unit",
      "frequency",
      "created_at",
      "updated_at",
    ];
    if (!validSortFields.includes(sortBy)) {
      return next(
        new ErrorResponse(
          `Invalid sort field. Valid fields: ${validSortFields.join(", ")}`,
          400
        )
      );
    }

    // Determine which fields to select
    let fieldsToSelect = "*";
    if (selectFields) {
      const requestedFields = selectFields
        .split(",")
        .map((field) => field.trim());
      // Validate requested fields
      const validFields = [
        "id",
        "user_id",
        "title",
        "description",
        "goal_type",
        "target_value",
        "target_unit",
        "frequency",
        "created_at",
        "updated_at",
      ];
      const invalidFields = requestedFields.filter(
        (field) => !validFields.includes(field)
      );
      if (invalidFields.length > 0) {
        return next(
          new ErrorResponse(
            `Invalid fields: ${invalidFields.join(
              ", "
            )}. Valid fields: ${validFields.join(", ")}`,
            400
          )
        );
      }
      fieldsToSelect = requestedFields.join(",");
    }

    // Build base query for counting
    let countQuery = supabase
      .from("goals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Build base query for data
    let dataQuery = supabase
      .from("goals")
      .select(fieldsToSelect)
      .eq("user_id", userId);

    // Apply filters to both queries
    if (frequency) {
      countQuery = countQuery.eq("frequency", frequency);
      dataQuery = dataQuery.eq("frequency", frequency);
    }

    if (goal_type) {
      countQuery = countQuery.eq("goal_type", goal_type);
      dataQuery = dataQuery.eq("goal_type", goal_type);
    }

    if (target_unit) {
      countQuery = countQuery.eq("target_unit", target_unit);
      dataQuery = dataQuery.eq("target_unit", target_unit);
    }

    // Execute count query
    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      return next(new ErrorResponse(countError.message, 500));
    }

    // Apply sorting and pagination to data query
    dataQuery = dataQuery
      .order(sortBy, { ascending: sortOrder.toLowerCase() === "asc" })
      .range(offset, offset + limit - 1);

    // Execute data query
    const { data, error } = await dataQuery;

    if (error) {
      return next(new ErrorResponse(error.message, 500));
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((totalCount || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.status(200).json({
      success: true,
      data,
      message: "Goals retrieved successfully",
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount || 0,
        limit: limit,
        hasNextPage: hasNextPage,
        hasPreviousPage: hasPreviousPage,
      },
      filters: {
        frequency: frequency || null,
        goal_type: goal_type || null,
        target_unit: target_unit || null,
      },
      sorting: {
        sortBy,
        sortOrder,
      },
    });
  }
);

export const getUserGoal = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { goalId } = req.params;
    const userId = req.user.id;

    // Fetch the goal for the user
    const { data: goal, error: fetchError } = await supabase
      .from("goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !goal) {
      return next(
        new ErrorResponse("Goal not found or does not belong to user", 404)
      );
    }

    res.status(200).json({
      success: true,
      data: goal,
      message: "Goal retrieved successfully",
    });
  }
);

export const deleteGoal = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { goalId } = req.params;
    const userId = req.user.id;

    // Check if the goal exists and belongs to the user
    const { data: goal, error: fetchError } = await supabase
      .from("goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !goal) {
      return next(
        new ErrorResponse("Goal not found or does not belong to user", 404)
      );
    }

    // Delete the goal
    const { error: deleteError } = await supabase
      .from("goals")
      .delete()
      .eq("id", goalId);

    if (deleteError) {
      return next(new ErrorResponse(deleteError.message, 500));
    }

    res.status(200).json({
      success: true,
      message: "Goal deleted successfully",
    });
  }
);

export const editGoal = asyncHandler(
  async (
    req: Request<object, object, Partial<Goal>>,
    res: Response,
    next: NextFunction
  ) => {
    const { goalId } = req.params as { goalId: string }
    const userId = req.user.id;

    // Fetch the existing goal
    const { data: existingGoal, error: fetchError } = await supabase
      .from("goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingGoal) {
      return next(
        new ErrorResponse("Goal not found or does not belong to user", 404)
      );
    }

    // Extract only the fields that can be updated
    const { title, description, goalType, targetValue, targetUnit, frequency } = req.body;
    
    // Build update object with only provided fields
    const updateData: Partial<Goal> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (goalType !== undefined) updateData.goalType = goalType;
    if (targetValue !== undefined) updateData.targetValue = targetValue;
    if (targetUnit !== undefined) updateData.targetUnit = targetUnit;
    if (frequency !== undefined) updateData.frequency = frequency;

    // Add updated_at timestamp
    updateData.updated_at = new Date();

    // Update the goal with new data
    const { data: updatedGoal, error: updateError } = await supabase
      .from("goals")
      .update({
        title: updateData.title,
        description: updateData.description,
        goal_type: updateData.goalType,
        target_value: updateData.targetValue,
        target_unit: updateData.targetUnit,
        frequency: updateData.frequency,
        updated_at: updateData.updated_at,
      })
      .eq("id", goalId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateError) {
      return next(new ErrorResponse(updateError.message, 500));
    }

    res.status(200).json({
      success: true,
      data: updatedGoal,
      message: "Goal updated successfully",
    });
  }
);