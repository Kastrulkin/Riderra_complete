// Загружаем переменные окружения из .env файла (для локальной разработки)
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config()
  } catch (e) {
    // dotenv не установлен, используем переменные из окружения
  }
}

const express = require('express')
const bodyParser = require('body-parser')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

const prisma = new PrismaClient()
const app = express()

// CORS middleware для разрешения запросов из браузера
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(bodyParser.json())

// JWT секрет
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Настройки email
const EMAIL_TO = process.env.EMAIL_TO || 'demyanov@riderra.com' // Email получателя заявок
const EMAIL_FROM = process.env.EMAIL_FROM || 'farmout@riderra.com' // Email отправителя
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.yandex.ru' // SMTP хост
const SMTP_PORT = process.env.SMTP_PORT || 587 // SMTP порт
const SMTP_USER = process.env.SMTP_USER || '' // SMTP пользователь (email)
const SMTP_PASS = process.env.SMTP_PASS || '' // SMTP пароль

// Создаем транспортер для отправки email
let transporter = null
if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: false, // false для порта 587 (TLS), true для 465 (SSL)
    requireTLS: true, // Требуем TLS для порта 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
}

// Функция отправки email с заявкой водителя
async function sendDriverRegistrationEmail(data) {
  if (!transporter) {
    console.warn('Email transporter not configured. Set SMTP_USER and SMTP_PASS environment variables.')
    console.warn('SMTP_USER:', SMTP_USER ? 'SET' : 'NOT SET')
    console.warn('SMTP_PASS:', SMTP_PASS ? 'SET' : 'NOT SET')
    return false
  }

  try {
    console.log('Attempting to send email...')
    console.log('EMAIL_FROM:', EMAIL_FROM)
    console.log('EMAIL_TO:', EMAIL_TO)
    console.log('SMTP_HOST:', SMTP_HOST)
    console.log('SMTP_PORT:', SMTP_PORT)
    
    const routesText = data.routes && data.routes.length > 0
      ? data.routes.map((r, idx) => 
          `${idx + 1}. ${r.from || '-'} → ${r.to || '-'} | ${r.price || '-'} ${r.currency || ''}`
        ).join('\n')
      : 'Не указаны'

    const subject = `[Riderra] ${data.lang === 'ru' ? 'Регистрация водителя' : 'Driver registration'}`
    const html = `
      <h2>${data.lang === 'ru' ? 'Новая заявка на регистрацию перевозчика' : 'New driver registration request'}</h2>
      <p><strong>${data.lang === 'ru' ? 'Имя/Компания' : 'Name/Company'}:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>${data.lang === 'ru' ? 'Телефон' : 'Phone'}:</strong> ${data.phone}</p>
      <p><strong>${data.lang === 'ru' ? 'Город/регион работы' : 'City/Operating region'}:</strong> ${data.city || '-'}</p>
      <p><strong>${data.lang === 'ru' ? 'Цена за километр' : 'Price per km'}:</strong> ${data.pricePerKm || '-'}</p>
      <p><strong>${data.lang === 'ru' ? 'Комиссия' : 'Commission'}:</strong> ${data.commissionRate || 15}%</p>
      <p><strong>${data.lang === 'ru' ? 'Фиксированные маршруты' : 'Fixed routes'}:</strong></p>
      <pre>${routesText}</pre>
      ${data.comment ? `<p><strong>${data.lang === 'ru' ? 'Комментарий' : 'Comment'}:</strong> ${data.comment}</p>` : ''}
    `
    const text = `
${data.lang === 'ru' ? 'Новая заявка на регистрацию перевозчика' : 'New driver registration request'}

${data.lang === 'ru' ? 'Имя/Компания' : 'Name/Company'}: ${data.name}
Email: ${data.email}
${data.lang === 'ru' ? 'Телефон' : 'Phone'}: ${data.phone}
${data.lang === 'ru' ? 'Город/регион работы' : 'City/Operating region'}: ${data.city || '-'}
${data.lang === 'ru' ? 'Цена за километр' : 'Price per km'}: ${data.pricePerKm || '-'}
${data.lang === 'ru' ? 'Комиссия' : 'Commission'}: ${data.commissionRate || 15}%
${data.lang === 'ru' ? 'Фиксированные маршруты' : 'Fixed routes'}:
${routesText}
${data.comment ? `${data.lang === 'ru' ? 'Комментарий' : 'Comment'}: ${data.comment}` : ''}
    `

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: subject,
      text: text,
      html: html
    })

    console.log('Email sent successfully! Message ID:', info.messageId)
    console.log('Email response:', info.response)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    console.error('Error code:', error.code)
    console.error('Error command:', error.command)
    console.error('Error response:', error.response)
    console.error('Error responseCode:', error.responseCode)
    console.error('Error stack:', error.stack)
    return false
  }
}

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
    const { name, email, phone, city, fixedRoutes, fixedRoutesJson, pricePerKm, comment, lang, commissionRate, routes } = req.body
    
    console.log('Received driver registration:', { name, email, phone, city })
    
    // Сохраняем в базу данных
    const created = await prisma.driver.create({ data: {
      name, 
      email, 
      phone, 
      city,
      fixedRoutesJson: fixedRoutesJson || (fixedRoutes ? JSON.stringify(fixedRoutes) : null),
      pricePerKm: (pricePerKm && pricePerKm.trim() !== '') ? pricePerKm : null,
      comment: (comment && comment.trim() !== '') ? comment : null,
      lang: lang || null,
      commissionRate: commissionRate ? parseFloat(commissionRate) : 15.0
    }})

    console.log('Driver saved to database:', created.id)

    // Отправляем email с заявкой (не блокируем сохранение, если email не настроен)
    let routesData = []
    if (routes && Array.isArray(routes)) {
      routesData = routes
    } else if (fixedRoutesJson) {
      try {
        routesData = JSON.parse(fixedRoutesJson)
      } catch (e) {
        routesData = []
      }
    }

    try {
      const emailSent = await sendDriverRegistrationEmail({
        name,
        email,
        phone,
        city,
        pricePerKm,
        commissionRate: commissionRate ? parseFloat(commissionRate) : 15.0,
        routes: routesData,
        comment,
        lang: lang || 'ru'
      })
      if (emailSent) {
        console.log('Email sent successfully')
      } else {
        console.warn('Email not sent (SMTP not configured)')
      }
    } catch (emailError) {
      console.error('Error sending email (non-blocking):', emailError)
      // Не блокируем ответ, если email не отправился
    }

    res.json({ success: true, driver: created })
  } catch (e) {
    console.error('Error in /api/drivers:', e)
    console.error('Error stack:', e.stack)
    res.status(500).json({ error: 'failed', message: e.message })
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

// API для обновления данных водителя (для самого водителя)
app.put('/api/drivers/me', authenticateToken, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    const { commissionRate } = req.body

    const updated = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        commissionRate: commissionRate ? parseFloat(commissionRate) : undefined
      }
    })

    res.json(updated)
  } catch (error) {
    console.error('Error updating driver:', error)
    res.status(500).json({ error: 'Failed to update driver' })
  }
})

