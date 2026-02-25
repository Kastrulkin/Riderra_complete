# RBAC Matrix (Role x Action)

Legend: `A` allow, `R` read-only, `N` no access, `AP` allow with approval workflow.

| Action | Owner/Admin | Dispatcher | Operator | Sales/CRM | Finance/Pricing | Audit |
|---|---|---|---|---|---|---|
| View orders | A | A | A | R | R | R |
| Edit non-sheet order fields | A | A | AP | N | N | N |
| Override sheet-owned fields | A | AP | N | N | N | N |
| Close/cancel order | A | A | AP | N | N | N |
| View customer profile | A | A | R | A | R | R |
| Edit customer profile | A | AP | N | A | N | N |
| Run CRM outreach | A | N | N | AP | N | N |
| View price book | A | R | R | R | A | R |
| Edit price book | A | N | N | N | AP | N |
| Resolve mismatch incidents | A | AP | N | N | A | R |
| Approve AI tasks (ops) | A | A | N | N | N | N |
| Approve AI tasks (pricing) | A | N | N | N | A | N |
| Approve AI tasks (CRM) | A | N | N | A | N | N |
| Telegram incident commands | A | A | A(limited) | R | A | R |
| Access audit logs | A | R | N | N | R | A |
| User/role management | A | N | N | N | N | N |

## Mandatory rules
- Любое outbound сообщение клиенту от AI: минимум `AP`.
- Любое изменение прайса: минимум `AP` роли Finance/Pricing или Owner.
- Любое массовое действие (>20 клиентов/заказов): только Owner approval.
