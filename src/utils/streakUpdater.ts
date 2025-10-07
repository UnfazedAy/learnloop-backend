import { supabase } from "../config/database";

export async function updateStreak(userId: string, goalId: string, date: string) {
  try {
    // Get existing streak
    const { data: existingStreak } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .single();

    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (existingStreak) {
      let newCurrentStreak = 1;
      
      // If last completed date was yesterday, increment streak
      if (existingStreak.last_completed_date === yesterdayStr) {
        newCurrentStreak = existingStreak.current_streak + 1;
      }
      
      // Update best streak if current is higher
      const newBestStreak = Math.max(existingStreak.best_streak, newCurrentStreak);

      await supabase
        .from("streaks")
        .update({
          current_streak: newCurrentStreak,
          best_streak: newBestStreak,
          last_completed_date: date,
          updated_at: new Date()
        })
        .eq("id", existingStreak.id);
    } else {
      // Create new streak
      await supabase
        .from("streaks")
        .insert({
          user_id: userId,
          goal_id: goalId,
          current_streak: 1,
          best_streak: 1,
          last_completed_date: date
        });
    }
  } catch (error) {
    console.error('Error updating streak:', error);
    // Don't throw error to avoid breaking progress logging
  }
}