// API для удаления маршрута водителя
app.delete('/api/drivers/routes/:routeId', authenticateToken, async (req, res) => {
  try {
    const { routeId } = req.params

    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Проверяем, что маршрут принадлежит этому водителю
    const route = await prisma.driverRoute.findFirst({
      where: {
        id: routeId,
        driverId: driver.id
      }
    })

    if (!route) {
      return res.status(404).json({ error: 'Route not found' })
    }

    // Удаляем маршрут (или помечаем как неактивный)
    await prisma.driverRoute.update({
      where: { id: routeId },
      data: { isActive: false }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting route:', error)
    res.status(500).json({ error: 'Failed to delete route' })
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

// API для получения заказов текущего водителя
app.get('/api/drivers/me/orders', authenticateToken, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Получаем выполненные заказы водителя
    const orders = await prisma.order.findMany({
      where: { 
        driverId: driver.id,
        status: 'completed' // Только выполненные заказы
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Последние 20 заказов
    })

    res.json(orders)
  } catch (error) {
    console.error('Error fetching driver orders:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// API для получения данных текущего водителя (полная информация)
app.get('/api/drivers/me', authenticateToken, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id },
      include: {
        routes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    res.json(driver)
  } catch (error) {
    console.error('Error fetching driver data:', error)
    res.status(500).json({ error: 'Failed to fetch driver data' })
  }
})

// ==================== API ДЛЯ ПРЕДУСТАНОВЛЕННЫХ МАРШРУТОВ ====================

// Получение всех маршрутов для водителя (с его ценами)
app.get('/api/drivers/me/city-routes', authenticateToken, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Получаем все активные маршруты
    const cityRoutes = await prisma.cityRoute.findMany({
      where: { isActive: true },
      orderBy: [
        { country: 'asc' },
        { city: 'asc' },
        { fromPoint: 'asc' }
      ],
      include: {
        driverPrices: {
          where: { driverId: driver.id },
          take: 1
        }
      }
    })

    // Формируем ответ с ценами водителя
    const routes = cityRoutes.map(route => ({
      id: route.id,
      country: route.country,
      city: route.city,
      fromPoint: route.fromPoint,
      toPoint: route.toPoint,
      vehicleType: route.vehicleType,
      passengers: route.passengers,
      distance: route.distance,
      targetFare: route.targetFare,
      currency: route.currency,
      bestPrice: route.driverPrices[0]?.bestPrice || null
    }))

    res.json(routes)
  } catch (error) {
    console.error('Error fetching city routes:', error)
    res.status(500).json({ error: 'Failed to fetch city routes' })
  }
})

// Обновление цены водителя для маршрута
app.put('/api/drivers/me/city-routes/:routeId', authenticateToken, async (req, res) => {
  try {
    const { routeId } = req.params
    const { bestPrice } = req.body

    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Проверяем, существует ли маршрут
    const cityRoute = await prisma.cityRoute.findUnique({
      where: { id: routeId }
    })

    if (!cityRoute) {
      return res.status(404).json({ error: 'City route not found' })
    }

    // Создаем или обновляем цену водителя
    const driverCityRoute = await prisma.driverCityRoute.upsert({
      where: {
        driverId_cityRouteId: {
          driverId: driver.id,
          cityRouteId: routeId
        }
      },
      update: {
        bestPrice: bestPrice ? parseFloat(bestPrice) : null
      },
      create: {
        driverId: driver.id,
        cityRouteId: routeId,
        bestPrice: bestPrice ? parseFloat(bestPrice) : null
      }
    })

    res.json(driverCityRoute)
  } catch (error) {
    console.error('Error updating driver city route:', error)
    res.status(500).json({ error: 'Failed to update city route' })
  }
})

// ==================== АДМИНСКИЕ API ДЛЯ УПРАВЛЕНИЯ МАРШРУТАМИ ====================

// Получение всех маршрутов (для админа)
app.get('/api/admin/city-routes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { country, city } = req.query
    
    const where = { isActive: true }
    if (country) where.country = country
    if (city) where.city = city

    const routes = await prisma.cityRoute.findMany({
      where,
      orderBy: [
        { country: 'asc' },
        { city: 'asc' },
        { fromPoint: 'asc' }
      ]
    })

    res.json(routes)
  } catch (error) {
    console.error('Error fetching city routes:', error)
    res.status(500).json({ error: 'Failed to fetch city routes' })
  }
})

// Получение списка стран
app.get('/api/admin/city-routes/countries', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const countries = await prisma.cityRoute.findMany({
      where: { isActive: true },
      select: { country: true },
      distinct: ['country'],
      orderBy: { country: 'asc' }
    })

    res.json(countries.map(c => c.country))
  } catch (error) {
    console.error('Error fetching countries:', error)
    res.status(500).json({ error: 'Failed to fetch countries' })
  }
})

