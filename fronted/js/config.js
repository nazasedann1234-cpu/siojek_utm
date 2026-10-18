const isLocal = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
const API_BASE = isLocal ? "http://localhost:3000/api" : `${window.location.origin}/api`;
