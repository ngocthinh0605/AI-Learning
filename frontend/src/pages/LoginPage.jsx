import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import AuthForm from "../components/auth/AuthForm";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit({ email, password }) {
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthForm mode="login" onSubmit={handleSubmit} loading={loading} error={error} />
      <p className="text-center text-gray-500 text-sm -mt-4 pb-8">
        Don't have an account?{" "}
        <Link to="/register" className="text-accent-400 hover:underline">
          Sign up free
        </Link>
      </p>
    </>
  );
}