// Получение списка городов по стране
app.get('/api/admin/city-routes/cities', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { country } = req.query
    
    if (!country) {
      return res.status(400).json({ error: 'Country parameter is required' })
    }

    const cities = await prisma.cityRoute.findMany({
      where: { 
        isActive: true,
        country: country
      },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' }
    })

    res.json(cities.map(c => c.city))
  } catch (error) {
    console.error('Error fetching cities:', error)
    res.status(500).json({ error: 'Failed to fetch cities' })
  }
})

// Создание нового маршрута
app.post('/api/admin/city-routes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { country, city, fromPoint, toPoint, vehicleType, passengers, distance, targetFare, currency } = req.body

    const route = await prisma.cityRoute.create({
      data: {
        country,
        city,
        fromPoint,
        toPoint,
        vehicleType,
        passengers: parseInt(passengers),
        distance: parseFloat(distance),
        targetFare: parseFloat(targetFare),
        currency: currency || 'EUR'
      }
    })

    res.json(route)
  } catch (error) {
    console.error('Error creating city route:', error)
    res.status(500).json({ error: 'Failed to create city route' })
  }
})

// Обновление маршрута
app.put('/api/admin/city-routes/:routeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { routeId } = req.params
    const { country, city, fromPoint, toPoint, vehicleType, passengers, distance, targetFare, currency, isActive } = req.body

    const updateData = {}
    if (country !== undefined) updateData.country = country
    if (city !== undefined) updateData.city = city
    if (fromPoint !== undefined) updateData.fromPoint = fromPoint
    if (toPoint !== undefined) updateData.toPoint = toPoint
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType
    if (passengers !== undefined) updateData.passengers = parseInt(passengers)
    if (distance !== undefined) updateData.distance = parseFloat(distance)
    if (targetFare !== undefined) updateData.targetFare = parseFloat(targetFare)
    if (currency !== undefined) updateData.currency = currency
    if (isActive !== undefined) updateData.isActive = isActive

    const route = await prisma.cityRoute.update({
      where: { id: routeId },
      data: updateData
    })

    res.json(route)
  } catch (error) {
    console.error('Error updating city route:', error)
    res.status(500).json({ error: 'Failed to update city route' })
  }
})

