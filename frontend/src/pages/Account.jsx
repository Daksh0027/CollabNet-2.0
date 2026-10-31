import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck, Building2, Check, ExternalLink, FolderGit2, Globe,
  Hash, Layers, Loader2, LogOut, Pin, Plus, ShieldCheck, Sparkles, Target,
  Trash2, User, Video, X,
} from "lucide-react";
import { toast } from "sonner";
import api, { fmtNum, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NICHES = [
  "Tech & Gadgets",
  "Beauty & Skincare",
  "Health & Fitness",
  "Food & Cooking",
  "Gaming",
  "Travel",
  "Finance & Business",
  "Lifestyle",
  "Wellness"
];

const PRESET_SUB_NICHES = {
  "Tech & Gadgets": ["Smart Home", "Consumer Audio", "AI Tools", "Mechanical Keyboards", "PC Hardware", "Mobile"],
  "Beauty & Skincare": ["Dermatological Care", "Clean Beauty", "K-Beauty", "Routine Guides", "Haircare", "Cosmetics"],
  "Health & Fitness": ["Strength & Conditioning", "Running", "Nutrition & Supplements", "Calisthenics", "Recovery"],
  "Food & Cooking": ["Quick Recipes", "Kitchen Tech", "Specialty Coffee", "Street Food", "Baking", "Meal Prep"],
  "Gaming": ["PC Hardware", "Competitive Gaming", "Live Streams", "Indie Games", "Setup Tours"],
  "Travel": ["Solo Travel", "City Guides", "Cinematic Vlogs", "Hotels & Stays", "Digital Nomad"],
  "Finance & Business": ["Personal Finance", "Investing", "Fintech", "Entrepreneurship", "SaaS Tools"],
  "Lifestyle": ["Work-Life Balance", "Minimalism", "Urban Living", "Productivity"],
  "Wellness": ["Mental Health", "Sleep Optimization", "Holistic Wellness", "Mindfulness"]
};

const CONTENT_TYPES = [
  "Short-Form Video",
  "Dedicated Long-Form Video",
  "Integrated Segment",
  "Live Stream Placement",
  "Podcast Episode / Audio Read",
  "Carousel / Thought Leadership",
  "UGC Ad Production"
];

export const GENRE_COLORS = {
  "Tech & Gadgets": "bg-blue-500",
  "Beauty & Skincare": "bg-pink-500",
  "Health & Fitness": "bg-emerald-500",
  "Food & Cooking": "bg-amber-500",
  "Gaming": "bg-purple-500",
  "Travel": "bg-cyan-500",
  "Finance & Business": "bg-teal-500",
  "Lifestyle": "bg-rose-500",
  "Wellness": "bg-lime-500",
};

const SOCIAL_PLATFORMS = ["YouTube", "Instagram", "TikTok", "Twitch", "X (Twitter)", "LinkedIn"];

function SectionCard({ icon: Icon, title, description, action, children, testId, className }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6", className)} data-testid={testId}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          </div>
          {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, htmlFor, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">{label}</label>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function CountBadge({ value }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 font-num text-[10px] font-semibold text-muted-foreground">
      {value}
    </span>
  );
}

function ToggleChip({ active, onClick, children, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
      )}
    >
      {active ? <Check className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
      {children}
    </button>
  );
}

