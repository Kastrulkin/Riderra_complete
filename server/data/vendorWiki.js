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
    id: 'easytaxi',
    title: 'EasyTaxi / ETO',
    summary: 'How fleet operators and drivers receive, assign and complete Riderra jobs in EasyTaxi Office.',
    articles: [
      {
        id: 'easytaxi-overview',
        title: 'EasyTaxi Office for Riderra vendors',
        intro: 'EasyTaxi Office (ETO) is Riderra’s current dispatch system for partner fleets. It is used to deliver jobs to the vendor, assign a driver and track the trip through completion.',
        blocks: [
          { title: 'How the fleet account works', items: ['Riderra assigns a booking to the vendor’s Fleet Operator account.', 'The vendor reviews the complete booking and selects a suitable driver and vehicle.', 'The selected driver receives the job in the ETO Driver App and accepts or rejects it.', 'The fleet operator monitors the driver and trip statuses until the booking is completed.'] },
          { title: 'Before the first job', items: ['Riderra creates or confirms the Fleet Operator access with the vendor.', 'The vendor provides the drivers who will perform Riderra jobs.', 'Each driver must have an approved account, working login, notifications and location access.', 'The vendor performs a test assignment and confirms that the driver can see and accept it.'] },
          { title: 'Official EasyTaxi Office guides', links: [{ label: 'Fleet Operator account', href: 'https://kb.easytaxioffice.com/help/partner-fleet-operator-account' }, { label: 'Assigning a job', href: 'https://kb.easytaxioffice.com/help/assigning-a-job' }] }
        ]
      },
      {
        id: 'easytaxi-assign-driver',
        title: 'Assigning a Riderra job to a driver',
        intro: 'Do not assign a job until the route, pickup time, vehicle class, passenger count, luggage and special instructions have been checked.',
        blocks: [
          { title: 'Assignment steps', items: ['Open the booking in the Dispatch Panel or booking list.', 'Select Assign driver + in the driver column.', 'Choose an eligible driver and confirm the assignment.', 'Verify that the driver received the notification and accepted the job.', 'If the driver rejects the job or does not respond, reassign it promptly and keep Riderra informed.'] },
          { title: 'Changing the assigned driver', body: 'Open the booking and choose the replacement in Payment and Driver, or select the current driver in the booking list. Make sure the replacement driver has the complete booking details and suitable vehicle before confirming the change.' }
        ]
      },
      {
        id: 'easytaxi-driver-app',
        title: 'ETO Driver App: first login and trip statuses',
        intro: 'Drivers use the ETO Driver App to receive Riderra jobs, share their operational location and report each stage of the trip.',
        blocks: [
          { title: 'First login', items: ['Install ETO Driver from the App Store or Google Play.', 'Use the company address or host information supplied by Riderra or the fleet operator.', 'Sign in with the driver email and password created for the account.', 'Allow notifications and set location access to Always so dispatch can see the driver during active work.', 'Set the correct language, time zone and availability status.'] },
          { title: 'Accepting a job', items: ['Open the new-job notification and review all booking details.', 'Tap Accept to take the job, or Reject and enter a clear reason if it cannot be performed.', 'Do not accept a job if the vehicle, capacity, timing or pickup requirements cannot be met; contact the fleet operator instead.'] },
          { title: 'Trip status sequence', rows: [['En Route', 'Driver has started travelling to the pickup point.', 'Set only after departure towards pickup.'], ['Arrived', 'Driver has reached the correct pickup point.', 'Set on arrival, not while approaching.'], ['On board', 'Passenger is in the vehicle and the trip has started.', 'Set after confirming the passenger and destination.'], ['Completed', 'Passenger has been delivered to the destination.', 'Set only after the service is fully completed.']] },
          { title: 'Official EasyTaxi Office guide', links: [{ label: 'How to use Driver App', href: 'https://kb.easytaxioffice.com/help/how-to-use-driver-app' }, { label: 'Create a driver account', href: 'https://kb.easytaxioffice.com/help/add-a-new-driver' }] }
        ]
      },
      {
        id: 'easytaxi-troubleshooting',
        title: 'Notifications, location and status problems',
        intro: 'A driver must report app problems before they affect the passenger pickup.',
        blocks: [
          { items: ['Check mobile data, notifications and background location permissions.', 'Confirm that the driver is signed into the correct company and account.', 'Restart the app and recheck the assigned and awaiting-approval jobs.', 'If a status cannot be updated, contact the fleet operator immediately and provide the real event time.', 'Do not create false or delayed statuses to make the timeline look complete. Riderra may request supporting screenshots or location evidence.'] }
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
          { title: '3. Execute and close', items: ['The driver follows the EasyTaxi / ETO Driver App statuses for the trip.', 'Record arrival, passenger contact, pickup and completion accurately.', 'Report delays, no-shows, route changes or vehicle changes immediately.', 'Keep required evidence until the trip and payment are fully reconciled.'] }
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

module.exports = { VENDOR_WIKI_SECTIONS }
