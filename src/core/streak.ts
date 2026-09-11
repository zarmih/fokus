export function nextStreak(prevDateStr: string | null, prevStreak: number, todayDateStr: string, shieldCharges: number = 0): {streak: number, skipped: boolean, shieldsUsed: number} {
  if (!prevDateStr) return {streak: 1, skipped: false, shieldsUsed: 0};
  const prevDate = new Date(prevDateStr);
  const todayDate = new Date(todayDateStr);
  prevDate.setHours(0,0,0,0);
  todayDate.setHours(0,0,0,0);
  
  const diffTime = todayDate.getTime() - prevDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return {streak: prevStreak, skipped: false, shieldsUsed: 0};
  if (diffDays === 1) return {streak: prevStreak + 1, skipped: false, shieldsUsed: 0};
  if (diffDays === 2 && shieldCharges > 0) return {streak: prevStreak + 1, skipped: true, shieldsUsed: 1};
  return {streak: 1, skipped: false, shieldsUsed: 0};
}
