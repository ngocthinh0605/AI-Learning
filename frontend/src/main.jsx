import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { useAuthStore } from "./stores/useAuthStore";
import "./index.css";

// Restore session from localStorage before the first render
useAuthStore.getState().init();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1e1b4b",
            color: "#e0e7ff",
            border: "1px solid #4f46e5",
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
