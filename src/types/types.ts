export enum Gender {
  Male = "male",
  Female = "female",
  Other = "other",
}

export enum GoalType {
  TIME = "time",
  COMPLETION = "completion",
  CUSTOM = "custom",
}

export enum Frequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string | null;
  timezone: string | null;
  email: string;
  notification_preferences: {
    push: boolean;
    email: boolean;
  } | null;
  created_at: Date | null;
  updated_at: Date | null;
  gender: string | null;
  image: string | null;
}

declare module "express-serve-static-core" {
  interface Request {
    user: UserProfile;
  }
}

export interface ProgressEntry {
  id?: string;
  user_id?: string;
  goal_id: string;
  date: string;
  value: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SignUpRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: Gender;
}

export interface Goal {
  title: string;
  description: string;
  goalType: GoalType;
  targetValue: number;
  targetUnit: string;
  frequency: Frequency;
  updated_at?: Date;
}