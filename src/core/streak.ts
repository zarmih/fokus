export function nextStreak(prevDateStr: string | null, prevStreak: number, todayDateStr: string, shieldLastUsed?: string): {streak: number, skipped: boolean, shieldUsed: boolean} {
  if (!prevDateStr) return {streak: 1, skipped: false, shieldUsed: false};
  const prevDate = new Date(prevDateStr);
  const todayDate = new Date(todayDateStr);
  prevDate.setHours(0,0,0,0);
  todayDate.setHours(0,0,0,0);
  
  const diffTime = todayDate.getTime() - prevDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return {streak: prevStreak, skipped: false, shieldUsed: false};
  if (diffDays === 1) return {streak: prevStreak + 1, skipped: false, shieldUsed: false};
  if (diffDays === 2) {
    const canUseShield = !shieldLastUsed || (todayDate.getTime() - new Date(shieldLastUsed).getTime()) >= 7 * 24 * 3600 * 1000;
    if (canUseShield) {
      return {streak: prevStreak + 1, skipped: true, shieldUsed: true};
    }
  }
  return {streak: 1, skipped: false, shieldUsed: false};
}
