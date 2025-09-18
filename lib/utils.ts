export function tsToDate(x: any): Date {
if (!x) return new Date(0);
if (typeof x?.toDate === 'function') return x.toDate();
if (x?.seconds) return new Date(x.seconds * 1000);
return new Date(x);
}
export function isoWeekKey(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7; // 1..7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((date.getTime()-yearStart.getTime())/86400000)+1)/7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}