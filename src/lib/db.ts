import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/custom.db'
  if (!fs.existsSync(tmpDbPath)) {
    const srcDbPath = path.join(process.cwd(), 'db', 'custom.db')
    if (fs.existsSync(srcDbPath)) {
      try {
        fs.copyFileSync(srcDbPath, tmpDbPath)
      } catch (e) {
        console.error('Error copying custom.db to /tmp:', e)
      }
    }
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
    process.env.DATABASE_URL = 'file:' + tmpDbPath
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db