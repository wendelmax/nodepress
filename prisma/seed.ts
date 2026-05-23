import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding ...')

  const passwordHash = await bcrypt.hash('admin', 10)

  const admin = await prisma.user.upsert({
    where: { userEmail: 'admin@nodepress.local' },
    update: {},
    create: {
      userLogin: 'admin',
      userPass: passwordHash,
      userNicename: 'admin',
      userEmail: 'admin@nodepress.local',
      userUrl: 'http://localhost:3000',
      userActivationKey: '',
      displayName: 'Administrator',
    },
  })

  console.log(`Created admin user with id: ${admin.id}`)

  const helloPost = await prisma.post.create({
    data: {
      postAuthor: admin.id,
      postContent: 'Welcome to NodePress. This is your first post. Edit or delete it, then start writing!',
      postTitle: 'Hello world!',
      postExcerpt: '',
      postPassword: '',
      postName: 'hello-world',
      toPing: '',
      pinged: '',
      postContentFiltered: '',
      guid: 'http://localhost:3000/?p=1',
      postMimeType: '',
    },
  })

  console.log(`Created post with id: ${helloPost.id}`)
  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
