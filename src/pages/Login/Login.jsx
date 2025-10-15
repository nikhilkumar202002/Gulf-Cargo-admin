import "./LoginRegisterStyles.css";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@radix-ui/themes";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setToken, setSessionId, fetchProfile } from "../../store/slices/authSlice";
import { loginUser } from "../../api/accountApi";
import AdminImage from "../../assets/bg/admin-bg.webp";
import Logo from "../../assets/Logo.png";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { flushSync } from "react-dom";

/* ---------------- Top toast (slide down) ---------------- */
function TopToast({ open, message = "", variant = "error", onClose, duration = 2500 }) {
  const bg =
    variant === "success" ? "#16a34a" : variant === "warning" ? "#f59e0b" : "#dc2626";

  useEffect(() => {
    if (!open || !duration) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        transform: open ? "translateY(0)" : "translateY(-110%)",
        transition: "transform 320ms ease, opacity 320ms ease",
        opacity: open ? 1 : 0,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          margin: "10px auto",
          maxWidth: 720,
          background: bg,
          color: "white",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,.25)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 600 }}>{message}</span>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,.2)",
            color: "white",
            border: 0,
            padding: "6px 10px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ---------------- Inline validators ---------------- */
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validate(values) {
  const errs = {};
  if (!values.email) errs.email = "Email is required";
  else if (!emailRe.test(values.email)) errs.email = "Enter a valid email address";

  if (!values.password) errs.password = "Password is required";
  else if (values.password.length < 6) errs.password = "Minimum 6 characters";

  return errs;
}

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSelector((s) => s.auth.token);

  const [values, setValues] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("error");

  const errors = useMemo(() => validate(values), [values]);
  const hasErrors = Object.keys(errors).length > 0;

  const onChange = (e) => {
    const { id, value } = e.target;
    setValues((v) => ({ ...v, [id]: value }));
  };
  const onBlur = (e) => {
    const { id } = e.target;
    setTouched((t) => ({ ...t, [id]: true }));
  };

  const openToast = (msg, type = "error") => {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  };

  // If an authenticated user lands on /login, push them to dashboard.
  useEffect(() => {
    if (token) {
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    }
  }, [token, navigate, location.state]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (hasErrors) {
      openToast("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await loginUser(
        { email: values.email.trim(), password: values.password },
        { persist: true }
      );

      const apiToken =
        data?.token || data?.access_token || data?.data?.token || data?.result?.token;
      if (!apiToken) throw new Error("No token returned from login API");
      const apiSessionId =
       data?.session_id || data?.data?.session_id || data?.result?.session_id;
     if (apiSessionId) {
       localStorage.setItem("session_id", apiSessionId);
     }

      flushSync(() => {
        dispatch(setToken(apiToken));
        if (apiSessionId) dispatch(setSessionId(apiSessionId));
      });
      // Also ensure localStorage is set (setToken already does this, but belt & suspenders)
      localStorage.setItem("token", apiToken);

      // Fire-and-forget profile (don’t block navigation)
      dispatch(fetchProfile()).catch(() => {});

      openToast("Logged in successfully!", "success");
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Invalid email or password";
      openToast(String(apiMsg), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TopToast
        open={toastOpen}
        message={toastMsg}
        variant={toastType}
        onClose={() => setToastOpen(false)}
        duration={toastType === "success" ? 1600 : 3200}
      />

      <section
        className="login-page"
        style={{ backgroundImage: `url(${AdminImage})` }}
      >
        <div className="login-page-container">
          <div className="login-page-box">
            <img src={Logo} width={100} alt="Logo" />
            <form onSubmit={handleLogin} noValidate>
              {/* Email */}
              <div className="login-form-row">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  value={values.email}
                  onChange={onChange}
                  onBlur={onBlur}
                  autoComplete="username"
                  aria-invalid={!!(touched.email && errors.email)}
                  aria-describedby={touched.email && errors.email ? "email-error" : undefined}
                  required
                />
                {touched.email && errors.email && (
                  <div
                    id="email-error"
                    className="field-error"
                    style={{ color: "tomato", fontSize: 13, marginTop: -13 }}
                  >
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password with eye toggle */}
              <div className="login-form-row">
                <label htmlFor="password">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPwd ? "text" : "password"}
                    id="password"
                    placeholder="Enter your password"
                    value={values.password}
                    onChange={onChange}
                    onBlur={onBlur}
                    autoComplete="current-password"
                    aria-invalid={!!(touched.password && errors.password)}
                    aria-describedby={
                      touched.password && errors.password ? "password-error" : undefined
                    }
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "40%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: 0,
                      padding: 4,
                      cursor: "pointer",
                      color: "#666",
                    }}
                  >
                    {showPwd ? <FiEyeOff className="eye-color" size={20} /> : <FiEye size={20} className="eye-color" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <div
                    id="password-error"
                    className="field-error"
                    style={{ color: "tomato", fontSize: 13, marginTop: -13 }}
                  >
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="login-form-row">
                <Button className="login-btn" type="submit" disabled={submitting}>
                  {submitting ? "Signing in…" : "Login"}
                </Button>
              </div>
            </form>

            <div className="forgot-password-link">
              <Link to="/forgotpassword" style={{ cursor: "pointer", color: "blue" }}>
                Forgot Password?
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
