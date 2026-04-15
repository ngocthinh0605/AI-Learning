import React, { useState } from "react";
import { Mic } from "lucide-react";

const ENGLISH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * Shared form component used by both Login and Register pages.
 * Keeps form rendering logic separate from page-level submit logic.
 */
export default function AuthForm({ mode, onSubmit, loading, error }) {
  const isRegister = mode === "register";

  const [fields, setFields] = useState({
    email: "",
    password: "",
    passwordConfirmation: "",
    displayName: "",
    englishLevel: "B1",
  });

  function handleChange(e) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(fields);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent-500 rounded-2xl mb-4">
            <Mic size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Speaking AI</h1>
          <p className="text-gray-400 mt-1">
            {isRegister ? "Create your account to start learning" : "Welcome back, keep practicing!"}
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Display Name</label>
                <input
                  type="text"
                  name="displayName"
                  value={fields.displayName}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={fields.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                value={fields.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    name="passwordConfirmation"
                    value={fields.passwordConfirmation}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Current English Level</label>
                  <select
                    name="englishLevel"
                    value={fields.englishLevel}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {ENGLISH_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                {Array.isArray(error) ? error.join(", ") : error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Please wait…" : isRegister ? "Create Account" : "Log In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
