export function tsToDate(x: any): Date {
  if (!x) return new Date(0);
  
  // Firestore Timestamp object
  if (typeof x?.toDate === 'function') return x.toDate();
  
  // Firestore timestamp with seconds property
  if (x?.seconds) return new Date(x.seconds * 1000);
  
  // PostgreSQL timestamp string (e.g., '2025-09-18 16:41:03.85+00')
  if (typeof x === 'string') {
    const date = new Date(x);
    // Check if it's a valid date
    if (!isNaN(date.getTime())) return date;
  }
  
  // Fallback to direct Date construction
  const date = new Date(x);
  if (!isNaN(date.getTime())) return date;
  
  // If all else fails, return epoch
  console.warn('Invalid date value:', x);
  return new Date(0);
}
export function isoWeekKey(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7; // 1..7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((date.getTime()-yearStart.getTime())/86400000)+1)/7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}