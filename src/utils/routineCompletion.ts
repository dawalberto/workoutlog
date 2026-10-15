export function shouldPromptForAllSetsComplete(
  wasAllSetsComplete: boolean,
  completedSetsCount: number,
  totalSetsCount: number,
  hasActiveSession: boolean,
): boolean {
  return !wasAllSetsComplete &&
    totalSetsCount > 0 &&
    completedSetsCount === totalSetsCount &&
    hasActiveSession;
}
