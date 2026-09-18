import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("eduflow_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    const isAuthRequest = url.includes("/auth/");
    // Only force-logout/redirect when an already-authenticated session expires,
    // NOT on login attempts — otherwise a failed login reloads the whole page.
    if (err.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem("eduflow_token");
      localStorage.removeItem("eduflow_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
