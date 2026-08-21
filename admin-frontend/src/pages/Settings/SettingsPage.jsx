import { useMemo } from 'react'
import { FiShield, FiUser, FiClock, FiKey, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../hooks/useAuth'
import SectionCard from '../../components/dashboard/SectionCard'
import Button from '../../components/ui/Button'
import { formatDateTime } from '../../utils/format'
import styles from './SettingsPage.module.css'

/**
 * Admin settings (Sprint 22.6) — READ-ONLY by design.
 *
 * The admin identity is environment-configured on the backend
 * (ADMIN_EMAIL / ADMIN_NAME / role) and arrives server-validated through
 * AuthContext (/api/auth/me at session start), so displaying it here is real
 * data. There is deliberately nothing writable: the backend has no settings
 * store, and password/credential changes are environment rotations performed
 * by the operator — never fake frontend persistence. No secret value is ever
 * displayed; only non-sensitive status is shown.
 */

/** Decode a JWT payload (base64url) without verifying — display only. */
function decodeTokenPayload(token) {
  if (!token) return null
  try {
    const [, payloadPart] = token.split('.')
    if (!payloadPart) return null
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((ch) => `%${`00${ch.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function SettingsPage() {
  const { admin, token, logout } = useAuth()

  // Session expiry comes from the real token's exp claim (unix seconds).
  const sessionExpiresAt = useMemo(() => {
    const payload = decodeTokenPayload(token)
    const exp = Number(payload?.exp)
    return Number.isFinite(exp) ? new Date(exp * 1000) : null
  }, [token])

  const roleLabel = admin?.role || 'admin'

  return (
    <div className={styles.page}>
      {/* ----- Page header ----- */}
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Account and security</p>
        </div>
      </header>

      {/* ----- Account ----- */}
      <SectionCard title="Account" subtitle="Administrator profile (managed on the server)">
        <dl className={styles.detailList}>
          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>
              <FiUser size={14} aria-hidden="true" />
              Name
            </dt>
            <dd className={styles.detailValue}>{admin?.name || '—'}</dd>
          </div>

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>
              <FiUser size={14} aria-hidden="true" />
              Email
            </dt>
            <dd className={styles.detailValue}>{admin?.email || '—'}</dd>
          </div>

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>
              <FiShield size={14} aria-hidden="true" />
              Role
            </dt>
            <dd className={styles.detailValue}>
              <span className={styles.roleBadge}>{roleLabel}</span>
            </dd>
          </div>
        </dl>
      </SectionCard>

      {/* ----- Security ----- */}
      <SectionCard title="Security" subtitle="Authentication status for this session">
        <dl className={styles.detailList}>
          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>
              <FiKey size={14} aria-hidden="true" />
              Authentication
            </dt>
            <dd className={styles.detailValue}>
              <span className={styles.statusBadge}>
                Password · bcrypt-hashed
              </span>
            </dd>
          </div>

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>
              <FiClock size={14} aria-hidden="true" />
              Session expires
            </dt>
            <dd className={styles.detailValue}>
              {sessionExpiresAt ? formatDateTime(sessionExpiresAt.toISOString()) : '—'}
            </dd>
          </div>
        </dl>

        <div className={styles.securityActions}>
          <Button variant="outline" onClick={logout}>
            <FiLogOut size={14} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </SectionCard>

      {/* ----- Credential rotation note (informational, no values) ----- */}
      <SectionCard title="Credential Rotation" subtitle="How admin credentials are changed">
        <div className={styles.noteBody}>
          <p>
            Admin credentials are configured on the backend as environment
            variables — never stored in this dashboard and never displayed here.
          </p>
          <ul className={styles.noteList}>
            <li>
              <strong>Password</strong> — rotate by replacing the bcrypt hash
              (<code>ADMIN_PASSWORD_HASH</code>) in the backend environment and
              restarting the API. Plaintext passwords are never used for
              verification.
            </li>
            <li>
              <strong>Profile</strong> — the displayed name and email come from
              the backend environment (<code>ADMIN_NAME</code>,{' '}
              <code>ADMIN_EMAIL</code>).
            </li>
            <li>
              <strong>Tokens</strong> — signing keys and lifetimes are also
              environment-managed (<code>JWT_SECRET</code>,{' '}
              <code>JWT_EXPIRES_IN</code>). Rotating the secret invalidates all
              existing sessions.
            </li>
          </ul>
        </div>
      </SectionCard>
    </div>
  )
}

export default SettingsPage
