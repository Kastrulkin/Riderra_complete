const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestDriver() {
  try {
    // Проверяем, существует ли уже тестовый водитель
    const existingUser = await prisma.user.findUnique({
      where: { email: 'driver@test.com' }
    })

    if (existingUser) {
      console.log('Тестовый водитель уже существует:')
      console.log('Email: driver@test.com')
      console.log('Пароль: driver123')
      console.log('ID:', existingUser.id)
      
      // Проверяем, есть ли связанная запись Driver
      const driver = await prisma.driver.findFirst({
        where: { userId: existingUser.id }
      })
      
      if (!driver) {
        // Создаем запись Driver
        const newDriver = await prisma.driver.create({
          data: {
            name: 'Тестовый водитель',
            email: 'driver@test.com',
            phone: '+79991234567',
            city: 'Москва',
            userId: existingUser.id,
            commissionRate: 15.0,
            isActive: true,
            verificationStatus: 'verified'
          }
        })
        console.log('Создана запись водителя:', newDriver.id)
      }
      
      await prisma.$disconnect()
      return
    }

    // Создаем пользователя-водителя
    const hashedPassword = await bcrypt.hash('driver123', 10)
    
    const user = await prisma.user.create({
      data: {
        email: 'driver@test.com',
        password: hashedPassword,
        role: 'driver',
        isActive: true
      }
    })

    // Создаем запись водителя
    const driver = await prisma.driver.create({
      data: {
        name: 'Тестовый водитель',
        email: 'driver@test.com',
        phone: '+79991234567',
        city: 'Москва',
        userId: user.id,
        commissionRate: 15.0,
        isActive: true,
        verificationStatus: 'verified'
      }
    })

    console.log('Тестовый водитель создан успешно:')
    console.log('Email: driver@test.com')
    console.log('Пароль: driver123')
    console.log('User ID:', user.id)
    console.log('Driver ID:', driver.id)
  } catch (error) {
    console.error('Ошибка при создании тестового водителя:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestDriver()

