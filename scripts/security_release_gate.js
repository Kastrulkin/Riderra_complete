#!/usr/bin/env node
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const steps = [
  { name: 'bootstrap', cmd: ['node', 'scripts/security_baseline_bootstrap.js'] },
  { name: 'smoke', cmd: ['node', 'scripts/security_smoke_baseline.js'] },
  { name: 'policy', cmd: ['node', 'scripts/security_policy_smoke.js'] },
  { name: 'tenantMismatch', cmd: ['node', 'scripts/security_tenant_mismatch_smoke.js'] },
  { name: 'apiTenantMismatch', cmd: ['node', 'scripts/security_api_tenant_mismatch_smoke.js'] },
  { name: 'apiIdempotency', cmd: ['node', 'scripts/security_api_idempotency_smoke.js'] },
  { name: 'apiHumanInLoop', cmd: ['node', 'scripts/security_api_human_in_loop_smoke.js'] },
  { name: 'apiAuditTrace', cmd: ['node', 'scripts/security_api_audit_trace_smoke.js'] },
  { name: 'gate', cmd: ['node', 'scripts/security_gate_checks.js'] }
]

function runStep(step) {
  const [bin, ...args] = step.cmd
  const res = spawnSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
  const output = `${res.stdout || ''}${res.stderr || ''}`.trim()
  if (res.status !== 0) {
    throw new Error(`[${step.name}] failed with code ${res.status}\n${output}`)
  }
  const lines = output.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
  const lastJsonLine = [...lines].reverse().find((line) => line.startsWith('{') && line.endsWith('}'))
  let parsed = null
  if (lastJsonLine) {
    try { parsed = JSON.parse(lastJsonLine) } catch (_) {}
  }
  return { output, parsed }
}

function writeReport(report) {
  const outDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'security-release-gate.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  return outPath
}

function main() {
  const startedAt = new Date().toISOString()
  const report = {
    startedAt,
    steps: {},
    criteria: {
      tenantIsolation: false,
      policy: false,
      idempotency: false,
      humanInLoop: false,
      audit: false
    }
  }

  for (const step of steps) {
    try {
      const result = runStep(step)
      report.steps[step.name] = {
        ok: true,
        parsed: result.parsed || null
      }
    } catch (error) {
      report.steps[step.name] = {
        ok: false,
        error: error.message
      }
      report.ok = false
      report.finishedAt = new Date().toISOString()
      const reportPath = writeReport(report)
      console.error(JSON.stringify({ ok: false, failedStep: step.name, reportPath, error: error.message }))
      process.exitCode = 1
      return
    }
  }

  const smoke = report.steps.smoke?.parsed || {}
  const gate = report.steps.gate?.parsed?.report || {}
  const policy = report.steps.policy?.parsed || {}
  const tenantMismatch = report.steps.tenantMismatch?.parsed || {}
  const apiTenantMismatch = report.steps.apiTenantMismatch?.parsed || {}
  const apiIdempotency = report.steps.apiIdempotency?.parsed || {}
  const apiHumanInLoop = report.steps.apiHumanInLoop?.parsed || {}
  const apiAuditTrace = report.steps.apiAuditTrace?.parsed || {}

  const nullTenantOk = [
    smoke.ordersNullTenant,
    smoke.requestsNullTenant,
    smoke.reviewsNullTenant,
    smoke.driversNullTenant,
    smoke.driverRoutesNullTenant,
    smoke.cityRoutesNullTenant,
    smoke.driverCityRoutesNullTenant,
    smoke.pricingNullTenant,
    smoke.companiesNullTenant,
    smoke.contactsNullTenant,
    smoke.opsDraftsNullTenant
  ].every((v) => Number(v || 0) === 0)

  report.criteria.tenantIsolation = Boolean(gate.tenantIsolation) && nullTenantOk && Boolean(tenantMismatch.ok) && Boolean(apiTenantMismatch.ok)
  report.criteria.policy = Boolean(gate.roles) && Boolean(policy.ok)
  report.criteria.idempotency = Boolean(gate.idempotency) && Boolean(apiIdempotency.ok)
  report.criteria.humanInLoop = Boolean(gate.humanInLoop) && Boolean(apiHumanInLoop.ok)
  report.criteria.audit = Boolean(gate.audit) && Boolean(apiAuditTrace.ok)

  const allOk = Object.values(report.criteria).every(Boolean)
  report.ok = allOk
  report.finishedAt = new Date().toISOString()

  const outPath = writeReport(report)

  console.log(JSON.stringify({ ok: allOk, criteria: report.criteria, reportPath: outPath }))
  if (!allOk) {
    process.exitCode = 1
  }
}

main()
