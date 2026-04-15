import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import AuthForm from "../components/auth/AuthForm";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(fields) {
    setLoading(true);
    setError(null);
    try {
      await register(fields);
      toast.success("Account created! Welcome to Speaking AI.");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.errors || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthForm mode="register" onSubmit={handleSubmit} loading={loading} error={error} />
      <p className="text-center text-gray-500 text-sm -mt-4 pb-8">
        Already have an account?{" "}
        <Link to="/login" className="text-accent-400 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
