# ChatCase Incident Automation Flow

This flow receives incidents from ChatCase operational alerts and Sentry issue alerts, normalizes them, redacts common sensitive values, applies a severity threshold, and optionally sends a Resend e-mail.

Default behavior is dry-run. This prevents repeated real e-mails while testing.

## Endpoints

- `POST /webhooks/chatcase/operational-alert`
- `POST /webhooks/sentry/issue-alert`
- `GET /healthz`

Use `INCIDENT_WEBHOOK_SECRET` and pass it either as query string `?secret=...` or header `x-chatcase-automation-secret`.

## Local Test

```bash
node scripts/test-incident-automation-flow.js
```

Expected output:

```text
OK incident automation flow: chatcase dry-run, sentry dry-run, auth guard
```

## Local Run

```bash
INCIDENT_WEBHOOK_SECRET='<long-random-secret>' \
INCIDENT_AUTOMATION_DRY_RUN=true \
node scripts/incident-automation-webhook.js
```

## Production Notes

Keep `INCIDENT_AUTOMATION_DRY_RUN=true` until the public HTTPS route and secret are tested. To send real mail:

```bash
INCIDENT_AUTOMATION_DRY_RUN=false
RESEND_API_KEY=...
INCIDENT_EMAIL_FROM=redacted@example.invalid
INCIDENT_EMAIL_TO=redacted@example.invalid
```

Connect ChatCase:

```text
OPERATIONAL_ALERT_WEBHOOK_URL=https://automation.example.com/webhooks/chatcase/operational-alert?secret=<long-random-secret>
```

Connect Sentry issue alert webhook:

```text
https://automation.example.com/webhooks/sentry/issue-alert?secret=<long-random-secret>
```
