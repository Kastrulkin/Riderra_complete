const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const INPUT_JSON =
  process.env.INPUT_JSON ||
  path.join(__dirname, 'london_riderra005_rows.json');
const DRY_RUN = process.env.DRY_RUN === '1';
const PRICE_UPDATED_AT = '2026-07-13';
const SOURCE_MARKER = 'manual:riderra-base005-london-royal-taxis-mtt-2026-07';

function keyOf(row) {
  return `${row.routeFrom}||${row.routeTo}||${row.vehicleType}`;
}

function makeNotes(row) {
  return [
    `pax:${row.pax}`,
    `source=${SOURCE_MARKER}`,
    `priceUpdatedAt=${PRICE_UPDATED_AT}`,
    `sourceCurrency=GBP`,
    `sourceClientPriceGbp=${row.gbpPrice}`,
    `fx=ECB EUR1=GBP0.85155; GBP1=EUR1.1743291644647995`,
    'pricingRule=ceil(max(netGBP*1.12,netGBP+5))*GBP_EUR',
    'parking=charged separately; LHR arr/dep GBP7.50; LGW arr GBP7.50 dep GBP10; LCY arr/dep GBP10',
    'basePriceList=005',
  ].join('; ');
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8'));
  const rows = payload.rows || payload;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No rows found in ${INPUT_JSON}`);
  }
  const uniqueKeys = new Set(rows.map(keyOf));
  if (uniqueKeys.size !== rows.length) {
    throw new Error(`Duplicate route keys in input: ${rows.length - uniqueKeys.size}`);
  }

  const summary = {
    dryRun: DRY_RUN,
    inputRows: rows.length,
    currentUpdated: 0,
    currentCreated: 0,
    oldArchived: 0,
  };

  for (const row of rows) {
    const activeRows = await prisma.cityPricing.findMany({
      where: {
        isActive: true,
        routeFrom: row.routeFrom,
        routeTo: row.routeTo,
        vehicleType: row.vehicleType,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const current = activeRows.find((item) =>
      String(item.notes || '').includes(SOURCE_MARKER)
    );

    if (!DRY_RUN) {
      for (const oldRow of activeRows) {
        if (current && oldRow.id === current.id) continue;
        await prisma.cityPricing.update({
          where: { id: oldRow.id },
          data: {
            isActive: false,
            notes: `${oldRow.notes || ''}; archivedBy=${SOURCE_MARKER}; archivedAt=${PRICE_UPDATED_AT}`.trim(),
          },
        });
        summary.oldArchived += 1;
      }
    } else {
      summary.oldArchived += activeRows.filter((oldRow) => !current || oldRow.id !== current.id).length;
    }

    const data = {
      country: row.country || 'United Kingdom',
      city: row.city,
      routeFrom: row.routeFrom,
      routeTo: row.routeTo,
      vehicleType: row.vehicleType,
      fixedPrice: row.eurPrice,
      pricePerKm: null,
      hourlyRate: null,
      currency: 'EUR',
      isActive: true,
      source: 'manual',
      notes: makeNotes(row),
    };

    if (current) {
      summary.currentUpdated += 1;
      if (!DRY_RUN) {
        await prisma.cityPricing.update({
          where: { id: current.id },
          data,
        });
      }
    } else {
      summary.currentCreated += 1;
      if (!DRY_RUN) {
        await prisma.cityPricing.create({ data });
      }
    }
  }

  const activeCurrentCount = await prisma.cityPricing.count({
    where: {
      isActive: true,
      notes: { contains: SOURCE_MARKER },
    },
  });

  const examples = await prisma.cityPricing.findMany({
    where: {
      isActive: true,
      notes: { contains: SOURCE_MARKER },
      OR: [
        {
          routeFrom: 'London Heathrow Airport (LHR)',
          routeTo: 'London City Center',
        },
        {
          routeFrom: 'London Gatwick Airport (LGW)',
          routeTo: 'London North-West',
        },
        {
          routeFrom: 'London City Airport (LCY)',
          routeTo: 'London East',
        },
      ],
    },
    orderBy: [{ routeFrom: 'asc' }, { routeTo: 'asc' }, { vehicleType: 'asc' }],
  });

  console.log(JSON.stringify({ summary, activeCurrentCount, examples }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
