import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [email, name] = process.argv.slice(2)

  if (!email) {
    console.error('Usage: bun run admin:create -- <email> [name]')
    process.exit(1)
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', name: name ?? undefined },
    create: { email, name: name ?? undefined, role: 'ADMIN' },
  })

  console.log(`Admin user ready: ${user.email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })