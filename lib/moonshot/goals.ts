export const MOONSHOT_GOAL_META = [
  { key: 'goal1', title: 'Goal 1' },
  { key: 'goal2', title: 'Goal 2' },
  { key: 'goal3', title: 'Goal 3' },
  { key: 'goal7', title: 'Goal 7' },
] as const

export const MOONSHOT_GOAL_KEYS: string[] = MOONSHOT_GOAL_META.map((goal) => goal.key)

export const MOONSHOT_GOAL_TITLE_MAP: Record<string, string> = Object.fromEntries(
  MOONSHOT_GOAL_META.map((goal) => [goal.key, goal.title])
)
