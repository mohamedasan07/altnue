import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiCheck, FiArrowRight } from 'react-icons/fi'
import Logo from '../../components/common/Logo'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import styles from './LoginPage.module.css'

const FEATURES = [
  'Real-time orders, inventory and revenue',
  'Customer insights in one place',
  'Launch campaigns without friction',
]

function LoginPage() {
  const { isAuthenticated, login, sessionMessage } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // A restored session means we're already signed in — skip the form.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return // prevent double submit

    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* ----- Brand panel ----- */}
      <aside className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <Logo light size="lg" />

          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Command your store
              <br />
              from one place.
            </h1>
            <p className={styles.heroSubtitle}>
              The UNSORTED admin gives you a real-time view of everything that
              keeps your business moving.
            </p>
          </div>

          <ul className={styles.features}>
            {FEATURES.map((feature) => (
              <li key={feature}>
                <span className={styles.check}>
                  <FiCheck size={14} />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <div className={styles.illustration} aria-hidden="true">
            <div className={styles.illustrationCard}>
              <div className={styles.illustrationBar} />
              <div className={styles.illustrationLine} />
              <div className={styles.illustrationLine} />
              <div className={styles.illustrationLine} />
            </div>
          </div>
        </div>
      </aside>

      {/* ----- Login panel ----- */}
      <main className={styles.authPanel}>
        <div className={styles.authCard}>
          <div className={styles.mobileLogo}>
            <Logo />
          </div>

          <header className={styles.authHeader}>
            <h2 className={styles.authTitle}>Welcome back</h2>
            <p className={styles.authSubtitle}>
              Sign in to your admin account to continue.
            </p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {error && (
              <div className={styles.formError} role="alert">
                {error}
              </div>
            )}

            {sessionMessage && (
              <div className={styles.formError} role="alert">
                {sessionMessage}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              icon={<FiMail size={16} />}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={<FiLock size={16} />}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            <div className={styles.formRow}>
              <label className={styles.remember}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a className={styles.forgot} href="#">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
              {!submitting && <FiArrowRight size={16} />}
            </Button>
          </form>

          <p className={styles.help}>
            Having trouble signing in?{' '}
            <a className={styles.helpLink} href="#">
              Contact support
            </a>
          </p>
        </div>

        <footer className={styles.footer}>© {new Date().getFullYear()} UNSORTED. All rights reserved.</footer>
      </main>
    </div>
  )
}

export default LoginPage
