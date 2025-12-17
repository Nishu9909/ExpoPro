import { Transaction, Prediction } from '../types';

export const analyzeRecurringBills = (transactions: Transaction[]): Prediction | null => {
  if (transactions.length < 2) return null;

  const expenses = transactions.filter(t => t.type === 'expense');
  const groups: Record<string, Transaction[]> = {};

  // 1. Group by normalized description
  expenses.forEach(t => {
    const desc = t.description.toLowerCase().trim();
    if (!groups[desc]) groups[desc] = [];
    groups[desc].push(t);
  });

  const today = new Date();
  let bestPrediction: Prediction | null = null;

  // 2. Analyze each group for patterns
  Object.entries(groups).forEach(([desc, history]) => {
    // Need at least 2 transactions to establish a pattern
    if (history.length < 2) return;

    // Sort by date descending (newest first)
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate intervals between consecutive transactions
    const intervals: number[] = [];
    for (let i = 0; i < history.length - 1; i++) {
      const d1 = new Date(history[i].date);
      const d2 = new Date(history[i+1].date);
      const diffDays = (d1.getTime() - d2.getTime()) / (1000 * 3600 * 24);
      intervals.push(diffDays);
    }

    // Calculate Average Interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Check for consistency (Variance check)
    // We allow a 5-day variance for "human error" or weekends
    const isConsistent = intervals.every(i => Math.abs(i - avgInterval) < 5);

    if (isConsistent) {
      const lastTx = history[0];
      const lastDate = new Date(lastTx.date);
      const nextDate = new Date(lastDate);
      
      // Add the average interval to the last date
      nextDate.setDate(lastDate.getDate() + Math.round(avgInterval));

      // Calculate days remaining
      const timeUntil = nextDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(timeUntil / (1000 * 3600 * 24));

      // 3. Filter Logic:
      // - Must be due soon (within next 7 days)
      // - Must not be in the past (already paid)
      // - Must look like a recurring bill (roughly 7, 30, or 365 days)
      const isWeekly = Math.abs(avgInterval - 7) < 2;
      const isMonthly = Math.abs(avgInterval - 30) < 5;
      const isYearly = Math.abs(avgInterval - 365) < 10;

      if ((isWeekly || isMonthly || isYearly) && daysUntil >= 0 && daysUntil <= 7) {
        
        // Pick the soonest one if multiple exist
        if (!bestPrediction || daysUntil < bestPrediction.daysRemaining) {
          bestPrediction = {
            description: lastTx.description, // Use original casing
            predictedDate: nextDate.toISOString().split('T')[0],
            daysRemaining: daysUntil,
            avgAmount: history.reduce((sum, t) => sum + t.amount, 0) / history.length
          };
        }
      }
    }
  });

  return bestPrediction;
};