function EmptyRow({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

export default function Account() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const isCreator = user?.role === "creator";

  const [form, setForm] = useState({});
  const [selectedSubNiches, setSelectedSubNiches] = useState([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState([]);
  const [platformsList, setPlatformsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);

  const [addPlatformOpen, setAddPlatformOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState({ platform: "YouTube", handle: "", followers: "", posts_count: "", avg_views: "" });

  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    bio: "",
    genre: "Tech & Gadgets",
    tags: [],
    brand: "",
    deliverable_type: "Dedicated Long-Form Video",
    media_type: "video",
    media_url: "",
    embed_url: "",
    metrics: "",
    link: "",
    pinned: true,
  });
  const [projectTagInput, setProjectTagInput] = useState("");

  const [customSubNicheInput, setCustomSubNicheInput] = useState("");

  useEffect(() => {
    if (!user) return;
    const creator = user.creator || {};
    const company = user.company || {};
    if (user.role === "creator") {
      setForm({
        name: user.name || "",
        niche: creator.niche || "Tech & Gadgets",
        bio: creator.bio || "",
        pitch: creator.pitch || "",
        location: creator.location || "",
        rate_post: creator.rates?.post ?? "",
        rate_video: creator.rates?.video ?? "",
        rate_story: creator.rates?.story ?? "",
      });
      setSelectedSubNiches(creator.sub_niches || []);
      setSelectedContentTypes(creator.content_types || []);
      setPlatformsList(creator.platforms || []);
      setProjectsList(creator.projects || []);
    } else {
      setForm({
        name: user.name || "",
        company_name: company.name || "",
        industry: company.industry || "",
        website: company.website || "",
        employees: company.employees || "",
        about: company.about || "",
      });
    }
  }, [user]);

  const toggleSubNiche = (sn) => {
    setSelectedSubNiches((prev) =>
      prev.includes(sn) ? prev.filter((item) => item !== sn) : [...prev, sn]
    );
  };

  const addCustomSubNiche = () => {
    if (!customSubNicheInput.trim()) return;
    if (!selectedSubNiches.includes(customSubNicheInput.trim())) {
      setSelectedSubNiches([...selectedSubNiches, customSubNicheInput.trim()]);
    }
    setCustomSubNicheInput("");
  };

  const toggleContentType = (ct) => {
    setSelectedContentTypes((prev) =>
      prev.includes(ct) ? prev.filter((item) => item !== ct) : [...prev, ct]
    );
  };

  const handleAddPlatform = () => {
    if (!newPlatform.handle.trim()) {
      toast.error("Please enter account handle");
      return;
    }
    const clean = {
      platform: newPlatform.platform,
      handle: newPlatform.handle.startsWith("@") ? newPlatform.handle : `@${newPlatform.handle}`,
      followers: Number(newPlatform.followers) || 0,
      posts_count: Number(newPlatform.posts_count) || 0,
      avg_views: Number(newPlatform.avg_views) || 0,
      verified: true,
    };
    setPlatformsList((prev) => [...prev.filter((p) => p.platform !== clean.platform), clean]);
    setNewPlatform({ platform: "YouTube", handle: "", followers: "", posts_count: "", avg_views: "" });
    setAddPlatformOpen(false);
    toast.success(`${clean.platform} account added to portfolio`);
  };

  const handleRemovePlatform = (platName) => {
    setPlatformsList((prev) => prev.filter((p) => p.platform !== platName));
  };

  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      toast.error("Project title is required");
      return;
    }
    const bioText = (newProject.bio || newProject.description || "").trim();
    if (!bioText) {
      toast.error("Project bio/summary is required");
      return;
    }
    const item = {
      project_id: `prj_${Date.now()}`,
      title: newProject.title.trim(),
      bio: bioText,
      description: bioText,
      genre: newProject.genre || form.niche || "Tech & Gadgets",
      tags: newProject.tags || [],
      brand: newProject.brand?.trim() || "Independent Project",
      deliverable_type: newProject.deliverable_type,
      media_type: newProject.media_type,
      media_url:
        newProject.media_url ||
        "https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&auto=format&fit=crop&q=80",
      embed_url: newProject.embed_url || "",
      metrics: newProject.metrics || "1.2M Views · 8.4% Engagement",
      link: newProject.link || "",
      pinned: newProject.pinned ?? true,
      date: new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    };
    setProjectsList((prev) => [item, ...prev]);
    setNewProject({
      title: "",
      bio: "",
      genre: form.niche || "Tech & Gadgets",
      tags: [],
      brand: "",
      deliverable_type: "Dedicated Long-Form Video",
      media_type: "video",
      media_url: "",
      embed_url: "",
      metrics: "",
      link: "",
      pinned: true,
    });
    setProjectTagInput("");
    setAddProjectOpen(false);
    toast.success("Project added to profile showcase");
  };

  const handleTogglePinProject = (projectId) => {
    setProjectsList((prev) =>
      prev.map((p) => (p.project_id === projectId ? { ...p, pinned: !p.pinned } : p))
    );
  };

  const handleAddProjectTag = (tagToAdd) => {
    const raw = tagToAdd || projectTagInput;
    const clean = raw.trim().replace(/^#/, "");
    if (!clean) return;
    if (newProject.tags?.includes(clean)) {
      toast.error("Tag already added");
      return;
    }
    setNewProject((prev) => ({
      ...prev,
      tags: [...(prev.tags || []), clean],
    }));
    setProjectTagInput("");
  };

  const handleRemoveProjectTag = (tagToRemove) => {
    setNewProject((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tagToRemove),
    }));
  };

  const handleRemoveProject = (projectId) => {
    setProjectsList((prev) => prev.filter((p) => p.project_id !== projectId));
  };

  const save = async () => {
    try {
      const payload = isCreator
        ? {
            name: form.name,
            creator: {
              niche: form.niche,
              sub_niches: selectedSubNiches,
              content_types: selectedContentTypes,
              platforms: platformsList,
              projects: projectsList,
              bio: form.bio,
              pitch: form.pitch,
              location: form.location,
              rates: {
                post: Number(form.rate_post) || 0,
                video: Number(form.rate_video) || 0,
                story: Number(form.rate_story) || 0,
              },
            },
          }
        : {
            name: form.name,
            company: {
              name: form.company_name,
              industry: form.industry,
              website: form.website,
              employees: Number(form.employees) || 0,
              about: form.about,
            },
          };
      await api.put("/profile", payload);
      await refresh();
      toast.success("Profile & Portfolio saved successfully");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not save profile");
    }
  };

  const availableSubNiches = PRESET_SUB_NICHES[form.niche] || [];
  const allSubNiches = [...availableSubNiches, ...selectedSubNiches.filter((sn) => !availableSubNiches.includes(sn))];

  return (
    <div data-testid="account-page" className="space-y-6">
      <PageHead title="Profile" sub="Manage your public profile, channels and portfolio." />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6" data-testid="profile-summary-card">
        <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar user={user} className="h-14 w-14 shrink-0 rounded-full text-sm" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-display text-lg font-bold text-foreground">{user?.display_name}</p>
                {user?.verified ? (
                  <span
                    className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
                    data-testid="verified-pill"
                  >
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{user?.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium capitalize text-foreground">{user?.role}</span>
                <span className="mx-1.5 text-border">·</span>
                Member since {fmtDate(user?.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!user?.verified ? (
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => navigate("/verify")} data-testid="start-verification-button">
                Verify now
              </Button>
            ) : null}
            <Button className="rounded-lg px-4 font-semibold" onClick={save} data-testid="profile-save-button">
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <SectionCard
            icon={isCreator ? User : Building2}
            title={isCreator ? "Profile details" : "Company details"}
            description={isCreator ? "Your public identity and story." : "How sponsors see your company."}
            testId="profile-edit-card"
          >
            {isCreator ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Display name" htmlFor="profile-name">
                    <Input
                      id="profile-name"
                      value={form.name || ""}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your creator name"
                      data-testid="profile-name-input"
                    />
                  </Field>
                  <Field label="Primary niche" htmlFor="profile-niche">
                    <Select value={form.niche} onValueChange={(v) => setForm({ ...form, niche: v })}>
                      <SelectTrigger id="profile-niche" data-testid="profile-niche-select">
                        <SelectValue placeholder="Select primary niche" />
                      </SelectTrigger>
                      <SelectContent>
                        {NICHES.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Location" htmlFor="profile-location">
                  <Input
                    id="profile-location"
                    value={form.location || ""}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Austin, USA"
                    data-testid="profile-location-input"
                  />
                </Field>

                <Field label="Bio" htmlFor="profile-bio">
                  <Textarea
                    id="profile-bio"
                    value={form.bio || ""}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="What you create and who your audience is"
                    rows={3}
                    data-testid="profile-bio-input"
                  />
                </Field>

                <Field label="Sponsor pitch" htmlFor="profile-pitch">
                  <Textarea
                    id="profile-pitch"
                    value={form.pitch || ""}
                    onChange={(e) => setForm({ ...form, pitch: e.target.value })}
                    placeholder="Why sponsors should work with you"
                    rows={2}
                    data-testid="profile-pitch-input"
                  />
                </Field>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Contact name" htmlFor="profile-name">
                    <Input
                      id="profile-name"
                      value={form.name || ""}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Contact person"
                      data-testid="profile-name-input"
                    />
                  </Field>
                  <Field label="Company name" htmlFor="profile-company-name">
                    <Input
                      id="profile-company-name"
                      value={form.company_name || ""}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                      placeholder="Company name"
                      data-testid="profile-company-name-input"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Industry" htmlFor="profile-industry">
                    <Input
                      id="profile-industry"
                      value={form.industry || ""}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      placeholder="Industry"
                      data-testid="profile-industry-input"
                    />
                  </Field>
                  <Field label="Website" htmlFor="profile-website">
                    <Input
                      id="profile-website"
                      value={form.website || ""}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="https://"
                      data-testid="profile-website-input"
                    />
                  </Field>
                </div>

                <Field label="Employees" htmlFor="profile-employees">
                  <Input
                    id="profile-employees"
                    type="number"
                    value={form.employees ?? ""}
                    onChange={(e) => setForm({ ...form, employees: e.target.value })}
                    placeholder="Team size"
                    data-testid="profile-employees-input"
                  />
                </Field>

                <Field label="About the company" htmlFor="profile-about">
                  <Textarea
                    id="profile-about"
                    value={form.about || ""}
                    onChange={(e) => setForm({ ...form, about: e.target.value })}
                    placeholder="Mission and campaign objectives"
                    rows={4}
                    data-testid="profile-about-input"
                  />
                </Field>
              </div>
            )}
          </SectionCard>

          {isCreator ? (
            <>
              <SectionCard
                icon={Target}
                title="Focus areas"
                description="Topics that describe your content."
                action={<CountBadge value={selectedSubNiches.length} />}
              >
                <div className="flex flex-wrap gap-2">
                  {allSubNiches.map((sn) => (
                    <ToggleChip key={sn} active={selectedSubNiches.includes(sn)} onClick={() => toggleSubNiche(sn)}>
                      {sn}
                    </ToggleChip>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Input
                    placeholder="Add a custom focus area"
                    value={customSubNicheInput}
                    onChange={(e) => setCustomSubNicheInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSubNiche())}
                    className="h-9 text-xs"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={addCustomSubNiche} className="h-9 shrink-0 rounded-lg">
                    Add
                  </Button>
                </div>
              </SectionCard>

              <SectionCard
                icon={Layers}
                title="Deliverables"
                description="Formats you offer sponsors."
                action={<CountBadge value={selectedContentTypes.length} />}
              >
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((ct) => (
                    <ToggleChip key={ct} active={selectedContentTypes.includes(ct)} onClick={() => toggleContentType(ct)}>
                      {ct}
                    </ToggleChip>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                icon={Sparkles}
                title="Deliverable rates"
                description="Starting rates in USD for deliverables."
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Post / Carousel" htmlFor="profile-rate-post">
                    <Input
                      id="profile-rate-post"
                      type="number"
                      value={form.rate_post ?? ""}
                      onChange={(e) => setForm({ ...form, rate_post: e.target.value })}
                      placeholder="0"
                      data-testid="profile-rate-post-input"
                    />
                  </Field>
                  <Field label="Dedicated video" htmlFor="profile-rate-video">
                    <Input
                      id="profile-rate-video"
                      type="number"
                      value={form.rate_video ?? ""}
                      onChange={(e) => setForm({ ...form, rate_video: e.target.value })}
                      placeholder="0"
                      data-testid="profile-rate-video-input"
                    />
                  </Field>
                  <Field label="Story / Status" htmlFor="profile-rate-story">
                    <Input
                      id="profile-rate-story"
                      type="number"
                      value={form.rate_story ?? ""}
                      onChange={(e) => setForm({ ...form, rate_story: e.target.value })}
                      placeholder="0"
                      data-testid="profile-rate-story-input"
                    />
                  </Field>
                </div>
              </SectionCard>
            </>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-5">
          {isCreator ? (
            <SectionCard
              icon={Globe}
              title="Channels"
              action={(
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-xs font-semibold"
                  onClick={() => setAddPlatformOpen(true)}
                  data-testid="add-platform-button"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              )}
              testId="social-accounts-panel"
            >
              {!platformsList.length ? (
                <EmptyRow>No channels connected yet.</EmptyRow>
              ) : (
                <div className="space-y-2">
                  {platformsList.map((p) => (
                    <div
                      key={p.platform}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {p.platform[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-foreground">{p.platform}</span>
                          <span className="truncate text-xs text-muted-foreground">{p.handle}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span><strong className="font-medium text-foreground">{fmtNum(p.followers)}</strong> followers</span>
                          {p.posts_count ? <span><strong className="font-medium text-foreground">{p.posts_count}</strong> posts</span> : null}
                          {p.avg_views ? <span><strong className="font-medium text-foreground">{fmtNum(p.avg_views)}</strong> avg views</span> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePlatform(p.platform)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Remove channel"
                        aria-label={`Remove ${p.platform}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs" data-testid="session-card">
            <div className="flex min-w-0 items-center gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Active session</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={logout} data-testid="account-logout-button">
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        </div>
      </div>

      {isCreator ? (
        <SectionCard
          icon={FolderGit2}
          title="Portfolio"
          description="Past projects and case studies."
          action={(
            <Button
              size="sm"
              className="rounded-lg text-xs font-semibold"
              onClick={() => setAddProjectOpen(true)}
              data-testid="add-project-button"
            >
              <Plus className="h-3.5 w-3.5" /> Add project
            </Button>
          )}
          testId="portfolio-projects-panel"
        >
          {!projectsList.length ? (
            <EmptyRow>
              <FolderGit2 className="mx-auto mb-2 h-7 w-7 text-muted-foreground/60" />
              <p className="font-medium text-foreground">No projects yet</p>
              <p className="mt-1">Add your best collaborations and case studies.</p>
            </EmptyRow>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projectsList.map((prj) => {
                const genreColor = GENRE_COLORS[prj.genre] || "bg-primary";
                const isPinned = prj.pinned ?? true;
                return (
                  <article
                    key={prj.project_id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
                    data-testid={`project-item-${prj.project_id}`}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                      {prj.media_url ? (
                        <img src={prj.media_url} alt={prj.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Video className="h-6 w-6" />
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
                        {prj.deliverable_type?.split(" ")[0] || "Video"}
                      </span>
                      <div className="absolute right-2 top-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePinProject(prj.project_id)}
                          className={cn(
                            "rounded-md border border-border/60 bg-background/90 p-1.5 backdrop-blur transition-colors",
                            isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                          )}
                          title={isPinned ? "Unpin project" : "Pin project"}
                          aria-label={isPinned ? "Unpin project" : "Pin project"}
                        >
                          <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-current")} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProject(prj.project_id)}
                          className="rounded-md border border-border/60 bg-background/90 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-destructive"
                          title="Delete project"
                          aria-label="Delete project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{prj.title}</h3>
                        {isPinned ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <Pin className="h-2.5 w-2.5 fill-current" /> Pinned
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {prj.brand || "Independent"}
                        <span className="mx-1 text-border">·</span>
                        {prj.deliverable_type || "Video"}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {prj.bio || prj.description}
                      </p>

                      {prj.tags?.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {prj.tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          <span className={`h-2 w-2 rounded-full ${genreColor}`} />
                          {prj.genre || "General"}
                        </span>
                        <div className="flex items-center gap-2.5">
                          {prj.metrics ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Sparkles className="h-3 w-3" />
                              {prj.metrics}
                            </span>
                          ) : null}
                          {prj.link ? (
                            <a
                              href={prj.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : null}

      <Dialog open={addPlatformOpen} onOpenChange={setAddPlatformOpen}>
        <DialogContent data-testid="add-platform-dialog">
          <DialogHeader>
            <DialogTitle>Add channel</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 text-xs">
            <Field label="Platform">
              <Select value={newPlatform.platform} onValueChange={(v) => setNewPlatform({ ...newPlatform, platform: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Handle">
              <Input
                placeholder="@handle"
                value={newPlatform.handle}
                onChange={(e) => setNewPlatform({ ...newPlatform, handle: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Followers">
                <Input
                  type="number"
                  placeholder="250000"
                  value={newPlatform.followers}
                  onChange={(e) => setNewPlatform({ ...newPlatform, followers: e.target.value })}
                />
              </Field>
              <Field label="Posts">
                <Input
                  type="number"
                  placeholder="180"
                  value={newPlatform.posts_count}
                  onChange={(e) => setNewPlatform({ ...newPlatform, posts_count: e.target.value })}
                />
              </Field>
              <Field label="Avg views">
                <Input
                  type="number"
                  placeholder="85000"
                  value={newPlatform.avg_views}
                  onChange={(e) => setNewPlatform({ ...newPlatform, avg_views: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-lg" onClick={handleAddPlatform}>
              Add channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto" data-testid="add-project-dialog">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-primary" />
              <DialogTitle>Add project</DialogTitle>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Showcase a past collaboration or case study.</p>
          </DialogHeader>

          <div className="mt-2 grid gap-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Project title *">
                <Input
                  placeholder="e.g. Smart Desk Tour 2026"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  data-testid="project-title-input"
                />
              </Field>
              <Field label="Client / brand">
                <Input
                  placeholder="e.g. Autonomous AI"
                  value={newProject.brand}
                  onChange={(e) => setNewProject({ ...newProject, brand: e.target.value })}
                  data-testid="project-brand-input"
                />
              </Field>
            </div>

            <Field label="Summary *">
              <Textarea
                placeholder="What the project was about and how it performed"
                rows={3}
                value={newProject.bio}
                onChange={(e) => setNewProject({ ...newProject, bio: e.target.value })}
                data-testid="project-bio-input"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Genre">
                <Select
                  value={newProject.genre}
                  onValueChange={(v) => setNewProject({ ...newProject, genre: v })}
                >
                  <SelectTrigger data-testid="project-genre-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHES.map((n) => (
                      <SelectItem key={n} value={n}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${GENRE_COLORS[n] || "bg-primary"}`} />
                          {n}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Deliverable">
                <Select
                  value={newProject.deliverable_type}
                  onValueChange={(v) => setNewProject({ ...newProject, deliverable_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {ct}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Hash className="h-3 w-3 text-muted-foreground" /> Tags
                </span>
                <CountBadge value={newProject.tags?.length || 0} />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a topic"
                  value={projectTagInput}
                  onChange={(e) => setProjectTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddProjectTag();
                    }
                  }}
                  className="h-9 text-xs"
                  data-testid="project-tag-input"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold"
                  onClick={() => handleAddProjectTag()}
                  data-testid="add-tag-button"
                >
                  Add
                </Button>
              </div>

              {PRESET_SUB_NICHES[newProject.genre]?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SUB_NICHES[newProject.genre].slice(0, 5).map((sug) => {
                    const already = newProject.tags?.includes(sug);
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleAddProjectTag(sug)}
                        disabled={already}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] transition-colors",
                          already
                            ? "cursor-not-allowed border-transparent bg-muted text-muted-foreground opacity-50"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                      >
                        {sug}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {newProject.tags?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                  {newProject.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveProjectTag(t)}
                        className="rounded-full transition-colors hover:text-destructive"
                        aria-label={`Remove tag ${t}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Metrics">
                <Input
                  placeholder="e.g. 1.4M views · 9.2% CTR"
                  value={newProject.metrics}
                  onChange={(e) => setNewProject({ ...newProject, metrics: e.target.value })}
                />
              </Field>
              <Field label="Live link">
                <Input
                  placeholder="https://"
                  value={newProject.link}
                  onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Thumbnail URL">
                <Input
                  placeholder="https://images..."
                  value={newProject.media_url}
                  onChange={(e) => setNewProject({ ...newProject, media_url: e.target.value })}
                />
              </Field>
              <Field label="Embed URL">
                <Input
                  placeholder="Optional"
                  value={newProject.embed_url}
                  onChange={(e) => setNewProject({ ...newProject, embed_url: e.target.value })}
                />
              </Field>
            </div>

            <label htmlFor="pinProjectCheckbox" className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-card p-3">
              <input
                type="checkbox"
                id="pinProjectCheckbox"
                checked={newProject.pinned}
                onChange={(e) => setNewProject({ ...newProject, pinned: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Pin className="h-3 w-3 text-primary fill-current" /> Pin to profile
              </span>
            </label>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" className="rounded-lg" onClick={() => setAddProjectOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-lg font-semibold" onClick={handleAddProject} data-testid="submit-project-button">
              Add project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
