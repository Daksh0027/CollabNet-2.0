import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck, FileText, Loader2, LogOut, Plus, ShieldCheck, Trash2,
  ExternalLink, Video, Image as ImageIcon, Briefcase, Globe,
  Check, X, Sparkles, Building2, User
} from "lucide-react";
import { toast } from "sonner";
import api, { fmtMoney, fmtNum, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHead, UserAvatar } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

const COMMERCIAL_TERMS = [
  "100% Escrow Upfront",
  "1-Round Revision Guarantee",
  "30-Day Paid Whitelisting Available",
  "Organic Posting Only",
  "Base + Affiliate Performance",
  "Retainer / Ambassador Available"
];

const SOCIAL_PLATFORMS = ["YouTube", "Instagram", "TikTok", "Twitch", "X (Twitter)", "LinkedIn"];

export default function Account() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const isCreator = user?.role === "creator";
  const c = user?.creator || {};
  const co = user?.company || {};

  // Form states
  const [form, setForm] = useState({});
  const [selectedSubNiches, setSelectedSubNiches] = useState([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState([]);
  const [selectedCommercialTerms, setSelectedCommercialTerms] = useState([]);
  const [platformsList, setPlatformsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);

  // Dialogs
  const [addPlatformOpen, setAddPlatformOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState({ platform: "YouTube", handle: "", followers: "", posts_count: "", avg_views: "" });

  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    brand: "",
    deliverable_type: "Dedicated Long-Form Video",
    media_type: "video",
    media_url: "",
    embed_url: "",
    metrics: "",
    link: "",
    description: "",
  });

  const [customSubNicheInput, setCustomSubNicheInput] = useState("");

  useEffect(() => {
    if (user) {
      if (isCreator) {
        setForm({
          name: user.name || "",
          niche: c.niche || "Tech & Gadgets",
          bio: c.bio || "",
          pitch: c.pitch || "",
          location: c.location || "",
          rate_post: c.rates?.post ?? "",
          rate_video: c.rates?.video ?? "",
          rate_story: c.rates?.story ?? "",
        });
        setSelectedSubNiches(c.sub_niches || []);
        setSelectedContentTypes(c.content_types || []);
        setSelectedCommercialTerms(c.commercial_terms || []);
        setPlatformsList(c.platforms || []);
        setProjectsList(c.projects || []);
      } else {
        setForm({
          name: user.name || "",
          company_name: co.name || "",
          industry: co.industry || "",
          website: co.website || "",
          employees: co.employees || "",
          about: co.about || "",
        });
        setSelectedCommercialTerms(co.commercial_terms || []);
      }
    }
  }, [user?.user_id]);

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

  const toggleCommercialTerm = (term) => {
    setSelectedCommercialTerms((prev) =>
      prev.includes(term) ? prev.filter((item) => item !== term) : [...prev, term]
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
    // Replace if same platform exists, otherwise add
    setPlatformsList((prev) => [...prev.filter((p) => p.platform !== clean.platform), clean]);
    setNewPlatform({ platform: "YouTube", handle: "", followers: "", posts_count: "", avg_views: "" });
    setAddPlatformOpen(false);
    toast.success(`${clean.platform} account added to portfolio`);
  };

  const handleRemovePlatform = (platName) => {
    setPlatformsList((prev) => prev.filter((p) => p.platform !== platName));
  };

  const handleAddProject = () => {
    if (!newProject.title.trim() || !newProject.brand.trim()) {
      toast.error("Project title and brand are required");
      return;
    }
    const item = {
      project_id: `prj_${Date.now()}`,
      title: newProject.title,
      brand: newProject.brand,
      deliverable_type: newProject.deliverable_type,
      media_type: newProject.media_type,
      media_url:
        newProject.media_url ||
        "https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&auto=format&fit=crop&q=80",
      embed_url: newProject.embed_url || "",
      metrics: newProject.metrics || "1.2M Views · 8.4% Engagement",
      link: newProject.link || "",
      description: newProject.description,
      date: new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    };
    setProjectsList((prev) => [item, ...prev]);
    setNewProject({
      title: "",
      brand: "",
      deliverable_type: "Dedicated Long-Form Video",
      media_type: "video",
      media_url: "",
      embed_url: "",
      metrics: "",
      link: "",
      description: "",
    });
    setAddProjectOpen(false);
    toast.success("Project added to portfolio showcase");
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
              commercial_terms: selectedCommercialTerms,
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
              commercial_terms: selectedCommercialTerms,
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

  return (
    <div data-testid="account-page" className="space-y-8">
      <PageHead title="Profile & Portfolio" sub="Manage your media kit, channels, preset tags, and project showcase." />

      {/* Profile Header Summary */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs" data-testid="profile-summary-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} className="h-16 w-16 rounded-2xl ring-2 ring-primary/20" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display text-lg font-bold text-foreground">{user?.display_name}</p>
                {user?.verified && (
                  <span
                    className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400"
                    data-testid="verified-pill"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Role: <span className="capitalize font-semibold text-foreground">{user?.role}</span> · Member since{" "}
                {fmtDate(user?.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!user?.verified && (
              <Button size="sm" className="rounded-full" onClick={() => navigate("/verify")} data-testid="start-verification-button">
                Verify now
              </Button>
            )}
            <Button className="rounded-full px-6 font-semibold" onClick={save} data-testid="profile-save-button">
              Save All Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Basic Details, Rates & Presets */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs" data-testid="profile-edit-card">
            <p className="eyebrow mb-4">{isCreator ? "Creator Media Kit Details" : "Company Profile Details"}</p>
            <div className="grid gap-4">
              <div>
                <label className="eyebrow mb-1 block">Display Name</label>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={isCreator ? "Your creator name" : "Contact person"}
                  data-testid="profile-name-input"
                />
              </div>

              {isCreator ? (
                <>
                  {/* Primary Niche Presets */}
                  <div>
                    <label className="eyebrow mb-1.5 block">Primary Genre / Niche</label>
                    <Select value={form.niche} onValueChange={(v) => setForm({ ...form, niche: v })}>
                      <SelectTrigger data-testid="profile-niche-select">
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
                  </div>

                  {/* Sub-Niches Preset Chips */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="eyebrow">Sub-Niches & Focus Tags (Click presets to toggle)</label>
                      <span className="text-[11px] text-muted-foreground">{selectedSubNiches.length} selected</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {availableSubNiches.map((sn) => {
                        const active = selectedSubNiches.includes(sn);
                        return (
                          <button
                            key={sn}
                            type="button"
                            onClick={() => toggleSubNiche(sn)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              active
                                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {active ? "✓ " : "+ "}
                            {sn}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Sub-niche input */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <Input
                        placeholder="Add custom sub-niche tag…"
                        value={customSubNicheInput}
                        onChange={(e) => setCustomSubNicheInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSubNiche())}
                        className="h-8 text-xs"
                      />
                      <Button type="button" size="sm" variant="secondary" onClick={addCustomSubNiche} className="h-8 rounded-full text-xs">
                        Add Tag
                      </Button>
                    </div>
                  </div>

                  {/* Content Formats / Deliverables Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="eyebrow">Content Deliverables Offered (Click to toggle)</label>
                      <span className="text-[11px] text-muted-foreground">{selectedContentTypes.length} selected</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CONTENT_TYPES.map((ct) => {
                        const active = selectedContentTypes.includes(ct);
                        return (
                          <button
                            key={ct}
                            type="button"
                            onClick={() => toggleContentType(ct)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              active
                                ? "bg-secondary text-secondary-foreground ring-1 ring-primary/40 font-semibold"
                                : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {active ? "✓ " : "+ "}
                            {ct}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commercial Terms Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="eyebrow">Commercial & Working Terms (Click to toggle)</label>
                      <span className="text-[11px] text-muted-foreground">{selectedCommercialTerms.length} selected</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMERCIAL_TERMS.map((term) => {
                        const active = selectedCommercialTerms.includes(term);
                        return (
                          <button
                            key={term}
                            type="button"
                            onClick={() => toggleCommercialTerm(term)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              active
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-semibold"
                                : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {active ? "✓ " : "+ "}
                            {term}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="eyebrow mb-1 block">Location</label>
                    <Input
                      value={form.location || ""}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Austin, USA"
                      data-testid="profile-location-input"
                    />
                  </div>

                  <div>
                    <label className="eyebrow mb-1 block">Bio</label>
                    <Textarea
                      value={form.bio || ""}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Short bio explaining what you create and who your audience is"
                      rows={2}
                      data-testid="profile-bio-input"
                    />
                  </div>

                  <div>
                    <label className="eyebrow mb-1 block">Sponsor Pitch</label>
                    <Textarea
                      value={form.pitch || ""}
                      onChange={(e) => setForm({ ...form, pitch: e.target.value })}
                      placeholder="Why sponsors should pick you (e.g. high retention, loyal community, native integrations)"
                      rows={2}
                      data-testid="profile-pitch-input"
                    />
                  </div>

                  <div>
                    <label className="eyebrow mb-1.5 block">Standard Rates ($ USD)</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Post / Carousel</span>
                        <Input
                          type="number"
                          value={form.rate_post ?? ""}
                          onChange={(e) => setForm({ ...form, rate_post: e.target.value })}
                          placeholder="Post $"
                          data-testid="profile-rate-post-input"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Dedicated Video</span>
                        <Input
                          type="number"
                          value={form.rate_video ?? ""}
                          onChange={(e) => setForm({ ...form, rate_video: e.target.value })}
                          placeholder="Video $"
                          data-testid="profile-rate-video-input"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Story / Status</span>
                        <Input
                          type="number"
                          value={form.rate_story ?? ""}
                          onChange={(e) => setForm({ ...form, rate_story: e.target.value })}
                          placeholder="Story $"
                          data-testid="profile-rate-story-input"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="eyebrow mb-1 block">Company Name</label>
                    <Input
                      value={form.company_name || ""}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                      placeholder="Company name"
                      data-testid="profile-company-name-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="eyebrow mb-1 block">Industry</label>
                      <Input
                        value={form.industry || ""}
                        onChange={(e) => setForm({ ...form, industry: e.target.value })}
                        placeholder="Industry"
                        data-testid="profile-industry-input"
                      />
                    </div>
                    <div>
                      <label className="eyebrow mb-1 block">Website</label>
                      <Input
                        value={form.website || ""}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        placeholder="Website"
                        data-testid="profile-website-input"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="eyebrow">Company Commercial Terms</label>
                      <span className="text-[11px] text-muted-foreground">{selectedCommercialTerms.length} selected</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMERCIAL_TERMS.map((term) => {
                        const active = selectedCommercialTerms.includes(term);
                        return (
                          <button
                            key={term}
                            type="button"
                            onClick={() => toggleCommercialTerm(term)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              active
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-semibold"
                                : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {active ? "✓ " : "+ "}
                            {term}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="eyebrow mb-1 block">Employees</label>
                    <Input
                      type="number"
                      value={form.employees ?? ""}
                      onChange={(e) => setForm({ ...form, employees: e.target.value })}
                      placeholder="Employees"
                      data-testid="profile-employees-input"
                    />
                  </div>

                  <div>
                    <label className="eyebrow mb-1 block">About the Company</label>
                    <Textarea
                      value={form.about || ""}
                      onChange={(e) => setForm({ ...form, about: e.target.value })}
                      placeholder="About company mission and campaign objectives"
                      rows={3}
                      data-testid="profile-about-input"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Social Channels & Portfolio Showcase (Behance Style) */}
        <div className="space-y-6">
          {isCreator && (
            <>
              {/* Connected Social Accounts */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs" data-testid="social-accounts-panel">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">Connected Channels</h3>
                    <p className="text-xs text-muted-foreground">Platforms that power your live audience reach.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs font-semibold"
                    onClick={() => setAddPlatformOpen(true)}
                    data-testid="add-platform-button"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Channel
                  </Button>
                </div>

                {!platformsList.length ? (
                  <p className="text-xs text-muted-foreground">No social channels linked yet. Add your channels to display your reach.</p>
                ) : (
                  <div className="space-y-2.5">
                    {platformsList.map((p) => (
                      <div
                        key={p.platform}
                        className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                            {p.platform[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground">{p.platform}</span>
                              <span className="text-muted-foreground">{p.handle}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                              <span>
                                <strong className="text-foreground">{fmtNum(p.followers)}</strong> followers
                              </span>
                              {p.posts_count ? (
                                <span>
                                  <strong className="text-foreground">{p.posts_count}</strong> posts
                                </span>
                              ) : null}
                              {p.avg_views ? (
                                <span>
                                  <strong className="text-foreground">{fmtNum(p.avg_views)}</strong> avg views
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePlatform(p.platform)}
                          className="text-muted-foreground hover:text-red-500 p-1 transition-colors"
                          title="Remove platform"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Behance-Style Projects / Portfolio Showcase */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs" data-testid="portfolio-projects-panel">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">Portfolio & Featured Projects</h3>
                    <p className="text-xs text-muted-foreground">Case studies and content samples sponsors review on your media kit.</p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full text-xs font-semibold"
                    onClick={() => setAddProjectOpen(true)}
                    data-testid="add-project-button"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Project
                  </Button>
                </div>

                {!projectsList.length ? (
                  <p className="text-xs text-muted-foreground">
                    No portfolio projects added yet. Showcase your past sponsor collabs, videos, and stats here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {projectsList.map((prj) => (
                      <div
                        key={prj.project_id}
                        className="group flex flex-col sm:flex-row gap-3.5 rounded-xl border border-border bg-background/50 p-3.5 text-xs transition-all hover:border-primary/40"
                        data-testid={`project-item-${prj.project_id}`}
                      >
                        {/* Thumbnail */}
                        <div className="relative h-24 w-full sm:w-36 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {prj.media_url ? (
                            <img src={prj.media_url} alt={prj.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Video className="h-6 w-6" />
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {prj.deliverable_type?.split(" ")[0] || "Video"}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-foreground line-clamp-1">{prj.title}</h4>
                              <p className="text-xs text-primary font-medium">{prj.brand}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveProject(prj.project_id)}
                              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                              title="Delete project"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {prj.metrics && (
                            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              <Sparkles className="h-3 w-3" /> {prj.metrics}
                            </div>
                          )}

                          <p className="mt-1.5 line-clamp-2 text-muted-foreground text-[11px] leading-relaxed">
                            {prj.description}
                          </p>

                          {prj.link && (
                            <a
                              href={prj.link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              View Project <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <TemplatesPanel />

          {/* Session Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs" data-testid="session-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Active Session</p>
                  <p className="text-xs text-muted-foreground">
                    Signed in as {user?.email} · role: {user?.role}
                  </p>
                </div>
              </div>
              <Button variant="secondary" className="rounded-full text-red-600 dark:text-red-400" onClick={logout} data-testid="account-logout-button">
                <LogOut className="mr-1 h-4 w-4" /> Log out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Social Platform Dialog */}
      <Dialog open={addPlatformOpen} onOpenChange={setAddPlatformOpen}>
        <DialogContent data-testid="add-platform-dialog">
          <DialogHeader>
            <DialogTitle>Add Social Channel</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <label className="eyebrow mb-1 block">Platform</label>
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
            </div>

            <div>
              <label className="eyebrow mb-1 block">Handle / Username</label>
              <Input
                placeholder="@handle"
                value={newPlatform.handle}
                onChange={(e) => setNewPlatform({ ...newPlatform, handle: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="eyebrow mb-1 block">Followers</label>
                <Input
                  type="number"
                  placeholder="e.g. 250000"
                  value={newPlatform.followers}
                  onChange={(e) => setNewPlatform({ ...newPlatform, followers: e.target.value })}
                />
              </div>
              <div>
                <label className="eyebrow mb-1 block">Videos/Posts</label>
                <Input
                  type="number"
                  placeholder="e.g. 180"
                  value={newPlatform.posts_count}
                  onChange={(e) => setNewPlatform({ ...newPlatform, posts_count: e.target.value })}
                />
              </div>
              <div>
                <label className="eyebrow mb-1 block">Avg Views</label>
                <Input
                  type="number"
                  placeholder="e.g. 85000"
                  value={newPlatform.avg_views}
                  onChange={(e) => setNewPlatform({ ...newPlatform, avg_views: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-full" onClick={handleAddPlatform}>
              Save Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Portfolio Project Dialog */}
      <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
        <DialogContent className="max-w-lg" data-testid="add-project-dialog">
          <DialogHeader>
            <DialogTitle>Add Portfolio Project / Case Study</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="eyebrow mb-1 block">Project Title</label>
                <Input
                  placeholder="e.g. Smart Desk Tour 2026"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                />
              </div>
              <div>
                <label className="eyebrow mb-1 block">Client / Brand</label>
                <Input
                  placeholder="e.g. Autonomous AI"
                  value={newProject.brand}
                  onChange={(e) => setNewProject({ ...newProject, brand: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="eyebrow mb-1 block">Deliverable Format</label>
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
              </div>

              <div>
                <label className="eyebrow mb-1 block">Media Type</label>
                <Select
                  value={newProject.media_type}
                  onValueChange={(v) => setNewProject({ ...newProject, media_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Embed</SelectItem>
                    <SelectItem value="photo">Photo / Carousel</SelectItem>
                    <SelectItem value="document">Case Study / Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="eyebrow mb-1 block">Thumbnail / Photo URL</label>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={newProject.media_url}
                onChange={(e) => setNewProject({ ...newProject, media_url: e.target.value })}
              />
            </div>

            <div>
              <label className="eyebrow mb-1 block">Video Embed or Document URL (optional)</label>
              <Input
                placeholder="https://youtube.com/embed/... or direct video link"
                value={newProject.embed_url}
                onChange={(e) => setNewProject({ ...newProject, embed_url: e.target.value })}
              />
            </div>

            <div>
              <label className="eyebrow mb-1 block">Key Metrics Achieved</label>
              <Input
                placeholder="e.g. 1.4M Views · 9.2% CTR · $24k Sales"
                value={newProject.metrics}
                onChange={(e) => setNewProject({ ...newProject, metrics: e.target.value })}
              />
            </div>

            <div>
              <label className="eyebrow mb-1 block">External Link (Live Post / Video)</label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={newProject.link}
                onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
              />
            </div>

            <div>
              <label className="eyebrow mb-1 block">Project Summary</label>
              <Textarea
                placeholder="Explain the brief, creative angle, and campaign outcome…"
                rows={3}
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-full" onClick={handleAddProject}>
              Add to Showcase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs" data-testid="templates-panel">
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Template Library</p>
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
          <DialogHeader><DialogTitle>New Template</DialogTitle></DialogHeader>
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
