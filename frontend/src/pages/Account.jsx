import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, FileText, Loader2, LogOut, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar, StatusPill } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Account() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isCreator = user?.role === "creator";
  const c = user?.creator || {};
  const co = user?.company || {};

  const [form, setForm] = useState({});
  useEffect(() => {
    if (user) {
      setForm(isCreator
        ? {
            name: user.name || "", niche: c.niche || "", bio: c.bio || "", pitch: c.pitch || "",
            location: c.location || "", rate_post: c.rates?.post ?? "", rate_video: c.rates?.video ?? "", rate_story: c.rates?.story ?? "",
          }
        : {
            name: user.name || "", company_name: co.name || "", industry: co.industry || "",
            website: co.website || "", employees: co.employees || "", about: co.about || "",
          });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  const save = async () => {
    try {
      const payload = isCreator
        ? { name: form.name, creator: { niche: form.niche, bio: form.bio, pitch: form.pitch, location: form.location, rates: { post: Number(form.rate_post) || 0, video: Number(form.rate_video) || 0, story: Number(form.rate_story) || 0 } } }
        : { name: form.name, company: { name: form.company_name, industry: form.industry, website: form.website, employees: Number(form.employees) || 0, about: form.about } };
      await api.put("/profile", payload);
      await refresh();
      toast.success("Profile saved");
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not save"); }
  };

  return (
    <div data-testid="account-page">
      <PageHead title="Account" sub="Profile, verification and templates." />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6" data-testid="profile-summary-card">
            <div className="flex items-center gap-4">
              <UserAvatar user={user} className="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold">{user?.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">Member since {fmtDate(user?.created_at)}</p>
              </div>
              {user?.verified ? (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400" data-testid="verified-pill">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <Button size="sm" className="rounded-full" onClick={() => navigate("/verify")} data-testid="start-verification-button">Verify now</Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6" data-testid="profile-edit-card">
            <p className="eyebrow mb-4">{isCreator ? "Creator profile" : "Company profile"}</p>
            <div className="grid gap-3">
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isCreator ? "Your name" : "Contact person"} data-testid="profile-name-input" />
              {isCreator ? (
                <>
                  <Input value={form.niche || ""} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="Niche (e.g. Tech & Gadgets)" data-testid="profile-niche-input" />
                  <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" data-testid="profile-location-input" />
                  <Textarea value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" rows={2} data-testid="profile-bio-input" />
                  <Textarea value={form.pitch || ""} onChange={(e) => setForm({ ...form, pitch: e.target.value })} placeholder="Sponsor pitch — why brands pick you" rows={2} data-testid="profile-pitch-input" />
                  <div className="grid grid-cols-3 gap-3">
                    <Input type="number" value={form.rate_post ?? ""} onChange={(e) => setForm({ ...form, rate_post: e.target.value })} placeholder="Post $" data-testid="profile-rate-post-input" />
                    <Input type="number" value={form.rate_video ?? ""} onChange={(e) => setForm({ ...form, rate_video: e.target.value })} placeholder="Video $" data-testid="profile-rate-video-input" />
                    <Input type="number" value={form.rate_story ?? ""} onChange={(e) => setForm({ ...form, rate_story: e.target.value })} placeholder="Story $" data-testid="profile-rate-story-input" />
                  </div>
                </>
              ) : (
                <>
                  <Input value={form.company_name || ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Company name" data-testid="profile-company-name-input" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={form.industry || ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Industry" data-testid="profile-industry-input" />
                    <Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" data-testid="profile-website-input" />
                  </div>
                  <Input type="number" value={form.employees ?? ""} onChange={(e) => setForm({ ...form, employees: e.target.value })} placeholder="Employees" data-testid="profile-employees-input" />
                  <Textarea value={form.about || ""} onChange={(e) => setForm({ ...form, about: e.target.value })} placeholder="About the company" rows={3} data-testid="profile-about-input" />
                </>
              )}
              <Button className="rounded-full" onClick={save} data-testid="profile-save-button">Save profile</Button>
            </div>
          </div>
        </div>

        <TemplatesPanel />

        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2" data-testid="session-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Session</p>
                <p className="text-xs text-muted-foreground">Signed in as {user?.email} · role: {user?.role}</p>
              </div>
            </div>
            <Button variant="secondary" className="rounded-full text-red-600 dark:text-red-400" onClick={logout} data-testid="account-logout-button">
              <LogOut className="mr-1 h-4 w-4" /> Log out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplatesPanel() {
  const qc = useQueryClient();
  const { data: templates } = useQuery({ queryKey: ["templates"], queryFn: async () => (await api.get("/templates")).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "brief", title: "", body: "" });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.title || !form.body) { toast.error("Title and body required"); return; }
    setBusy(true);
    try {
      await api.post("/templates", form);
      toast.success("Template saved");
      setOpen(false);
      setForm({ kind: "brief", title: "", body: "" });
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch (e) { toast.error("Could not save"); }
    finally { setBusy(false); }
  };

  const remove = async (tplId) => {
    try {
      await api.delete(`/templates/${tplId}`);
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch (e) { toast.error("Could not delete"); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6" data-testid="templates-panel">
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Template library</p>
        <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setOpen(true)} data-testid="new-template-button">
          <Plus className="mr-1 h-3.5 w-3.5" /> New
        </Button>
      </div>
      {!templates?.length ? (
        <p className="text-xs text-muted-foreground" data-testid="templates-empty">No templates yet — save reusable briefs, outreach messages and agreements.</p>
      ) : (
        <div className="space-y-3" data-testid="templates-list">
          {templates.map((t) => (
            <div key={t.tpl_id} className="rounded-xl border border-border p-3" data-testid={`template-${t.tpl_id}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="eyebrow mt-0.5">{t.kind}</p>
                </div>
                <button onClick={() => remove(t.tpl_id)} className="text-muted-foreground hover:text-red-400" data-testid={`template-delete-${t.tpl_id}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="new-template-dialog">
          <DialogHeader><DialogTitle>New template</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger data-testid="template-kind-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief</SelectItem>
                <SelectItem value="outreach">Outreach message</SelectItem>
                <SelectItem value="agreement">Agreement</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="template-title-input" />
            <Textarea placeholder="Body" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} data-testid="template-body-input" />
          </div>
          <DialogFooter>
            <Button className="rounded-full" onClick={create} disabled={busy} data-testid="template-submit-button">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
