import { Frequency } from "../types/types";

const toDateOnly = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

function getPeriodRange(frequency: string, date: Date) {
  const baseDate = toDateOnly(date);
  let start: Date;
  let end: Date;

  switch (frequency) {
    case Frequency.WEEKLY: {
      const day = baseDate.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      start = new Date(baseDate);
      start.setDate(baseDate.getDate() + mondayOffset);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    }
    case Frequency.MONTHLY:
      start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      break;
    case Frequency.DAILY:
    default:
      start = new Date(baseDate);
      end = new Date(baseDate);
  }

  return { start, end };
}

const formatDateOnly = (date: Date) => toDateOnly(date).toISOString().split("T")[0];

export { formatDateOnly, getPeriodRange };
