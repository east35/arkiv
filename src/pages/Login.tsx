import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
})

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  
  // Default to redirecting to home, or back to where they came from
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from?.pathname || "/"

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      await signIn(values.email, values.password)
      toast.success("Welcome back!")
      navigate(from, { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden">
      <img src="/login-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="flex justify-center">
          <img src="/logo/arkiv-logo-white.svg" alt="Arkiv" className="h-12 hidden dark:block" />
          <img src="/logo/arkiv-logo-black.svg" alt="Arkiv" className="h-12 dark:hidden" />
        </div>
        <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Don't have an account?
          </p>
          <Link to="/register" className="w-full">
            <Button variant="outline" className="w-full">Sign Up</Button>
          </Link>
        </CardFooter>
      </Card>
      </div>
    </div>
  )
}
