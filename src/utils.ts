export function getLocalDateString(date: Date = new Date()): string {
  const d = new Date(date);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
}
