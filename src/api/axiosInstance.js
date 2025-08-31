import axios from "axios";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: "https://gulfcargoapi.bhutanvoyage.in/api", // API base URL
  timeout: 10000, // Timeout for requests (10 seconds)
  headers: { Accept: "application/json" }, // Accept header for responses
});

// Request Interceptor for adding Authorization token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && !config.url.includes("/login") && !config.url.includes("/register")) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config; // Return the modified config
  },
  (error) => {
    return Promise.reject(error); // Forward the error
  }
);

// Response Interceptor (No masking, just returning the response)
axiosInstance.interceptors.response.use(
  (response) => {
    return response; // Return the original response without modification
  },
  (error) => {
    return Promise.reject(error); // Forward the error
  }
);

export default axiosInstance;
