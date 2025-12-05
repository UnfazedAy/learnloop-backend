function getPeriodRange(frequency: string, date: Date) {
  let start: Date, end: Date;
  switch (frequency) {
    case "weekly":
      start = new Date(date);
      start.setDate(date.getDate() - date.getDay()); // Sunday start
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    case "monthly":
      start = new Date(date.getFullYear(), date.getMonth(), 1);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      break;
    default: // daily
      start = new Date(date);
      end = new Date(date);
  }
  return { start, end };
}

export { getPeriodRange };