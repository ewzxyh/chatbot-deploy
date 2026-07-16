const crypto = require('crypto');

const SEVERITY_RANK = {
  debug: 0,
  info: 1,
  success: 1,
  ok: 1,
  resolved: 1,
  warning: 2,
  warn: 2,
  degraded: 2,
  error: 3,
  failed: 3,
  down: 3,
  critical: 4,
  fatal: 4,
};

function normalizeSeverity(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'fatal') return 'critical';
  if (normalized === 'warn') return 'warning';
  if (normalized === 'failed' || normalized === 'down') return 'error';
  return SEVERITY_RANK[normalized] !== undefined ? normalized : 'critical';
}

function severityRank(value) {
  return SEVERITY_RANK[normalizeSeverity(value)] || 0;
}

function redact(value) {
  if (value === null || value === undefined) return value;
  return String(value)
    .replace(/https?:\/\/[^?\s]+(\?[^)\]\s]+)?/gi, (match) => match.split('?')[0])
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '[phone]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/JWT\s+[A-Za-z0-9._~+/=-]+/gi, 'JWT [redacted]')
    .replace(/(token|secret|password|api[_-]?key|access[_-]?key)=([^&\s]+)/gi, '$1=[redacted]');
}

function pick(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function hash(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 16);
}

function normalizeChatCase(payload) {
  const alert = payload.alert || payload.result || payload;
  const eventName = pick(payload.event, payload.eventName, alert.event, 'alert.opened');
  const severity = normalizeSeverity(pick(alert.severity, payload.severity, 'critical'));
  const status = String(eventName).includes('resolved') || alert.status === 'resolved' ? 'resolved' : 'open';
  const service = pick(alert.service, payload.service, 'system');
  const channel = pick(alert.channel, payload.channel, '');
  const project = pick(alert.project, alert.projectName, alert.id_project, payload.project, '');
  const title = redact(pick(alert.title, payload.title, 'ChatCase operational alert'));
  const message = redact(pick(alert.message, payload.message, alert.reason, 'Operational alert emitted by ChatCase'));
  const key = pick(alert.key, alert.type, payload.key, `${service}:${channel || 'system'}:${title}`);

  return {
    source: 'chatcase',
    eventName,
    status,
    severity,
    title,
    message,
    service,
    channel,
    project,
    issueUrl: redact(pick(alert.url, payload.url, '')),
    occurredAt: pick(alert.lastAt, alert.updatedAt, payload.generatedAt, new Date().toISOString()),
    dedupeKey: `chatcase:${hash(key)}`,
    rawType: pick(alert.type, payload.type, ''),
  };
}

function normalizeSentry(payload) {
  const data = payload.data || {};
  const issue = data.issue || payload.issue || data.event || payload.event || {};
  const project = data.project || issue.project || payload.project || {};
  const level = pick(issue.level, data.level, payload.level, 'error');
  const severity = normalizeSeverity(level === 'error' ? 'critical' : level);
  const title = redact(pick(issue.title, issue.culprit, data.title, payload.title, 'Sentry issue'));
  const message = redact(pick(issue.message, issue.metadata && issue.metadata.value, title));
  const issueId = pick(issue.id, issue.issue_id, payload.issue_id, issue.shortId, title);

  return {
    source: 'sentry',
    eventName: pick(payload.action, payload.triggered_rule, 'issue.alert'),
    status: payload.action === 'resolved' ? 'resolved' : 'open',
    severity,
    title,
    message,
    service: 'sentry',
    channel: '',
    project: typeof project === 'string' ? project : pick(project.slug, project.name, ''),
    issueUrl: redact(pick(issue.web_url, issue.permalink, issue.url, payload.url, '')),
    occurredAt: pick(issue.lastSeen, issue.dateCreated, data.timestamp, payload.triggered_at, new Date().toISOString()),
    dedupeKey: `sentry:${hash(issueId)}`,
    rawType: pick(issue.type, payload.type, ''),
  };
}

function detectSource(payload, explicitSource) {
  if (explicitSource) return explicitSource;
  if (payload && (payload.data && payload.data.issue || payload.issue || payload.triggered_rule)) return 'sentry';
  return 'chatcase';
}

function normalizeIncident(payload, source) {
  const detected = detectSource(payload || {}, source);
  return detected === 'sentry' ? normalizeSentry(payload || {}) : normalizeChatCase(payload || {});
}

function shouldNotify(incident, options = {}) {
  if (!incident) return false;
  const minSeverity = normalizeSeverity(options.minSeverity || process.env.INCIDENT_MIN_SEVERITY || 'critical');
  if (incident.status === 'resolved' && options.notifyResolved !== true) return false;
  if (incident.source === 'chatcase' && incident.eventName === 'alert.still_open' && options.notifyStillOpen !== true) return false;
  return severityRank(incident.severity) >= severityRank(minSeverity);
}

function buildEmail(incident, options = {}) {
  const subjectPrefix = options.subjectPrefix || '[ChatCase]';
  const subject = `${subjectPrefix} ${incident.severity.toUpperCase()}: ${incident.title}`;
  const fields = [
    ['Origem', incident.source],
    ['Evento', incident.eventName],
    ['Severidade', incident.severity],
    ['Status', incident.status],
    ['Projeto', incident.project || '-'],
    ['Servico', incident.service || '-'],
    ['Canal', incident.channel || '-'],
    ['Dedup', incident.dedupeKey],
    ['Ocorrencia', incident.occurredAt],
    ['URL', incident.issueUrl || '-'],
  ];
  const text = [
    subject,
    '',
    incident.message,
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
  ].join('\n');
  const htmlRows = fields.map(([label, value]) => `<li><strong>${label}:</strong> ${escapeHtml(value)}</li>`).join('');

  return {
    subject,
    text,
    html: `<h2>${escapeHtml(subject)}</h2><p>${escapeHtml(incident.message)}</p><ul>${htmlRows}</ul>`,
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function processIncidentPayload(payload, options = {}) {
  const incident = normalizeIncident(payload, options.source);
  const notify = shouldNotify(incident, options);
  return {
    notify,
    incident,
    email: notify ? buildEmail(incident, options) : null,
  };
}

module.exports = {
  normalizeIncident,
  processIncidentPayload,
  shouldNotify,
  buildEmail,
  redact,
  _private: {
    normalizeSeverity,
    severityRank,
  },
};
