import "./LoginRegisterStyles.css";
import React, { useState } from "react";
import { Button } from "@radix-ui/themes";
import { Link } from "react-router-dom";  // Use Link for navigation
import { useAuth } from "../../auth/AuthContext";
import { loginUser } from "../../api/accountApi";
import AdminImage from "../../../public/bg/admin-bg.jpg";

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");  // Clear previous messages

    try {
      const data = await loginUser({ email, password });
      login(data.token); // store token in AuthContext
      setMessage("Login successful! Redirecting...");
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setMessage(err.response?.data?.message || "Invalid email or password");
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
              <Button className="login-btn" type="submit">
                Login
              </Button>
            </div>
          </form>

          {/* Forgot password link using Link from react-router-dom */}
          <div className="forgot-password-link">
            <Link
              to="/forgotpassword"  // Use Link for redirection
              style={{ cursor: "pointer", color: "blue" }}
            >
              Forgot Password?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;
