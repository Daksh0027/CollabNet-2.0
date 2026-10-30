import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, ExternalLink, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const PREFERENCES_KEY = "collabonet-account-settings";

const DEFAULT_PREFERENCES = {
  theme: "light",
  language: "English",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dateFormat: "MMM D, YYYY",
  timeFormat: "12-hour",
  weekStart: "Sunday",
  emailNotifications: true,
  pushNotifications: true,
  inAppNotifications: true,
};

function readPreferences() {
  try {
    const storedTheme = localStorage.getItem("theme");
    return {
      ...DEFAULT_PREFERENCES,
      ...(storedTheme && ["light", "dark", "system"].includes(storedTheme) ? { theme: storedTheme } : {}),
      ...JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}"),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function SectionCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-foreground">
      {label}
      {children}
    </label>
  );
}

function SaveActions({ onSave, onCancel, disabled, saving = false }) {
  return (
    <div className="flex justify-end gap-2 border-t border-border pt-4">
      <Button type="button" variant="secondary" className="rounded-lg" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="button" className="rounded-lg" onClick={onSave} disabled={disabled || saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

function GeneralSettings({ onDirty }) {
  const { setThemeMode } = useTheme();
  const [saved, setSaved] = useState(readPreferences);
  const [draft, setDraft] = useState(saved);
  const changed = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  useEffect(() => onDirty(changed), [changed, onDirty]);

  const update = (key) => (event) => {
    const value = event?.target?.type === "checkbox" ? event.target.checked : event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const cancel = () => setDraft(saved);
  const save = () => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(draft));
      setThemeMode(draft.theme);
      setSaved(draft);
      toast.success("Settings saved");
    } catch (error) {
      console.error("Could not save account settings", error);
      toast.error("Could not save settings on this device.");
    }
  };

  return (
    <div className="space-y-4" data-testid="settings-general-page">
      <SectionCard title="Preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Theme">
            <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={draft.theme} onChange={update("theme")} data-testid="settings-theme">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </Field>
          <Field label="Language">
            <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={draft.language} onChange={update("language")} data-testid="settings-language">
              <option>English</option>
            </select>
          </Field>
          <Field label="Timezone">
            <Input value={draft.timezone} onChange={update("timezone")} data-testid="settings-timezone" />
          </Field>
          <Field label="Date format">
            <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={draft.dateFormat} onChange={update("dateFormat")}>
              <option value="MMM D, YYYY">Oct 31, 2026</option>
              <option value="DD/MM/YYYY">31/10/2026</option>
              <option value="MM/DD/YYYY">10/31/2026</option>
            </select>
          </Field>
          <Field label="Time format">
            <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={draft.timeFormat} onChange={update("timeFormat")}>
              <option value="12-hour">12-hour</option>
              <option value="24-hour">24-hour</option>
            </select>
          </Field>
          <Field label="Week starts on">
            <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={draft.weekStart} onChange={update("weekStart")}>
              <option>Sunday</option>
              <option>Monday</option>
            </select>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Language and date/time formatting are saved locally; app-wide localization and format switching are not connected yet.
        </p>
      </SectionCard>
      <SectionCard title="Notifications">
        {[
          ["emailNotifications", "Email notifications"],
          ["pushNotifications", "Push notifications"],
          ["inAppNotifications", "In-app notifications"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-4 text-sm">
            <span>{label}</span>
            <input type="checkbox" checked={draft[key]} onChange={update(key)} className="h-4 w-4 accent-primary" />
          </label>
        ))}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Preferences are saved on this device. Server-side email and push controls are not available yet.
        </p>
      </SectionCard>
      <SaveActions onSave={save} onCancel={cancel} disabled={!changed} />
    </div>
  );
}

function ProfileSettings({ user, onDirty, onSaved }) {
  const { refresh } = useAuth();
  const creator = user?.role === "creator";
  const initialDraft = useMemo(() => {
    const source = creator ? user?.creator || {} : user?.company || {};
    return {
      name: user?.name || "",
      niche: source.niche || "",
      bio: source.bio || "",
      pitch: source.pitch || "",
      location: source.location || "",
      companyName: source.name || "",
      industry: source.industry || "",
      website: source.website || "",
      about: source.about || "",
    };
  }, [creator, user?.company, user?.creator, user?.name]);
  const [saved, setSaved] = useState(initialDraft);
  const [draft, setDraft] = useState(initialDraft);
  const [saving, setSaving] = useState(false);
  const changed = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  useEffect(() => {
    setSaved(initialDraft);
    setDraft(initialDraft);
  }, [initialDraft]);
  useEffect(() => onDirty(changed), [changed, onDirty]);

  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const save = async () => {
    setSaving(true);
    try {
      const payload = creator
        ? {
            name: draft.name,
            creator: { niche: draft.niche, bio: draft.bio, pitch: draft.pitch, location: draft.location },
          }
        : {
            name: draft.name,
            company: {
              name: draft.companyName,
              industry: draft.industry,
              website: draft.website,
              about: draft.about,
            },
          };
      await api.put("/profile", payload);
      await refresh();
      setSaved(draft);
      onSaved();
      toast.success("Profile saved");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => setDraft(saved);
  const socialLinks = user?.creator?.platforms || [];

  return (
    <div className="space-y-4" data-testid="settings-profile-page">
      <SectionCard title="Profile information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input value={draft.name} onChange={update("name")} data-testid="settings-display-name" />
          </Field>
          <Field label="Email">
            <Input value={user?.email || ""} readOnly aria-readonly="true" />
          </Field>
          <Field label="Role">
            <Input value={creator ? "Creator" : "Brand / Agency"} readOnly aria-readonly="true" />
          </Field>
          {creator ? (
            <Field label="Niche"><Input value={draft.niche} onChange={update("niche")} /></Field>
          ) : (
            <>
              <Field label="Brand or agency name"><Input value={draft.companyName} onChange={update("companyName")} /></Field>
              <Field label="Industry"><Input value={draft.industry} onChange={update("industry")} /></Field>
              <Field label="Website"><Input value={draft.website} onChange={update("website")} /></Field>
            </>
          )}
          {creator ? <Field label="Location"><Input value={draft.location} onChange={update("location")} /></Field> : null}
          <Field label={creator ? "Bio" : "About"}>
            <Textarea value={creator ? draft.bio : draft.about} onChange={update(creator ? "bio" : "about")} rows={3} />
          </Field>
          {creator ? (
            <Field label="Sponsor pitch"><Textarea value={draft.pitch} onChange={update("pitch")} rows={3} /></Field>
          ) : null}
        </div>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Avatar upload, handle, phone, and password changes are not supported by the current account API.
        </p>
        {creator ? (
          <div className="text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Connected social accounts</p>
            {socialLinks.length
              ? socialLinks.map((platform) => (
                  <span key={platform.platform} className="mr-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                    <Check className="h-3 w-3 text-primary" /> {platform.platform}{platform.handle ? ` · ${platform.handle}` : ""}
                  </span>
                ))
              : "No social accounts connected."}
          </div>
        ) : null}
      </SectionCard>
      <SaveActions onSave={save} onCancel={cancel} disabled={!changed} saving={saving} />
    </div>
  );
}

function ToolsSettings({ onDirty, onNavigate }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`${PREFERENCES_KEY}-tools`) || '{"chatSounds":false,"calendarReminders":true}');
    } catch {
      return { chatSounds: false, calendarReminders: true };
    }
  });
  const [draft, setDraft] = useState(saved);
  const changed = JSON.stringify(saved) !== JSON.stringify(draft);
  useEffect(() => onDirty(changed), [changed, onDirty]);
  const cancel = () => setDraft(saved);
  const save = () => {
    try {
      localStorage.setItem(`${PREFERENCES_KEY}-tools`, JSON.stringify(draft));
      setSaved(draft);
      toast.success("Preferences saved");
    } catch (error) {
      console.error("Could not save tool preferences", error);
      toast.error("Could not save preferences on this device.");
    }
  };

  return (
    <div className="space-y-4" data-testid="settings-tools-page">
      <SectionCard title="Integrations">
        {["Google Calendar", "Outlook Calendar", "Slack", "Payout methods"].map((item) => (
          <div key={item} className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0">
            <div>
              <p className="text-sm font-medium">{item}</p>
              <p className="text-xs text-muted-foreground">Integration connection is not available yet.</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">Not connected</span>
          </div>
        ))}
      </SectionCard>
      <SectionCard title="Collaboration preferences">
        {[
          ["calendarReminders", "Calendar reminders"],
          ["chatSounds", "Chat sounds"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-4 text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={draft[key]}
              onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
          </label>
        ))}
        <button
          type="button"
          onClick={() => {
            if (onNavigate()) navigate("/app/contracts");
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          View contract signature <ArrowUpRight className="h-4 w-4" />
        </button>
      </SectionCard>
      <SaveActions onSave={save} onCancel={cancel} disabled={!changed} />
    </div>
  );
}

function StorageSettings({ onNavigate }) {
  return (
    <div className="space-y-4" data-testid="settings-storage-page">
      <SectionCard title="Storage usage">
        <p className="text-sm text-muted-foreground">
          Storage totals and largest-file management are not available from the current API.
        </p>
        <p className="text-xs text-muted-foreground">
          Contract files, media kits, and chat attachments remain available in their respective areas.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/app/contracts" onClick={(event) => {
            if (!onNavigate()) event.preventDefault();
          }} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Contracts <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Link to="/app/messages" onClick={(event) => {
            if (!onNavigate()) event.preventDefault();
          }} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Messages <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}

export function SettingsProductPages({ page, user, onDirty, onSaved, onNavigate }) {
  if (page === "profile") return <ProfileSettings user={user} onDirty={onDirty} onSaved={onSaved} />;
  if (page === "tools") return <ToolsSettings onDirty={onDirty} onNavigate={onNavigate} />;
  if (page === "storage") return <StorageSettings onNavigate={onNavigate} />;
  return <GeneralSettings onDirty={onDirty} />;
}
