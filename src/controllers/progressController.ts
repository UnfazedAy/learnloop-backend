import { supabase } from "../config/database";
import { asyncHandler } from "../middleWares/errorHandler";
import ErrorResponse from "../utils/errorResponse";
import { Request, Response, NextFunction } from "express";
import { ProgressEntry, Frequency } from "../types/types";
import { updateStreak } from "../utils/streakUpdater";

export const logProgress = asyncHandler(async (
  req: Request<{ goalId: string }, object, ProgressEntry>,
  res: Response,
  next: NextFunction
) => {
  const { value, notes } = req.body;
  const { id: userId } = req.user;
  const { goalId } = req.params;

  if (value == null || value < 0)
    return next(new ErrorResponse("Progress value must be >= 0", 400));

  // Fetch goal
  const { data: goalData, error: goalErr } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", userId)
    .single();

  if (goalErr || !goalData)
    return next(new ErrorResponse("Goal not found", 404));

  const today = new Date().toISOString().split("T")[0];

  // Check if today's progress exists
  const { data: existing } = await supabase
    .from("progress_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .eq("date", today)
    .single();

  let progressEntry;

  if (existing) {
    const { data, error } = await supabase
      .from("progress_entries")
      .update({
        value,
        notes,
        updated_at: new Date(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) return next(new ErrorResponse(error.message, 500));
    progressEntry = data;

  } else {
    const { data, error } = await supabase
      .from("progress_entries")
      .insert({
        user_id: userId,
        goal_id: goalId,
        value,
        notes,
        date: today,
      })
      .select("*")
      .single();

    if (error) return next(new ErrorResponse(error.message, 500));
    progressEntry = data;
  }

  // -----------------------------------------------------
  // PERIOD COMPLETION LOGIC
  // -----------------------------------------------------

  const now = new Date();
  let periodStart = new Date(now);
  let periodEnd = new Date(now);

  if (goalData.frequency === Frequency.DAILY) {
    // Start and end are today — no change needed
  }

  if (goalData.frequency === Frequency.WEEKLY) {
    // Monday: 1, Sunday: 0
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    periodStart.setDate(now.getDate() + mondayOffset);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);
  }

  if (goalData.frequency === Frequency.MONTHLY) {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const startStr = periodStart.toISOString().split("T")[0];
  const endStr = periodEnd.toISOString().split("T")[0];

  // Sum progress for entire period
  const { data: periodRows } = await supabase
    .from("progress_entries")
    .select("value")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .gte("date", startStr)
    .lte("date", endStr);

  const totalProgress = (periodRows || []).reduce((sum, p) => sum + p.value, 0);

  const isPeriodCompleted = totalProgress >= goalData.target_value;

  // Update streak only when period completes
  if (isPeriodCompleted) {
    await updateStreak(userId, goalId, today, goalData.frequency);
  }

  return res.status(200).json({
    success: true,
    message: existing ? "Progress updated successfully" : "Progress logged successfully",
    data: {
      progress: progressEntry,
      totalProgress,
      periodCompleted: isPeriodCompleted,
      goal: goalData,
    },
  });
});


// Get progress entries with filtering and pagination
export const getProgress = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;

    // Filtering parameters
    const { goalId, startDate, endDate, dateRange } = req.query;

    // Date range helpers
    const dateFilter: { start?: string; end?: string } = {};
    
    if (startDate && endDate) {
      dateFilter.start = startDate as string;
      dateFilter.end = endDate as string;
    } else if (dateRange) {
      const today = new Date();
      switch (dateRange) {
        case 'week': {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - 7);
          dateFilter.start = weekStart.toISOString().split('T')[0];
          dateFilter.end = today.toISOString().split('T')[0];
          break;
        }
        case 'month': {
          const monthStart = new Date(today);
          monthStart.setMonth(today.getMonth() - 1);
          dateFilter.start = monthStart.toISOString().split('T')[0];
          dateFilter.end = today.toISOString().split('T')[0];
          break;
        }
        case 'year': {
          const yearStart = new Date(today);
          yearStart.setFullYear(today.getFullYear() - 1);
          dateFilter.start = yearStart.toISOString().split('T')[0];
          dateFilter.end = today.toISOString().split('T')[0];
          break;
        }
      }
    }

    // Build query
    let query = supabase
      .from("progress_entries")
      .select(`
        *,
        goals (
          id,
          title,
          goal_type,
          target_value,
          target_unit
        )
      `)
      .eq("user_id", userId)
      .order("date", { ascending: false });

    // Apply filters
    if (goalId) {
      query = query.eq("goal_id", goalId);
    }

    if (dateFilter.start && dateFilter.end) {
      query = query.gte("date", dateFilter.start).lte("date", dateFilter.end);
    }

    // Get total count
    const countQuery = supabase
      .from("progress_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Apply same filters to count query
    if (goalId) countQuery.eq("goal_id", goalId);
    if (dateFilter.start && dateFilter.end) {
      countQuery.gte("date", dateFilter.start).lte("date", dateFilter.end);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      return next(new ErrorResponse(countError.message, 500));
    }

    // Execute main query with pagination
    const { data, error } = await query.range(offset, offset + limit - 1);

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
      message: "Progress entries retrieved successfully",
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: totalCount || 0,
        limit,
        hasNextPage,
        hasPreviousPage,
      },
      filters: {
        goalId: goalId || null,
        dateRange: dateRange || null,
        startDate: dateFilter.start || null,
        endDate: dateFilter.end || null,
      },
    });
  }
);

