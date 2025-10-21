const express = require('express')
const bodyParser = require('body-parser')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const prisma = new PrismaClient()
const app = express()
app.use(bodyParser.json())

// JWT секрет
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    req.user = user
    next()
  })
}

// Middleware для проверки роли админа
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Middleware для проверки роли водителя
function requireDriver(req, res, next) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required' })
  }
  next()
}

// Старый middleware для совместимости
function auth(req, res, next){
  const token = req.headers['x-admin-token'] || req.query.token
  if(process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN){ return next() }
  return res.status(401).json({ error: 'unauthorized' })
}

app.post('/api/requests', async (req, res) => {
  try {
    const { name, email, phone, fromPoint, toPoint, date, passengers, luggage, comment, lang } = req.body
    const created = await prisma.request.create({ data: {
      name, email, phone, fromPoint, toPoint,
      date: date ? new Date(date) : null,
      passengers: passengers ?? null,
      luggage: luggage ?? null,
      comment: comment ?? null,
      lang: lang ?? null
    }})
    res.json(created)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.post('/api/drivers', async (req, res) => {
  try {
    const { name, email, phone, city, fixedRoutes, pricePerKm, comment, lang, commissionRate } = req.body
    const created = await prisma.driver.create({ data: {
      name, email, phone, city,
      fixedRoutes: fixedRoutes ?? null,
      pricePerKm: pricePerKm ?? null,
      comment: comment ?? null,
      lang: lang ?? null,
      commissionRate: commissionRate ? parseFloat(commissionRate) : 15.0
    }})
    res.json(created)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

module.exports = app

// Admin endpoints
app.get('/api/admin/requests', auth, async (req, res) => {
  try {
    const rows = await prisma.request.findMany({ orderBy: { createdAt: 'desc' }})
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'failed' }) }
})

app.get('/api/admin/drivers', auth, async (req, res) => {
  try {
    const rows = await prisma.driver.findMany({ orderBy: { createdAt: 'desc' }})
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'failed' }) }
})

// API для расчета приоритета водителей
app.post('/api/drivers/priority', async (req, res) => {
  try {
    const { fromPoint, toPoint, vehicleType } = req.body
    
    // Получаем всех активных и верифицированных водителей
    const drivers = await prisma.driver.findMany({
      where: {
        isActive: true,
        verificationStatus: 'verified'
      },
      include: {
        routes: {
          where: {
            isActive: true
          }
        }
      }
    })
    
    // Рассчитываем приоритет для каждого водителя
    const prioritizedDrivers = drivers.map(driver => {
      const score = calculateDriverScore(driver, fromPoint, toPoint)
      return {
        ...driver,
        priorityScore: score
      }
    }).sort((a, b) => b.priorityScore - a.priorityScore)
    
    res.json(prioritizedDrivers)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// Функция расчета приоритета водителя
function calculateDriverScore(driver, fromPoint, toPoint) {
  // Базовые параметры
  const commissionScore = (driver.commissionRate / 30) * 100 // 0-30% -> 0-100 баллов
  const ratingScore = (driver.rating / 5) * 100 // 1-5 -> 0-100 баллов
  
  // Проверяем, есть ли подходящий маршрут
  const matchingRoute = driver.routes.find(route => 
    route.fromPoint.toLowerCase().includes(fromPoint.toLowerCase()) &&
    route.toPoint.toLowerCase().includes(toPoint.toLowerCase())
  )
  
  let priceScore = 50 // Базовый балл, если маршрут не найден
  if (matchingRoute) {
    // Если цена водителя меньше или равна нашей целевой цене - высокий балл
    priceScore = matchingRoute.driverPrice <= matchingRoute.ourPrice ? 100 : 50
  }
  
  // Итоговый балл: 50% комиссия, 30% цена, 20% рейтинг
  const finalScore = (0.5 * commissionScore) + (0.3 * priceScore) + (0.2 * ratingScore)
  
  return Math.round(finalScore * 100) / 100 // Округляем до 2 знаков
}

// API для управления маршрутами водителей
app.post('/api/drivers/:driverId/routes', async (req, res) => {
  try {
    const { driverId } = req.params
    const { fromPoint, toPoint, driverPrice, ourPrice, currency = 'EUR' } = req.body
    
    const route = await prisma.driverRoute.create({
      data: {
        driverId,
        fromPoint,
        toPoint,
        driverPrice: parseFloat(driverPrice),
        ourPrice: parseFloat(ourPrice),
        currency
      }
    })
    
    res.json(route)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/drivers/:driverId/routes', async (req, res) => {
  try {
    const { driverId } = req.params
    
    const routes = await prisma.driverRoute.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(routes)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// API для обновления статуса водителя (для админов)
app.put('/api/admin/drivers/:driverId/status', auth, async (req, res) => {
  try {
    const { driverId } = req.params
    const { isActive, verificationStatus } = req.body
    
    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: {
        isActive: isActive !== undefined ? isActive : undefined,
        verificationStatus: verificationStatus || undefined
      }
    })
    
    res.json(updated)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// Webhook для получения заказов от EasyTaxi
app.post('/api/webhooks/easytaxi/order', async (req, res) => {
  try {
    const { 
      orderId, 
      fromPoint, 
      toPoint, 
      clientPrice, 
      vehicleType, 
      passengers, 
      luggage, 
      comment,
      lang 
    } = req.body
    
    console.log('Received order from EasyTaxi:', { orderId, fromPoint, toPoint, clientPrice })
    
    // Создаем заказ в нашей базе
    const order = await prisma.order.create({
      data: {
        id: orderId,
        fromPoint,
        toPoint,
        clientPrice: parseFloat(clientPrice),
        vehicleType,
        passengers: passengers ? parseInt(passengers) : null,
        luggage: luggage ? parseInt(luggage) : null,
        comment: comment || null,
        lang: lang || null,
        status: 'pending'
      }
    })
    
    // Находим подходящих водителей
    const drivers = await prisma.driver.findMany({
      where: {
        isActive: true,
        verificationStatus: 'verified'
      },
      include: {
        routes: {
          where: {
            isActive: true
          }
        }
      }
    })
    
    // Рассчитываем приоритет
    const prioritizedDrivers = drivers.map(driver => {
      const score = calculateDriverScore(driver, fromPoint, toPoint)
      return {
        ...driver,
        priorityScore: score
      }
    }).sort((a, b) => b.priorityScore - a.priorityScore)
    
    if (prioritizedDrivers.length > 0) {
      const topDriver = prioritizedDrivers[0]
      
      // Обновляем заказ с назначенным водителем
      await prisma.order.update({
        where: { id: orderId },
        data: {
          driverId: topDriver.id,
          driverPrice: topDriver.routes[0]?.driverPrice || clientPrice * 0.8,
          commission: (topDriver.commissionRate / 100) * clientPrice,
          status: 'assigned'
        }
      })
      
      console.log(`Order ${orderId} assigned to driver ${topDriver.name} (${topDriver.email})`)
      
      // Здесь можно добавить отправку уведомления водителю
      // await sendDriverNotification(topDriver, order)
    } else {
      console.log(`No suitable drivers found for order ${orderId}`)
    }
    
    res.json({ success: true, orderId })
  } catch (e) {
    console.error('Error processing EasyTaxi webhook:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// API для получения статистики заказов
app.get('/api/admin/orders', auth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })
    
    res.json(orders)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// API для управления отзывами
app.post('/api/reviews', async (req, res) => {
  try {
    const { orderId, driverId, rating, comment, clientName } = req.body
    
    // Проверяем, что заказ существует и принадлежит водителю
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId, 
        driverId: driverId,
        status: 'completed' // Только для завершенных заказов
      }
    })
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found or not completed' })
    }
    
    // Проверяем, что отзыв еще не оставлен
    const existingReview = await prisma.review.findUnique({
      where: { orderId }
    })
    
    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this order' })
    }
    
    // Создаем отзыв
    const review = await prisma.review.create({
      data: {
        orderId,
        driverId,
        rating: parseInt(rating),
        comment: comment || null,
        clientName: clientName || null
      }
    })
    
    // Пересчитываем рейтинг водителя
    await updateDriverRating(driverId)
    
    res.json(review)
  } catch (e) {
    console.error('Error creating review:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/drivers/:driverId/reviews', async (req, res) => {
  try {
    const { driverId } = req.params
    
    const reviews = await prisma.review.findMany({
      where: { driverId },
      include: {
        order: {
          select: {
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(reviews)
  } catch (e) {
    console.error('Error fetching reviews:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// Функция обновления рейтинга водителя
async function updateDriverRating(driverId) {
  try {
    const reviews = await prisma.review.findMany({
      where: { driverId }
    })
    
    if (reviews.length === 0) return
    
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    
    await prisma.driver.update({
      where: { id: driverId },
      data: { 
        avgRating: Math.round(avgRating * 10) / 10, // Округляем до 1 знака
        totalReviews: reviews.length,
        rating: Math.round(avgRating * 10) / 10 // Обновляем основной рейтинг
      }
    })
    
    console.log(`Updated rating for driver ${driverId}: ${avgRating.toFixed(1)} (${reviews.length} reviews)`)
  } catch (e) {
    console.error('Error updating driver rating:', e)
  }
}

// Админские API для управления отзывами
app.post('/api/admin/reviews', auth, async (req, res) => {
  try {
    const { driverId, rating, comment, clientName } = req.body
    
    // Создаем отзыв от имени админа
    const review = await prisma.review.create({
      data: {
        orderId: `admin-${Date.now()}`, // Фейковый orderId для админских отзывов
        driverId,
        rating: parseInt(rating),
        comment: comment || null,
        clientName: clientName || 'Администратор'
      }
    })
    
    // Пересчитываем рейтинг водителя
    await updateDriverRating(driverId)
    
    res.json(review)
  } catch (e) {
    console.error('Error creating admin review:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/admin/reviews', auth, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        driver: {
          select: {
            name: true,
            email: true
          }
        },
        order: {
          select: {
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(reviews)
  } catch (e) {
    console.error('Error fetching admin reviews:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.delete('/api/admin/reviews/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params
    
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    })
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }
    
    await prisma.review.delete({
      where: { id: reviewId }
    })
    
    // Пересчитываем рейтинг водителя после удаления отзыва
    await updateDriverRating(review.driverId)
    
    res.json({ success: true })
  } catch (e) {
    console.error('Error deleting review:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// API для получения детальной информации о водителе
app.get('/api/admin/drivers/:driverId', auth, async (req, res) => {
  try {
    const { driverId } = req.params
    
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        routes: {
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Последние 10 заказов
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Последние 10 отзывов
        }
      }
    })
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }
    
    res.json(driver)
  } catch (e) {
    console.error('Error fetching driver details:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// ==================== АВТОРИЗАЦИЯ ====================

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'driver', name, phone, city, commissionRate } = req.body

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role
      }
    })

    // Если это водитель, создаем запись водителя
    if (role === 'driver') {
      await prisma.driver.create({
        data: {
          name,
          email,
          phone,
          city,
          commissionRate: commissionRate || 15.0,
          userId: user.id
        }
      })
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Вход в систему
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        driver: true
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Проверяем пароль
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Проверяем, активен ли пользователь
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        driver: user.driver
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Получение информации о текущем пользователе
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        driver: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        driver: user.driver
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

// Создание админа (только для разработки)
app.post('/api/auth/create-admin', async (req, res) => {
  try {
    const { email, password } = req.body

    // Проверяем, существует ли админ
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' })
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Создаем админа
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'admin'
      }
    })

    res.json({
      message: 'Admin created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      }
    })
  } catch (error) {
    console.error('Create admin error:', error)
    res.status(500).json({ error: 'Failed to create admin' })
  }
})


