const rawUrl = import.meta.env.VITE_API_URL || "https://cuvasol-backend.vercel.app/api";
const API_URL = rawUrl.replace(/\/$/, "");

export default API_URL;
