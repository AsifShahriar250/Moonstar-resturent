import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChefHat, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import App from "../App";
import {
  apiRequest,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "../lib/api";
import "./AuthGate.css";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
};

type AuthResponse = {
  success: boolean;
  data: {
    token?: string;
    user: User;
  };
};

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const logout = useCallback(async () => {
    try {
      if (getAuthToken()) {
        await apiRequest("/auth/logout", {
          method: "POST",
        });
      }
    } catch {
      // Always clear the local session, even if the server is unreachable.
    } finally {
      clearAuthToken();
      setUser(null);
      setPassword("");
      setError("");
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setChecking(false);
      setPassword("");
    };

    const handleLogout = () => logout();

    window.addEventListener("moonstar:unauthorized", handleUnauthorized);
    window.addEventListener("moonstar:logout", handleLogout);

    async function verifySession() {
      if (!getAuthToken()) {
        setChecking(false);
        return;
      }

      try {
        const result = await apiRequest<AuthResponse>("/auth/me");
        setUser(result.data.user);
      } catch {
        clearAuthToken();
        setUser(null);
      } finally {
        setChecking(false);
      }
    }

    void verifySession();

    return () => {
      window.removeEventListener("moonstar:unauthorized", handleUnauthorized);
      window.removeEventListener("moonstar:logout", handleLogout);
    };
  }, [logout]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!result.data.token) {
        throw new Error("The server did not return an authentication token.");
      }

      setAuthToken(result.data.token);

      const verified = await apiRequest<AuthResponse>("/auth/me");
      setUser(verified.data.user);
      setPassword("");
    } catch (err) {
      clearAuthToken();
      setUser(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="auth-loading">
        <div className="auth-brand-mark"><ChefHat size={28} /></div>
        <p>Verifying your session...</p>
      </div>
    );
  }

  if (user) {
    return <App user={user} onLogout={logout} />;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark"><ChefHat size={29} /></div>
          <div>
            <div className="auth-brand-name">moonstar<span>.</span></div>
            <p>RESTAURANT ADMIN</p>
          </div>
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">WELCOME BACK</span>
          <h1>Sign in to your account</h1>
          <p>Enter your credentials to manage your restaurant.</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label htmlFor="admin-email">Email address</label>
          <div className="auth-input-wrap">
            <Mail size={18} aria-hidden="true" />
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={255}
              required
              disabled={submitting}
            />
          </div>

          <label htmlFor="admin-password">Password</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={200}
              required
              disabled={submitting}
            />
            <button
              className="auth-password-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && (
            <div className="auth-error" role="alert">{error}</div>
          )}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in securely"}
          </button>
        </form>

        <div className="auth-security">
          <LockKeyhole size={14} />
          <span>Secure access for authorized restaurant staff</span>
        </div>
      </section>

      <p className="auth-footer">© Moonstar Restaurant · Admin Portal</p>
    </main>
  );
}
