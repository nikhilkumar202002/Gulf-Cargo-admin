
import "./LoginRegisterStyles.css"
import React, { useState } from "react";
import { Button } from "@radix-ui/themes";

import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../auth/AuthContext";

function Login() {

  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {

    e.preventDefault();
    setMessage("");

    try {
      const response = await axios.post(
        "https://gulfcargoapi.bhutanvoyage.in/api/login",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );
      
      if (response.status === 200) {
        login(response.data.token); // **Update context**
        setMessage("Login successful! Redirecting...");
        navigate("/dashboard", { replace: true }); // **Immediate redirect**
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Invalid email or password");
    }
  };

  return (
    <>
      <section className="login-page">
        <div className="login-page-container">
          <div className="login-page-box">
            <img src='/Logo.png' width={100} />
            <h1 className='login-page-heading'>Admin Login!</h1>

            <form onSubmit={handleLogin}>
              <div className="login-form-row">
                <label htmlFor="">Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="login-form-row">
                <label htmlFor="">Password</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="login-form-row">
                <Button className='login-btn' type="submit">Login</Button>
              </div>

            </form>
            {message && <p className="login-message">{message}</p>}

           
          </div>
        </div>
      </section>
    </>
  )
}

export default Login