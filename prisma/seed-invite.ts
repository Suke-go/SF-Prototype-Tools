import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

const INVITE_COUNT = parseInt(process.argv[2] || '3', 10)
const DAYS_VALID = parseInt(process.argv[3] || '90', 10)

async function main() {
    const codes: string[] = []

    for (let i = 0; i < INVITE_COUNT; i++) {
        const code = `INV-${randomUUID().slice(0, 8).toUpperCase()}`
        await prisma.inviteCode.create({
            data: {
                code,
                expiresAt: new Date(Date.now() + DAYS_VALID * 24 * 60 * 60 * 1000),
            },
        })
        codes.push(code)
    }

    console.log(`\n✅ ${INVITE_COUNT} 招待コードを作成しました（有効期間: ${DAYS_VALID}日）:\n`)
    for (const code of codes) {
        console.log(`  ${code}`)
    }
    console.log('')
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
