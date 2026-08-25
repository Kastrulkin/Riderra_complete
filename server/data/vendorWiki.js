const VENDOR_WIKI_UPDATED_AT = 'August 25, 2026'

const VENDOR_WIKI_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'What a Riderra vendor does and how to begin working together.',
    articles: [
      {
        id: 'vendor-role',
        title: 'Your role as a Riderra vendor',
        intro: 'Riderra works with local transport companies and fleet managers to deliver pre-booked transfers for travel companies, agents, tour operators and other partners.',
        blocks: [
          { title: 'Your responsibilities', items: ['Maintain a reliable local fleet and trained drivers.', 'Review every booking and assign a suitable vehicle and driver.', 'Monitor flights, pickup times and operational changes.', 'Support the passenger during pickup and resolve incidents quickly.', 'Keep Riderra informed and provide trip evidence when requested.'] },
          { title: 'What Riderra provides', items: ['Booking details and agreed net rates.', 'A workspace for trip and driver management.', 'Operational support and a path to receive more orders as service quality grows.'] }
        ]
      },
      {
        id: 'vendor-requirements',
        title: 'Vendor requirements',
        intro: 'A vendor must be able to deliver licensed, insured and dependable passenger transport in its operating market.',
        blocks: [
          { title: 'Before onboarding', items: ['Provide the company name, operating area and a 24/7 operational contact.', 'Confirm vehicle classes, passenger and luggage capacities, and available coverage.', 'Provide the permits, commercial insurance and registrations required in your country, state or city.', 'Confirm the agreed rates, inclusions and payment details through a secure channel.'] },
          { title: 'Payment documentation', body: 'Riderra pays vendors from its company in Estonia. A US W-9 form is not required. The exact invoice and banking details are agreed during onboarding and must not be posted in public messages.' }
        ]
      },
      {
        id: 'onboarding-checklist',
        title: 'Onboarding checklist',
        intro: 'Use this checklist before accepting your first Riderra order.',
        blocks: [
          { items: ['Register as a transport partner and confirm the main operational contact.', 'Add or confirm the fleet, vehicle classes and capacities.', 'Agree net rates and what they include: airport fees, parking, waiting and pickup procedure.', 'Make sure dispatchers and drivers can use the Riderra workspace or driver app.', 'Run through the pickup, evidence and incident procedures below.', 'Confirm invoicing currency, bank account and settlement terms.'] }
        ]
      }
    ]
  },
  {
    id: 'account-and-fleet',
    title: 'Account and fleet setup',
    summary: 'Set up access, vehicles and the information needed for correct assignments.',
    articles: [
      {
        id: 'account-access',
        title: 'Account registration and access',
        intro: 'New partners can submit their company information on Riderra. Existing partners should use their assigned account.',
        blocks: [
          { title: 'Information to prepare', items: ['Company and contact name.', 'Email, phone number and operating region.', 'Vehicle classes and fixed or distance-based net rates.', 'Preferred settlement currency.'] },
          { title: 'Access links', links: [{ label: 'Apply as a transport partner', href: '/drivers' }, { label: 'Open the driver login', href: '/driver-login' }] }
        ]
      },
      {
        id: 'vehicle-classes',
        title: 'Vehicle classes and capacity',
        intro: 'Always follow the class and capacity stated in the booking. Passenger capacity must be reduced when luggage cannot be accommodated safely.',
        blocks: [
          { title: 'Typical examples', rows: [['Standard sedan', 'Up to 3 passengers', 'Toyota Corolla, Camry, Prius or similar'], ['Comfort sedan', 'Up to 3 passengers', 'Toyota Camry or market equivalent'], ['Business sedan', 'Up to 3 passengers', 'Mercedes-Benz E-Class, Lexus ES or similar'], ['First / VIP sedan', 'Up to 3 passengers', 'Mercedes-Benz S-Class or similar'], ['Standard MPV', 'Usually 5 passengers with luggage', 'Honda Odyssey, Kia Carnival or similar'], ['SUV', 'Usually up to 4 passengers with luggage', 'Toyota Highlander or similar'], ['Minivan', '6–8 passengers, subject to luggage', 'Volkswagen Caravelle or similar'], ['Business van', '5–7 passengers, subject to luggage', 'Mercedes-Benz V-Class or similar'], ['Minibus', 'Up to 16 passengers', 'Mercedes-Benz Sprinter or similar']] },
          { title: 'Important', body: 'Examples vary by market. Do not substitute a lower class or a vehicle with insufficient luggage capacity. Ask Riderra before changing the assigned vehicle.' }
        ]
      }
    ]
  },
  {
    id: 'orders',
    title: 'Orders and driver operations',
    summary: 'Review, assign, execute and close every transfer correctly.',
    articles: [
      {
        id: 'order-workflow',
        title: 'From booking to completed trip',
        intro: 'Each booking must have a clear owner, a suitable vehicle and a driver who has received the complete trip information.',
        blocks: [
          { title: '1. Review the booking', items: ['Check date, local pickup time, flight or train number, route, passenger count, luggage and vehicle class.', 'Check pickup instructions, extras and included waiting time.', 'Clarify any mismatch with Riderra before accepting or assigning the trip.'] },
          { title: '2. Assign and reconfirm', items: ['Assign a driver and vehicle that meet the booking requirements.', 'Recheck the trip at least 24 hours before pickup and monitor late operational changes.', 'Make sure the driver has the passenger contact and knows the local pickup procedure.'] },
          { title: '3. Execute and close', items: ['The driver follows the Riderra app or workspace statuses where available.', 'Record arrival, passenger contact, pickup and completion accurately.', 'Report delays, no-shows, route changes or vehicle changes immediately.', 'Keep required evidence until the trip and payment are fully reconciled.'] }
        ]
      },
      {
        id: 'airport-pickup',
        title: 'Airport pickup and flight monitoring',
        intro: 'Monitor the live flight status and follow the pickup method stated in the order.',
        blocks: [
          { title: 'Pickup procedure', items: ['For meet-and-greet orders, use a name sign only when the service is included and permitted at that airport.', 'For curbside or phone-contact pickup, wait in the permitted holding area, contact the passenger and coordinate the terminal and pickup point.', 'Allow enough time to reach the terminal after the passenger confirms they are ready.', 'Help with luggage and confirm the destination before departure.'] },
          { title: 'Waiting and no-show', body: 'Follow the waiting time stated in the booking or current Riderra instructions. Do not leave the pickup point or declare a no-show without contacting the passenger, collecting evidence and receiving dispatcher approval.' }
        ]
      },
      {
        id: 'changes-and-incidents',
        title: 'Changes, delays and service incidents',
        intro: 'Early communication is the most important action when a trip cannot be executed exactly as booked.',
        blocks: [
          { items: ['Notify Riderra immediately if the assigned driver or vehicle must change.', 'Never send a vehicle below the confirmed class or capacity without approval.', 'Report expected delays before pickup and provide a realistic arrival time.', 'If a driver cannot perform the trip, arrange a qualified replacement and inform Riderra.', 'For route or service changes requested by the passenger, obtain approval before agreeing to an extra charge.'] },
          { title: 'Service standards', body: 'Cancellations, no-shows, delays and incorrect service may affect payment and future order allocation. Exact remedies and penalties are governed by the signed vendor agreement and the applicable booking terms.' }
        ]
      }
    ]
  },
  {
    id: 'evidence-and-messages',
    title: 'Evidence and passenger communication',
    summary: 'Document the trip and keep passenger communication clear and professional.',
    articles: [
      {
        id: 'trip-evidence',
        title: 'Trip evidence and screenshots',
        intro: 'Evidence protects both the vendor and Riderra when a passenger is delayed, unreachable or disputes the service.',
        blocks: [
          { title: 'Keep when relevant', items: ['A timestamped location or GPS screenshot showing arrival at the pickup point.', 'Call or message attempts to the passenger.', 'The airport arrival board or live flight status for delayed flights.', 'Parking receipts or other local evidence when charges or waiting are disputed.', 'A final location screenshot before leaving after an approved no-show.'] },
          { title: 'Privacy', body: 'Share evidence only through approved Riderra channels. Do not publish passenger names, phone numbers, travel details or documents.' }
        ]
      },
      {
        id: 'message-examples',
        title: 'Passenger message examples',
        intro: 'Keep messages short, specific and easy to act on. Replace the brackets with the real trip details.',
        blocks: [
          { title: 'Driver introduction', quote: 'Hello [Passenger name], I am [Driver name], your driver for today’s Riderra transfer. I will be driving a [vehicle model and colour], plate [number]. You can reach me at this number.' },
          { title: 'Curbside airport pickup', quote: 'Welcome to [City]. I am waiting near the terminal. Once you have collected your luggage, please send me your terminal and pickup pillar or zone. It normally takes about 10–15 minutes for me to reach the pickup point.' },
          { title: 'Passenger not found', quote: 'Hello [Passenger name], I am at the agreed pickup point for your transfer. Please reply with your current location or call me so I can find you.' }
        ]
      }
    ]
  },
  {
    id: 'payments',
    title: 'Payments',
    summary: 'How vendor rates, invoices and international settlements are handled.',
    articles: [
      {
        id: 'rates-and-inclusions',
        title: 'Rates and inclusions',
        intro: 'The vendor net rate must be agreed before a booking is confirmed.',
        blocks: [
          { items: ['Confirm whether airport fees, parking, standard waiting and the stated pickup procedure are included.', 'Do not replace an agreed rate with a public retail rate after accepting the booking.', 'Request approval before adding waiting, tolls, route changes or other extras.', 'Use the currency and tax treatment confirmed during onboarding.'] }
        ]
      },
      {
        id: 'international-payments',
        title: 'Invoices and international payments',
        intro: 'Riderra settles completed trips with vendors under the agreed commercial terms.',
        blocks: [
          { items: ['Riderra payments are made by the company in Estonia to the vendor’s bank account.', 'A US W-9 form is not required.', 'Invoices must identify the agreed company, currency, trips and billing period.', 'Bank fees, exchange rates and settlement timing should be confirmed before the first payment.', 'Send banking details only through a secure channel requested by Riderra.'] }
        ]
      }
    ]
  }
]

module.exports = { VENDOR_WIKI_SECTIONS, VENDOR_WIKI_UPDATED_AT }
