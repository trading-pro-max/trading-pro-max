const g = globalThis as any;

if (!g.__TPM_AUDIT__) g.__TPM_AUDIT__ = [];

export function logSecurity(event: string, meta?: any) {
  g.__TPM_AUDIT__.unshift({
    event,
    meta,
    time: new Date().toISOString(),
  });

  g.__TPM_AUDIT__ = g.__TPM_AUDIT__.slice(0, 200);
}

export function getAuditLogs() {
  return g.__TPM_AUDIT__;
}
