"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function SignupPage() {
  const { user, loading, signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/chat");
  }, [user, loading, router]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      router.push("/chat");
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-sky-200 dark:border-slate-600 border-t-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-white text-2xl font-bold shadow-soft mb-3">
            S
          </div>
          <h1 className="page-title">Join SkyChat</h1>
          <p className="page-subtitle">Create your account to start chatting</p>
        </div>

        <form onSubmit={handleSubmit} className="panel-card p-6 space-y-4">
          {error && <div className="error-box">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Full name
            </label>
            <input className="input-field" value={form.name} onChange={update("name")} placeholder="Jane Doe" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Username
            </label>
            <input className="input-field" value={form.username} onChange={update("username")} placeholder="janedoe" required minLength={3} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Email
            </label>
            <input type="email" className="input-field" value={form.email} onChange={update("email")} placeholder="jane@email.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Password
            </label>
            <input type="password" className="input-field" value={form.password} onChange={update("password")} placeholder="At least 6 characters" required minLength={6} />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Sign up"}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
