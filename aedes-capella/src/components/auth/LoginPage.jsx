import { useState } from 'react';
import Card from '../ui/Card';
import Tag from '../ui/Tag';
import { isSupabaseConfigured } from '../../lib/supabaseApi';
import { getFriendlyError } from '../../utils/userMessages';

const FEATURES = [
  ['Latest sensor updates', 'See recent sensor activity and possible mosquito matches.'],
  ['Barangay map', 'Check recent reports by area and decide where to look first.'],
  ['Sensor status', 'See which sensors are working and which need checking.'],
  ['Private account', 'Only approved barangay workers can open the dashboard.'],
];

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key) => (event) => {
    setForm(current => ({ ...current, [key]: event.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onLogin(form.username.trim(), form.password);
    } catch (loginError) {
      setError(getFriendlyError(loginError, 'We could not sign you in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `login-input${error ? ' login-input-error' : ''}`;

  return (
    <div className="login-shell">
      <div className="login-layout">
        <Card className="login-hero">
          <div className="login-brand-block">
            <div className="login-brand">AedesCapella</div>
            <div className="login-brand-sub">BARANGAY MOSQUITO WATCH</div>
          </div>

          <Tag color="amber">Barangay Worker Sign-in</Tag>

          <h1 className="login-headline">Keep an eye on mosquito activity in one place.</h1>

          <p className="login-lede">
            Sign in to check sensor updates, see areas needing attention, and review recorded
            spraying activity around the barangay.
          </p>

          <div className="login-features">
            {FEATURES.map(([title, text]) => (
              <div key={title} className="login-feature">
                <div className="login-feature-title">{title}</div>
                <div className="login-feature-text">{text}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="login-form-card">
          <div className="login-form-head">
            <div className="login-form-title">Login</div>
            <div className="login-form-sub">Enter your email and password to open the dashboard.</div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="login-field">
              <div className="login-field-label">EMAIL ADDRESS</div>
              <input
                value={form.username}
                onChange={handleChange('username')}
                type="email"
                placeholder="operator@example.org"
                autoComplete="username"
                className={inputClass}
              />
            </label>

            <label className="login-field login-field-last">
              <div className="login-field-label">PASSWORD</div>
              <input
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Enter password"
                autoComplete="current-password"
                className={inputClass}
              />
            </label>

            {error && <div className="login-note login-note-error">{error}</div>}

            {!isSupabaseConfigured && (
              <div className="login-note login-note-warn">
                This dashboard is not set up yet. Please ask the system administrator for help.
              </div>
            )}

            <button type="submit" disabled={submitting || !isSupabaseConfigured} className="login-submit">
              {submitting ? 'Signing In…' : 'Sign In'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
