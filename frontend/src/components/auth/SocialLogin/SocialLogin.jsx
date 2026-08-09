import styles from './SocialLogin.module.css';

const PROVIDERS = [
  {
    id: 'google',
    label: 'Continue with Google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 5.5c1.7 0 3.2.6 4.4 1.7l3.2-3.2C17.8 2.2 15.1 1 12 1 7.8 1 4 3.8 2.2 7.7l3.7 2.9C6.8 8.2 9.4 6.3 12 6.3z"
        />
        <path
          fill="#4285F4"
          d="M20 12.2c0-1.7-.2-3-.5-4h-7.5v3.6h4.5c-.2 1.1-.9 2.5-2.2 3.3l3.4 2.6C18.4 16.8 20 14.9 20 12.2z"
        />
        <path
          fill="#FBBC05"
          d="M5.9 13.3c-.3-.9-.4-1.9-.4-2.8s.1-1.9.4-2.8L2.2 4.8C1.5 6.3 1.2 8.1 1.2 10s.3 3.6.9 5.1l3.8-2.8z"
        />
        <path
          fill="#34A853"
          d="M12 22c3.2 0 5.9-1 7.8-2.9l-3.4-2.7c-1.3.9-3 1.4-4.4 1.4-2.6 0-5.2-1.9-6-4.4l-3.8 2.8C4 20.8 7.8 22 12 22z"
        />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 1.8a10.2 10.2 0 0 0-3.2 19.9c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.2-4.6-1.1-4.6-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.8-2.3 4.7-4.6 4.9.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10.2 10.2 0 0 0 12 1.8z" />
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Continue with Apple',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.4 12.8c0-2.1 1.7-3.1 1.8-3.2-1-.1-2-.6-2.6-1.4-1.1-1.3-2.7-.6-3.4-.6-.7 0-1.8-.9-2.8-.8-2.6.1-4.9 3-4.9 6.5 0 1.9.4 4 1.5 5.4.6.8 2.3.5 3.1.5 1 0 1.4-.1 2.3-.1.4 0 .6.2 1.4.5.4.2 1.2.4 1.6-.4.8-1.2 1.2-2.3 1.2-2.4.9-.3 1.4-2.3 1.4-2.5 0-.1-1.1-.7-1.6-1.5zM14.5 5.4c.7-.5 1.5-.6 1.8-.1-.2.9-.6 1.5-1.1 1.9-.5.4-1.3.4-1.5.1-.3-.4-.1-1.6.8-1.9z" />
      </svg>
    ),
  },
];

/**
 * Social sign-in buttons — UI only per Sprint 11.
 * (Google / GitHub / Apple flows arrive with a real backend.)
 */
export default function SocialLogin() {
  return (
    <div className={styles.providers}>
      {PROVIDERS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className={styles.button}
          onClick={() => {
            /* placeholder — no social provider backend yet */
          }}
          aria-label={label}
        >
          {icon}
          <span className={styles.label}>{label.split(' ').pop()}</span>
        </button>
      ))}
    </div>
  );
}