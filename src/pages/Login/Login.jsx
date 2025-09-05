
import "./LoginRegisterStyles.css";
import React, { useState } from "react";
import { Button } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { loginUser } from "../../api/accountApi";
import AdminImage from "../../assets/bg/admin-bg.jpg";

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const data = await loginUser({ email, password });
      // Your AuthContext might expect a token param; passing it is fine,
      // but the source of truth is our in-memory store.
      const token = data?.access_token || data?.token || null;
      login?.(token);
      setMessage("Login successful! Redirecting...");
      // navigate(...) if needed
    } catch (err) {
      console.error("Login error:", err?.response?.data || err?.message);
      setMessage(err?.response?.data?.message || "Invalid email or password");
    }
  };

  return (
    <section className="login-page" style={{ backgroundImage: `url(${AdminImage})` }}>
      <div className="login-page-container">
        <div className="login-page-box">
          <img src="/Logo.png" width={100} alt="Logo" />
          <h1 className="login-page-heading">Admin Login!</h1>

          <form onSubmit={handleLogin}>
            <div className="login-form-row">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="login-form-row">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="login-form-row">
              <Button className="login-btn" type="submit">Login</Button>
            </div>
          </form>

          <div className="forgot-password-link">
            <Link to="/forgotpassword" style={{ cursor: "pointer", color: "blue" }}>
              Forgot Password?
            </Link>
          </div>
          {message && <p style={{ color: message.startsWith("Login successful") ? "lime" : "tomato" }}>{message}</p>}
        </div>
      </div>
    </section>
  );
}

export default Login;
