import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  const [email, name, password] = process.argv.slice(2)

  if (!email || !password) {
    console.error('Usage: bun run admin:create -- <email> [name] <password>')
    process.exit(1)
  }

  const passwordHash = hashPassword(password)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      isStaff: true,
      isSuperuser: true,
      name: name ?? undefined,
      passwordHash,
    },
    create: {
      email,
      name: name ?? undefined,
      role: 'ADMIN',
      isStaff: true,
      isSuperuser: true,
      passwordHash,
    },
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