// Удаление маршрута (мягкое удаление)
app.delete('/api/admin/city-routes/:routeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { routeId } = req.params

    await prisma.cityRoute.update({
      where: { id: routeId },
      data: { isActive: false }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting city route:', error)
    res.status(500).json({ error: 'Failed to delete city route' })
  }
})

// Массовая загрузка маршрутов из CSV
app.post('/api/admin/city-routes/bulk-import', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { routes } = req.body // Массив маршрутов из CSV

    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({ error: 'Invalid routes data' })
    }

    const results = {
      added: 0,
      skipped: 0,
      errors: []
    }

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]
      
      try {
        // Проверяем обязательные поля
        if (!route.country || !route.city || !route.fromPoint || !route.toPoint || 
            !route.vehicleType || !route.passengers || !route.distance || !route.targetFare) {
          results.errors.push({
            row: i + 1,
            error: 'Missing required fields'
          })
          results.skipped++
          continue
        }

        // Проверяем, существует ли уже такой маршрут
        const existing = await prisma.cityRoute.findFirst({
          where: {
            country: route.country,
            city: route.city,
            fromPoint: route.fromPoint,
            toPoint: route.toPoint,
            vehicleType: route.vehicleType,
            isActive: true
          }
        })

        if (existing) {
          results.skipped++
          continue
        }

        // Создаем новый маршрут
        await prisma.cityRoute.create({
          data: {
            country: route.country.trim(),
            city: route.city.trim(),
            fromPoint: route.fromPoint.trim(),
            toPoint: route.toPoint.trim(),
            vehicleType: route.vehicleType.trim(),
            passengers: parseInt(route.passengers) || 1,
            distance: parseFloat(route.distance) || 0,
            targetFare: parseFloat(route.targetFare) || 0,
            currency: (route.currency || 'EUR').trim().toUpperCase()
          }
        })

        results.added++
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error.message || 'Unknown error'
        })
        results.skipped++
      }
    }

    res.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Error bulk importing routes:', error)
    res.status(500).json({ error: 'Failed to import routes' })
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


