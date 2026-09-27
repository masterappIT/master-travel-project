export function withinImmediateWindow(scheduledAt: Date, now: Date, minutes: number): boolean {
  return (scheduledAt.getTime() - now.getTime()) / 60000 <= minutes
}

export function isAutomaticExtra(extra: { triggerType: string; requiredForImmediate: boolean }): boolean {
  return extra.triggerType === 'IMMEDIATE' || extra.triggerType === 'NIGHT' || extra.triggerType === 'WEATHER' || extra.requiredForImmediate
}

export function manualExtraSelections<T extends { id: string; quantity: number }>(
  selections: T[],
  extras: Array<{ id: string; triggerType: string; requiredForImmediate: boolean }>
): T[] {
  const automaticIds = new Set(extras.filter(isAutomaticExtra).map(extra => extra.id))
  return selections.filter(selection => !automaticIds.has(selection.id))
}

export function billableExtraSelections<T extends { id: string; quantity: number }>(
  selections: T[],
  extras: Array<{ id: string; triggerType: string; requiredForImmediate: boolean }>,
  triggeredIds: string[]
): Array<{ id: string; quantity: number }> {
  return [
    ...manualExtraSelections(selections, extras),
    ...triggeredIds.map(id => ({ id, quantity: 1 }))
  ]
}
