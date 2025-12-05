import { supabase } from "../config/database";
import { Frequency } from "../types/types";

/**
 * Update streak after a period (day/week/month) is completed.
 * - Daily → check yesterday
 * - Weekly → check previous week
 * - Monthly → check previous month
 */
export async function updateStreak(
  userId: string,
  goalId: string,
  date: string,
  frequency: Frequency
) {
  try {
    const { data: existingStreak } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .single();

    const current = new Date(date);
    const prevPeriodDate = new Date(current);

    if (frequency === Frequency.DAILY) {
      prevPeriodDate.setDate(current.getDate() - 1);

    } else if (frequency === Frequency.WEEKLY) {
      prevPeriodDate.setDate(current.getDate() - 7);

    } else if (frequency === Frequency.MONTHLY) {
      prevPeriodDate.setMonth(current.getMonth() - 1);
    }

    const prevPeriodStr = prevPeriodDate.toISOString().split("T")[0];

    if (existingStreak) {
      let newCurrent = 1;

      if (existingStreak.last_completed_date === prevPeriodStr) {
        newCurrent = existingStreak.current_streak + 1;
      }

      const newBest = Math.max(existingStreak.best_streak, newCurrent);

      await supabase
        .from("streaks")
        .update({
          current_streak: newCurrent,
          best_streak: newBest,
          last_completed_date: date,
          updated_at: new Date(),
        })
        .eq("id", existingStreak.id);

    } else {
      // Create first streak record
      await supabase.from("streaks").insert({
        user_id: userId,
        goal_id: goalId,
        current_streak: 1,
        best_streak: 1,
        last_completed_date: date,
      });
    }
  } catch (e) {
    console.error("Error updating streak:", e);
  }
}
