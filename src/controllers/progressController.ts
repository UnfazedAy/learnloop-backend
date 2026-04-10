import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/database";
import { asyncHandler } from "../middleWares/errorHandler";
import ErrorResponse from "../utils/errorResponse";
import { ProgressEntry } from "../types/types";
import { formatDateOnly, getPeriodRange } from "../utils/periodRange";
import { updateStreak } from "../utils/streakUpdater";

type GoalRecord = {
  id: string;
  title: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  frequency: string;
  user_id: string;
};

type ProgressEntryWithGoal = {
  id: string;
  user_id: string;
  goal_id: string;
  date: string;
  value: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  goals: GoalRecord;
};

type GoalGroup = {
  goal: GoalRecord;
  entries: ProgressEntryWithGoal[];
  completedDays: number;
};

const roundToTwo = (value: number) => Math.round(value * 100) / 100;

const getDateRangeForPeriod = (period: string, today: Date) => {
  const startDate = new Date(today);

  switch (period) {
    case "week":
      startDate.setDate(today.getDate() - 7);
      break;
    case "year":
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    case "month":
    default:
      startDate.setMonth(today.getMonth() - 1);
      break;
  }

  return {
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(today),
  };
};

export const logProgress = asyncHandler(async (
  req: Request<{ goalId: string }, object, ProgressEntry>,
  res: Response,
  next: NextFunction
) => {
  const { value, notes } = req.body;
  const { id: userId } = req.user;
  const { goalId } = req.params;

  if (value == null || value < 0) {
    return next(new ErrorResponse("Progress value must be >= 0", 400));
  }

  const { data: goalData, error: goalErr } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", userId)
    .single<GoalRecord>();

  if (goalErr || !goalData) {
    return next(new ErrorResponse("Goal not found", 404));
  }

  const today = formatDateOnly(new Date());

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

  const { start, end } = getPeriodRange(goalData.frequency, new Date());
  const startStr = formatDateOnly(start);
  const endStr = formatDateOnly(end);

  const { data: periodRows } = await supabase
    .from("progress_entries")
    .select("value")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .gte("date", startStr)
    .lte("date", endStr);

  const totalProgress = (periodRows || []).reduce(
    (sum, row) => sum + Number(row.value || 0),
    0
  );

  const isPeriodCompleted = totalProgress >= goalData.target_value;

  if (isPeriodCompleted) {
    await updateStreak(userId, goalId, today, goalData.frequency as never);
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

export const getProgress = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const { goalId, startDate, endDate, dateRange } = req.query;

    const dateFilter: { start?: string; end?: string } = {};

    if (startDate && endDate) {
      dateFilter.start = startDate as string;
      dateFilter.end = endDate as string;
    } else if (dateRange) {
      const today = new Date();
      const range = getDateRangeForPeriod(dateRange as string, today);
      dateFilter.start = range.startDate;
      dateFilter.end = range.endDate;
    }

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
      .order("date", { ascending: false });

    if (goalId) {
      query = query.eq("goal_id", goalId);
    }

    if (dateFilter.start && dateFilter.end) {
      query = query.gte("date", dateFilter.start).lte("date", dateFilter.end);
    }

    let countQuery = supabase
      .from("progress_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (goalId) {
      countQuery = countQuery.eq("goal_id", goalId);
    }

    if (dateFilter.start && dateFilter.end) {
      countQuery = countQuery
        .gte("date", dateFilter.start)
        .lte("date", dateFilter.end);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      return next(new ErrorResponse(countError.message, 500));
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return next(new ErrorResponse(error.message, 500));
    }

    const totalPages = Math.ceil((totalCount || 0) / limit);

    res.status(200).json({
      success: true,
      data,
      message: "Progress entries retrieved successfully",
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: totalCount || 0,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
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

export const getProgressStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const { goalId, period = "month" } = req.query;
    const today = new Date();
    const { startDate, endDate } = getDateRangeForPeriod(period as string, today);

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
      .gte("date", startDate)
      .lte("date", endDate);

    if (goalId) {
      query = query.eq("goal_id", goalId);
    }

    const { data: progressData, error } = await query;

    if (error) {
      return next(new ErrorResponse(error.message, 500));
    }

    const typedProgress = (progressData || []) as ProgressEntryWithGoal[];

    const stats = {
      totalEntries: typedProgress.length,
      totalDaysTracked: new Set(typedProgress.map((entry) => entry.date)).size,
      averageProgress: 0,
      completionRate: 0,
      goalBreakdown: {} as Record<
        string,
        {
          goalTitle: string;
          targetValue: number;
          targetUnit: string;
          frequency: string;
          totalEntries: number;
          completedDays: number;
          completionRate: number;
          averageValue: number;
          currentPeriodProgress: number;
          currentProgressPercentage: number;
          remainingToTarget: number;
          currentPeriodStart: string;
          currentPeriodEnd: string;
        }
      >,
      dailyProgress: [] as Array<{
        date: string;
        totalValue: number;
        entriesCount: number;
        goalsCompleted: number;
      }>,
    };

    if (typedProgress.length > 0) {
      const totalProgress = typedProgress.reduce(
        (sum, entry) => sum + Number(entry.value || 0),
        0
      );
      stats.averageProgress = roundToTwo(totalProgress / typedProgress.length);

      const goalGroups = typedProgress.reduce<Record<string, GoalGroup>>(
        (acc, entry) => {
          if (!acc[entry.goal_id]) {
            acc[entry.goal_id] = {
              goal: entry.goals,
              entries: [],
              completedDays: 0,
            };
          }

          acc[entry.goal_id].entries.push(entry);

          if (entry.value >= entry.goals.target_value) {
            acc[entry.goal_id].completedDays += 1;
          }

          return acc;
        },
        {}
      );

      let totalCompletedDays = 0;

      Object.entries(goalGroups).forEach(([currentGoalId, group]) => {
        const completionRate = (group.completedDays / group.entries.length) * 100;
        const { start, end } = getPeriodRange(group.goal.frequency, today);
        const currentPeriodStart = formatDateOnly(start);
        const currentPeriodEnd = formatDateOnly(end);
        const currentPeriodProgress = roundToTwo(
          group.entries
            .filter(
              (entry) =>
                entry.date >= currentPeriodStart && entry.date <= currentPeriodEnd
            )
            .reduce((sum, entry) => sum + Number(entry.value || 0), 0)
        );
        const currentProgressPercentage =
          group.goal.target_value > 0
            ? roundToTwo(
                Math.min(
                  100,
                  (currentPeriodProgress / group.goal.target_value) * 100
                )
              )
            : 0;

        stats.goalBreakdown[currentGoalId] = {
          goalTitle: group.goal.title,
          targetValue: group.goal.target_value,
          targetUnit: group.goal.target_unit,
          frequency: group.goal.frequency,
          totalEntries: group.entries.length,
          completedDays: group.completedDays,
          completionRate: roundToTwo(completionRate),
          averageValue: roundToTwo(
            group.entries.reduce((sum, entry) => sum + Number(entry.value || 0), 0) /
              group.entries.length
          ),
          currentPeriodProgress,
          currentProgressPercentage,
          remainingToTarget: roundToTwo(
            Math.max(0, group.goal.target_value - currentPeriodProgress)
          ),
          currentPeriodStart,
          currentPeriodEnd,
        };

        totalCompletedDays += group.completedDays;
      });

      stats.completionRate = roundToTwo(
        (totalCompletedDays / typedProgress.length) * 100
      );

      const dailyGroups = typedProgress.reduce<Record<string, ProgressEntryWithGoal[]>>(
        (acc, entry) => {
          if (!acc[entry.date]) {
            acc[entry.date] = [];
          }
          acc[entry.date].push(entry);
          return acc;
        },
        {}
      );

      stats.dailyProgress = Object.keys(dailyGroups)
        .sort()
        .map((date) => ({
          date,
          totalValue: roundToTwo(
            dailyGroups[date].reduce((sum, entry) => sum + Number(entry.value || 0), 0)
          ),
          entriesCount: dailyGroups[date].length,
          goalsCompleted: dailyGroups[date].filter(
            (entry) => entry.value >= entry.goals.target_value
          ).length,
        }));
    }

    res.status(200).json({
      success: true,
      data: stats,
      message: "Progress statistics retrieved successfully",
    });
  }
);

export const getProgressCalendar = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return next(new ErrorResponse("Invalid year or month", 400));
    }

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);
    const startDateStr = formatDateOnly(startDate);
    const endDateStr = formatDateOnly(endDate);

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

    const typedData = (data || []) as ProgressEntryWithGoal[];

    const calendarData = typedData.reduce<
      Record<
        string,
        {
          date: string;
          entries: Array<{
            goalId: string;
            goalTitle: string;
            value: number;
            targetValue: number;
            unit: string;
            completed: boolean;
            notes?: string | null;
          }>;
          totalProgress: number;
          goalsCompleted: number;
          hasActivity: boolean;
        }
      >
    >((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = {
          date: entry.date,
          entries: [],
          totalProgress: 0,
          goalsCompleted: 0,
          hasActivity: true,
        };
      }

      acc[entry.date].entries.push({
        goalId: entry.goal_id,
        goalTitle: entry.goals.title,
        value: entry.value,
        targetValue: entry.goals.target_value,
        unit: entry.goals.target_unit,
        completed: entry.value >= entry.goals.target_value,
        notes: entry.notes,
      });

      acc[entry.date].totalProgress += entry.value;

      if (entry.value >= entry.goals.target_value) {
        acc[entry.date].goalsCompleted += 1;
      }

      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: calendarData,
      message: "Calendar progress retrieved successfully",
    });
  }
);

export const deleteProgress = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { progressId } = req.params;
    const userId = req.user.id;

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

    const { error: deleteError } = await supabase
      .from("progress_entries")
      .delete()
      .eq("id", progressId);

    if (deleteError) {
      return next(new ErrorResponse(deleteError.message, 500));
    }

    res.status(200).json({
      success: true,
      message: "Progress entry deleted successfully",
    });
  }
);