// Get progress statistics and analytics
export const getProgressStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const { goalId, period = 'month' } = req.query;

    // Calculate date range based on period
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];

    // Build base query
    let query = supabase
      .from("progress_entries")
      .select(`
        *,
        goals (
          id,
          title,
          goal_type,
          target_value,
          target_unit,
          frequency
        )
      `)
      .eq("user_id", userId)
      .gte("date", startDateStr)
      .lte("date", endDateStr);

    if (goalId) {
      query = query.eq("goal_id", goalId);
    }

    const { data: progressData, error } = await query;

    if (error) {
      return next(new ErrorResponse(error.message, 500));
    }

    // Calculate statistics
    const stats = {
      totalEntries: progressData.length,
      totalDaysTracked: new Set(progressData.map(p => p.date)).size,
      averageProgress: 0,
      completionRate: 0,
      goalBreakdown: {} as Record<string, {
        goalTitle: string;
        totalEntries: number;
        completedDays: number;
        completionRate: number;
        averageValue: number;
      }>,
      dailyProgress: [] as { date: string; totalValue: number; entriesCount: number; goalsCompleted: number }[],
    };

    if (progressData.length > 0) {
      // Calculate averages and completion rates
      const totalProgress = progressData.reduce((sum, entry) => sum + entry.value, 0);
      stats.averageProgress = Math.round(totalProgress / progressData.length * 100) / 100;

      // Group by goals for breakdown
      const goalGroups = progressData.reduce((acc, entry) => {
        const goalId = entry.goal_id;
        if (!acc[goalId]) {
          acc[goalId] = {
            goal: entry.goals,
            entries: [],
            completedDays: 0
          };
        }
        acc[goalId].entries.push(entry);
        
        // Check if target was met
        if (entry.value >= entry.goals.target_value) {
          acc[goalId].completedDays++;
        }
        
        return acc;
      }, {} as Record<string, {
        date: string;
        entries: Array<{
          goalId: string;
          goalTitle: string;
          value: number;
          targetValue: number;
          unit: string;
          completed: boolean;
          notes: string;
        }>;
        totalProgress: number;
        goalsCompleted: number;
        hasActivity: boolean;
      }>);

      // Calculate completion rate and goal breakdown
      let totalCompletedDays = 0;
      Object.keys(goalGroups).forEach(goalId => {
        const group = goalGroups[goalId];
        const completionRate = (group.completedDays / group.entries.length) * 100;
        
        stats.goalBreakdown[goalId] = {
          goalTitle: group.goal.title,
          totalEntries: group.entries.length,
          completedDays: group.completedDays,
          completionRate: Math.round(completionRate * 100) / 100,
          averageValue: Math.round((group.entries.reduce((sum: number, e: { value: number }) => sum + e.value, 0) / group.entries.length) * 100) / 100
        };
        
        totalCompletedDays += group.completedDays;
      });

      stats.completionRate = Math.round((totalCompletedDays / progressData.length) * 100 * 100) / 100;

      // Prepare daily progress for charts
      const dailyGroups = progressData.reduce((acc, entry) => {
        if (!acc[entry.date]) {
          acc[entry.date] = [];
        }
        acc[entry.date].push(entry);
        return acc;
      }, {} as Record<string, typeof progressData>);

      stats.dailyProgress = Object.keys(dailyGroups)
        .sort()
        .map(date => ({
          date,
          totalValue: dailyGroups[date].reduce((sum: number, entry: ProgressEntry) => sum + entry.value, 0),
          entriesCount: dailyGroups[date].length,
          goalsCompleted: dailyGroups[date].filter((entry: ProgressEntry & { goals: { target_value: number } }) => entry.value >= entry.goals.target_value).length
        }));
    }

    res.status(200).json({
      success: true,
      data: stats,
      message: "Progress statistics retrieved successfully",
    });
  }
);

