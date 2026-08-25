#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { PrismaClient } = require('@prisma/client')

const projectRoot = path.resolve(__dirname, '..')
const migrationsRoot = path.join(projectRoot, 'prisma', 'migrations')
const prismaBinary = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma')

function fail(message) {
  throw new Error(message)
}

function runPrisma(args) {
  const result = spawnSync(prismaBinary, args, {
    cwd: projectRoot,
    env: process.env,
    encoding: 'utf8',
    stdio: 'inherit'
  })
  if (result.error) throw result.error
  if (result.status !== 0) fail(`Prisma command failed: prisma ${args.join(' ')}`)
}

function migrationNames() {
  return fs.readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(migrationsRoot, entry.name, 'migration.sql')))
    .map((entry) => entry.name)
    .sort()
}

function assertPostgresUrl() {
  const raw = String(process.env.DATABASE_URL || '').trim()
  if (!raw) fail('DATABASE_URL is required')
  let protocol = ''
  try {
    protocol = new URL(raw).protocol
  } catch (_) {
    fail('DATABASE_URL must be a valid PostgreSQL URL')
  }
  if (!['postgres:', 'postgresql:'].includes(protocol)) {
    fail('prisma:bootstrap supports PostgreSQL only')
  }
}

async function databaseState(prisma) {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = current_schema()
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `)
  let applied = []
  try {
    applied = await prisma.$queryRawUnsafe(`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY migration_name
    `)
  } catch (error) {
    if (error?.code !== 'P2010') throw error
  }
  return {
    userTables: tables.map((row) => row.tablename),
    appliedMigrations: applied.map((row) => row.migration_name)
  }
}

async function main() {
  assertPostgresUrl()
  if (!fs.existsSync(prismaBinary)) fail('Prisma CLI is not installed. Run npm install first.')
  const migrations = migrationNames()
  if (!migrations.length) fail('No Prisma migration directories found')

  const prisma = new PrismaClient()
  try {
    const before = await databaseState(prisma)
    const appliedSet = new Set(before.appliedMigrations)
    const fullyBaselined = migrations.every((name) => appliedSet.has(name))
    if (before.userTables.length) {
      if (fullyBaselined) {
        console.log(JSON.stringify({ ok: true, status: 'already_bootstrapped', migrations: migrations.length }))
        return
      }
      fail(`Refusing to bootstrap a non-empty database (${before.userTables.length} user tables). Use prisma migrate deploy for an existing Riderra database.`)
    }

    console.log(`Creating the current Riderra schema in an empty PostgreSQL database...`)
    runPrisma(['db', 'push', '--skip-generate'])
    for (const name of migrations) {
      runPrisma(['migrate', 'resolve', '--applied', name])
    }
    runPrisma(['migrate', 'deploy'])
    console.log(JSON.stringify({ ok: true, status: 'bootstrapped', migrations: migrations.length }))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(`PostgreSQL bootstrap failed: ${error.message}`)
  process.exitCode = 1
})
