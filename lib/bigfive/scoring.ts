export type BigFiveAnswers = Record<number, number> // questionNumber -> 0..4

export type BigFiveScores = {
  extraversion: number
  agreeableness: number
  conscientiousness: number
  neuroticism: number
  openness: number
}

function invertScore(score: number): number {
  // 0→4, 1→3, 2→2, 3→1, 4→0
  return 4 - score
}

export function computeBigFiveScores(answers: BigFiveAnswers): BigFiveScores {
  const a = (n: number) => answers[n]

  // 6〜10は反転して計算
  const q6 = invertScore(a(6))
  const q7 = invertScore(a(7))
  const q8 = invertScore(a(8))
  const q9 = invertScore(a(9))
  const q10 = invertScore(a(10))

  return {
    extraversion: a(1) + q6,
    agreeableness: a(2) + q7,
    conscientiousness: a(3) + q8,
    neuroticism: a(4) + q9,
    openness: a(5) + q10,
  }
}

