import { redirect } from "next/navigation";
import { ShieldCheck, Users, Sparkles, Container } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";

export default async function AdminPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  if (sessionUser.role !== "admin") redirect("/dashboard"); // server-side role check, not just hidden nav

  const allUsers = await db.query.users.findMany();
  const studentCount = allUsers.filter((u) => u.role === "student").length;
  const adminCount = allUsers.filter((u) => u.role === "admin").length;

  const llmConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const sandboxConfigured = Boolean(process.env.PISTON_URL);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin</h1>
          <p className="text-sm text-muted">Platform status — visible to admins only.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={<Users className="h-4 w-4" />} label="Total Users" value={allUsers.length} />
        <StatTile icon={<Users className="h-4 w-4" />} label="Students" value={studentCount} />
        <StatTile icon={<ShieldCheck className="h-4 w-4" />} label="Admins" value={adminCount} />
      </div>

      <Card>
        <CardHeader title="Configuration" subtitle="Optional integrations" />
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4" /> AI Tutor live model (ANTHROPIC_API_KEY)
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${llmConfigured ? "bg-success/15 text-success" : "bg-surface text-muted"}`}>
              {llmConfigured ? "Configured" : "Rule-based fallback"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <Container className="h-4 w-4" /> Server-side sandbox (PISTON_URL)
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sandboxConfigured ? "bg-success/15 text-success" : "bg-surface text-muted"}`}>
              {sandboxConfigured ? "Configured" : "Browser Pyodide only"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
