import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useShelfStore } from "@/store/useShelfStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const signUpSchema = z
  .object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(12, { message: "Password must be at least 12 characters" })
      .regex(/[a-z]/, { message: "Must include a lowercase letter" })
      .regex(/[A-Z]/, { message: "Must include an uppercase letter" })
      .regex(/\d/, { message: "Must include a number" })
      .regex(/[^A-Za-z0-9]/, { message: "Must include a symbol" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuthPage() {
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const isDemoMode = useShelfStore((s) => s.isDemoMode);
  const exitDemoMode = useShelfStore((s) => s.exitDemoMode);

  // Clear demo state if arriving from demo (e.g. "Sign Up Free" button)
  useEffect(() => {
    if (isDemoMode) exitDemoMode();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSignUp = location.pathname === "/register";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from?.pathname || "/home";

  useEffect(() => {
    if (session) {
      navigate(from, { replace: true });
    }
  }, [from, navigate, session]);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const handleSignIn = async (values: SignInValues) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (values: SignUpValues) => {
    setLoading(true);
    try {
      const authData = await signUp(values.email, values.password);
      if (authData.session) {
        toast.success("Account created!");
        navigate(from, { replace: true });
      } else {
        toast.success("Account created. Check your email to confirm it, then sign in.");
        navigate("/login", { replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign up");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    navigate(isSignUp ? "/login" : "/register", { replace: true });
  };

  return (
    <div className="relative flex items-center justify-center min-h-dvh p-4">
      <img
        src="/signin-bg.gif"
        alt=""
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      />
      <img
        src="/signin-bg-light.gif"
        alt=""
        className="absolute dark:hidden inset-0 h-full w-full object-repeat pointer-events-none"
      />
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        <Card key={location.pathname} className="w-full">
          <div className="flex justify-start px-4 pb-4">
            <img
              src="/logo/arkiv-logo-white.svg"
              alt="Arkiv"
              className="h-12 hidden dark:block"
            />
            <img
              src="/logo/arkiv-logo-black.svg"
              alt="Arkiv"
              className="h-12 dark:hidden"
            />
          </div>
          {isSignUp ? (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Create Account</CardTitle>
                <CardDescription>
                  Enter your details below to create a new account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...signUpForm}>
                  <form
                    onSubmit={signUpForm.handleSubmit(handleSignUp)}
                    className="space-y-4"
                    autoComplete="on"
                  >
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="m@example.com"
                              autoComplete="email"
                              autoCapitalize="none"
                              autoCorrect="off"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : "Sign Up"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Already have an account?
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={switchMode}
                >
                  Sign In
                </Button>
                <Link
                  to="/"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  View product page
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Sign In</CardTitle>
                <CardDescription>
                  Enter your email below to sign in to your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...signInForm}>
                  <form
                    onSubmit={signInForm.handleSubmit(handleSignIn)}
                    className="space-y-4"
                    autoComplete="on"
                  >
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="m@example.com"
                              autoComplete="username"
                              inputMode="email"
                              autoCapitalize="none"
                              autoCorrect="off"
                              spellCheck={false}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="current-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={switchMode}
                >
                  Sign Up
                </Button>
                <Link
                  to="/"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  View product page
                </Link>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
