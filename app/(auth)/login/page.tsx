"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }

    toast({
      title: "Success",
      description: "Logged in successfully",
    });

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <img src="/petrobook.png" alt="PetroBook logo" className="w-10 h-10" />
            <span className="text-3xl font-bold text-slate-900">
              PetroBook
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Welcome back
          </h1>
          <p className="text-slate-600">
            Sign in to your account to continue
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-300 p-8">
          <div className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="
                  h-11
                  border-slate-300
                  text-slate-900
                  placeholder:text-slate-400
                  focus-visible:border-sky-500
                  focus-visible:ring-sky-500
                "
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="
                    h-11 pr-10
                    border-slate-300
                    text-slate-900
                    placeholder:text-slate-400
                    focus-visible:border-sky-500
                    focus-visible:ring-sky-500
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="
                    absolute right-3 top-1/2 -translate-y-1/2
                    text-slate-500 hover:text-slate-700
                  "
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked === true)
                  }
                  className="
                    border-slate-400
                    data-[state=checked]:bg-sky-600
                    data-[state=checked]:border-sky-600
                  "
                />
                <Label
                  htmlFor="remember"
                  className="text-sm text-slate-600 cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <a
                href="/forgot-password"
                className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              className="
                w-full h-11
                bg-sky-600 hover:bg-sky-700
                text-white font-medium
              "
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <a
            href="/signup"
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
          >
            Sign up for free
          </a>
        </p>

        <div className="text-center mt-8 text-xs text-slate-500">
          © 2025 PetroBook. All rights reserved.
        </div>
      </div>
    </div>
  );
}
