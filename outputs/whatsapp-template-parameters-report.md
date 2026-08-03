# WhatsApp template send failure

Status: **FIX_PROVEN**

## Reported behavior

Clicking **Отправить в WhatsApp** appeared to do nothing. Production evidence showed that the request reached Meta, but Meta rejected it with HTTP 400 and error `132018`. The customer did not receive the message.

## Root cause

The selected approved template declared only `city` and `pickup_date`. The send endpoint validated that those fields existed but forwarded every client-supplied variable, including a multiline bilingual `question`. The WhatsApp gateway converted every value into a positional template parameter, and Meta rejected the multiline parameter.

## Reproduction

The WhatsApp policy smoke sends a valid registered template with its two required fields plus extra booking metadata and a multiline question. Before the fix, the OpenClaw envelope contained all fields and the focused assertion failed.

## Fix

After template validation, the server rebuilds `delivery.variables` from the template registry and records the same ordered list in `policyTrace.templateVariables`. Unregistered fields no longer reach the provider.

## Verification

- Focused red-to-green smoke: passed, 34 checks.
- ESLint: passed.
- Nuxt production generation: passed.
- The broader OpenClaw contract smoke stopped at its pre-existing published-agent-version requirement before reaching the send path.

## Residual UX issue

Send failures are displayed in the page-level notice near the top of the screen, so a user scrolled to the action card may not see the error immediately. This was not changed in the scoped production fix.
