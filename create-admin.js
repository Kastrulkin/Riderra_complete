const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Проверяем, существует ли уже админ
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email)
      return
    }

    // Создаем админа
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@riderra.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      }
    })

    console.log('Admin created successfully:')
    console.log('Email: admin@riderra.com')
    console.log('Password: admin123')
    console.log('ID:', admin.id)
  } catch (error) {
    console.error('Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
