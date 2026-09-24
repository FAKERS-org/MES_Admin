import axios from "axios";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation"; // For client-side redirects

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid. Clear it and redirect to login.
      Cookies.remove("access_token");
      if (typeof window !== "undefined") {
        window.location.href = "/login"; 
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;