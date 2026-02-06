import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // まずテーマを1件作る（MVP）
  const theme = await prisma.theme.create({
    data: {
      title: 'AIと人間の未来',
      description: 'AIが人間の仕事を奪うこと、社会の公平性、創造性の価値などを考える。',
      imageUrl:
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=60',
      status: 'ACTIVE',
    },
  })

  // 20問（ひとまず叩き台）
  const questions = [
    'AIが人間の仕事を奪う未来は、全体として良いと思う。',
    'AIに重要な判断（医療・司法など）を任せてもよいと思う。',
    'AIが作った作品を「芸術」と呼べると思う。',
    'AIが発達すると、人間はより自由な時間を得られると思う。',
    '将来、AIと人間の差はほとんどなくなると思う。',
    'AIに個人の健康データを預けることに抵抗がある。',
    'AIが推薦する情報より、自分で探した情報を信じたい。',
    'AIが社会の格差を広げる可能性が高いと思う。',
    'AIは人間の偏見を減らす助けになると思う。',
    'AIの発達は、学校の学び方を大きく変えると思う。',
    '将来、AIが政治の一部を担うことはあり得ると思う。',
    'AIが監視に使われることは、ある程度仕方ないと思う。',
    '便利さのためなら、プライバシーを少し手放してもよいと思う。',
    'AIが人の感情を理解できるようになると思う。',
    'AIが進化すると、人間の「働く意味」は変わると思う。',
    'AIの判断は、人間より公平になり得ると思う。',
    'AIが発達しても、人間にしかできない仕事は残ると思う。',
    'AIに依存しすぎると、人間の能力が下がると思う。',
    'AIが発達する未来に不安を感じる。',
    'AIが発達する未来に期待を感じる。',
  ]

  await prisma.question.createMany({
    data: questions.map((q, i) => ({
      themeId: theme.id,
      questionText: q,
      order: i + 1,
      questionType: 'YES_NO_UNKNOWN',
    })),
  })

  console.log('Seed completed:', { themeId: theme.id })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

