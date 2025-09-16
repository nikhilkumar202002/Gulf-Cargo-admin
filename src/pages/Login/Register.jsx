import { Button } from '@radix-ui/themes'
import React from 'react'
import "./LoginRegisterStyles.css"
import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Register() {

      const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(
        "https://api.gulfcargoksa.com/public/api/register",
        {
          name,
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Check API response
      if (response.status === 201 || response.status === 200) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setError(response.data.message || "Registration failed!");
      }
    } catch (err) {
      console.error("Registration Error:", err);
      setError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    }
  };    

  return (
    <>
        <section className="login-page">
            <div className="login-page-container">
                <div className="login-page-box">
                    <img src='/Logo.png' width={100}/>
                    <h1 className='login-page-heading'>Create Register!</h1>

                    {error && <p className="text-red-500 text-center">{error}</p>}
                    {success && <p className="text-green-600 text-center">{success}</p>}

                    <form onSubmit={handleRegister}>
                        <div className="login-form-row">
                            <label htmlFor="">Full Name</label>
                            <input 
                                type="text"
                                placeholder='Full Name'
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="login-form-row">
                            <label htmlFor="">Email</label>
                            <input type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)} 
                                required
                                />
                        </div>

                        <div className="login-form-row">
                            <label htmlFor="">Password</label>
                            <input  
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                />
                        </div>

                        <div className="login-form-row">
                            <Button className='login-btn'>Register Now</Button>
                        </div>
                        
                    </form>

<p className="login-register-link">
  <Link to="/login" className="text-blue-600 hover:underline">
    Back to Login
  </Link>
</p>

                </div>
            </div>
        </section>
    </>
  )
}

export default Register