// Get progress for calendar view
export const getProgressCalendar = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const { year, month } = req.params;
    
    // Validate year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return next(new ErrorResponse("Invalid year or month", 400));
    }

    // Calculate start and end dates for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // Last day of month
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("progress_entries")
      .select(`
        *,
        goals (
          id,
          title,
          target_value,
          target_unit,
          goal_type
        )
      `)
      .eq("user_id", userId)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true });

    if (error) {
      return next(new ErrorResponse(error.message, 500));
    }

    // Group progress by date
    const calendarData = data.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          entries: [],
          totalProgress: 0,
          goalsCompleted: 0,
          hasActivity: true
        };
      }
      
      acc[date].entries.push({
        goalId: entry.goal_id,
        goalTitle: entry.goals.title,
        value: entry.value,
        targetValue: entry.goals.target_value,
        unit: entry.goals.target_unit,
        completed: entry.value >= entry.goals.target_value,
        notes: entry.notes
      });
      
      acc[date].totalProgress += entry.value;
      if (entry.value >= entry.goals.target_value) {
        acc[date].goalsCompleted++;
      }
      
      return acc;
    }, {} as Record<string, {
      date: string;
      entries: Array<{
        goalId: string;
        goalTitle: string;
        value: number;
        targetValue: number;
        unit: string;
        completed: boolean;
        notes: string;
      }>;
      totalProgress: number;
      goalsCompleted: number;
      hasActivity: boolean;
    }>);

    res.status(200).json({
      success: true,
      data: calendarData,
      message: "Calendar progress retrieved successfully",
    });
  }
);

// Delete progress entry
export const deleteProgress = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { progressId } = req.params;
    const userId = req.user.id;

    // Check if progress entry exists and belongs to user
    const { data: progressEntry, error: fetchError } = await supabase
      .from("progress_entries")
      .select("*")
      .eq("id", progressId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !progressEntry) {
      return next(
        new ErrorResponse("Progress entry not found or does not belong to user", 404)
      );
    }

    // Delete the progress entry
    const { error: deleteError } = await supabase
      .from("progress_entries")
      .delete()
      .eq("id", progressId);

    if (deleteError) {
      return next(new ErrorResponse(deleteError.message, 500));
    }

    // TODO: Recalculate streaks if this was a completed goal day
    // This would require more complex logic to check other goals for that date

    res.status(200).json({
      success: true,
      message: "Progress entry deleted successfully",
    });
  }
);