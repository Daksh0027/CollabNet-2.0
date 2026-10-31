import { X } from "lucide-react";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
} from "@/components/base/drawer/drawer";
import { DirectionProvider } from "@/components/foundations/direction/direction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtNum } from "@/lib/api";

function selectedValues(value) {
  return value === "all" ? [] : value.split(",").filter(Boolean);
}

function FilterChoiceGroup({ title, options, value, onToggle, testId }) {
  const selected = selectedValues(value);
  const allSelected = options.length > 0 && selected.length === options.length;
  const someSelected = selected.length > 0 && !allSelected;

  return (
    <fieldset className="space-y-2 border-b border-border pb-5">
      <legend className="flex w-full items-center justify-between gap-3 text-sm font-semibold text-foreground">
        {title}
        <Checkbox
          className="rounded-md px-2 py-1 text-xs font-normal text-foreground transition-colors hover:bg-muted"
          isSelected={allSelected}
          isIndeterminate={someSelected}
          onChange={() => {
            const valuesToToggle = allSelected
              ? selected
              : options.filter((option) => !selected.includes(option));
            valuesToToggle.forEach(onToggle);
          }}
          data-testid={`${testId}-select-all`}
        >
          Select all
        </Checkbox>
      </legend>
      <div className="grid gap-1 sm:grid-cols-2" data-testid={testId}>
        {options.map((option) => (
          <Checkbox
            key={option}
            className="min-h-8 rounded-md px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted"
            isSelected={selected.includes(option)}
            onChange={() => onToggle(option)}
          >
            {option}
          </Checkbox>
        ))}
      </div>
    </fieldset>
  );
}

function RangeFilter({ label, min, max, onMinChange, onMaxChange, testId, step = 1, suffix = "" }) {
  const onChange = (setter) => (event) => {
    const value = Number(event.target.value);
    setter(Number.isFinite(value) ? Math.max(0, value) : 0);
  };

  const display = (value) => {
    if (!value) return "Any";
    if (suffix === "%") return `${value}%`;
    return fmtNum(value);
  };

  return (
    <fieldset className="space-y-2 border-b border-border pb-5" data-testid={testId}>
      <legend className="mb-2 flex w-full items-center justify-between gap-3 text-sm font-semibold text-foreground">
        {label}
        <span className="text-xs font-normal text-muted-foreground">
          {display(min)} – {display(max)}
        </span>
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          Minimum
          <Input
            type="number"
            min="0"
            step={step}
            value={min || ""}
            onChange={onChange(onMinChange)}
            className="h-9"
            data-testid={`${testId}-min`}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Maximum
          <Input
            type="number"
            min="0"
            step={step}
            value={max || ""}
            onChange={onChange(onMaxChange)}
            className="h-9"
            data-testid={`${testId}-max`}
          />
        </label>
      </div>
    </fieldset>
  );
}

export default function CreatorFiltersDrawer({
  isOpen,
  onOpenChange,
  filters,
  options,
  onFieldChange,
  onMultiToggle,
  onReset,
}) {
  return (
    <DirectionProvider locale="en-US">
      <Drawer
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="end"
        size="lg"
        aria-label="Creator filters"
        overlayClassName="bottom-0 z-[100]"
        className="flex min-h-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card py-0 shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">Creator filters</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Combine available profile and performance data. Selected options within a group match any.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close creator filters"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <DrawerBody className="space-y-5 px-5 py-4 text-xs text-muted-foreground">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-foreground">
              Creator location
              <Input
                value={filters.location}
                onChange={(event) => onFieldChange("location", event.target.value)}
                placeholder="City, state, or country"
                className="h-9"
                data-testid="creator-location-filter"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-foreground">
              Project tag
              <Input
                value={filters.tag}
                onChange={(event) => onFieldChange("tag", event.target.value)}
                placeholder="e.g. Smart Home"
                className="h-9"
                data-testid="creator-tag-filter"
              />
            </label>
          </div>

          <FilterChoiceGroup
            title="Niche"
            options={options.niches}
            value={filters.niche}
            onToggle={(value) => onMultiToggle("niche", value)}
            testId="creator-niche-options"
          />
          <FilterChoiceGroup
            title="Social platforms"
            options={options.platforms}
            value={filters.platform}
            onToggle={(value) => onMultiToggle("platform", value)}
            testId="creator-platform-options"
          />
          <FilterChoiceGroup
            title="Content formats"
            options={options.contentTypes}
            value={filters.contentType}
            onToggle={(value) => onMultiToggle("contentType", value)}
            testId="creator-content-type-options"
          />
          <RangeFilter
            label="Followers on selected platforms"
            min={filters.minF}
            max={filters.maxF}
            onMinChange={(value) => onFieldChange("minF", value)}
            onMaxChange={(value) => onFieldChange("maxF", value)}
            testId="creator-followers-range"
          />
          <RangeFilter
            label="Average views"
            min={filters.minViews}
            max={filters.maxViews}
            onMinChange={(value) => onFieldChange("minViews", value)}
            onMaxChange={(value) => onFieldChange("maxViews", value)}
            testId="creator-views-range"
          />
          <RangeFilter
            label="Engagement rate"
            min={filters.minEngagement}
            max={filters.maxEngagement}
            onMinChange={(value) => onFieldChange("minEngagement", value)}
            onMaxChange={(value) => onFieldChange("maxEngagement", value)}
            testId="creator-engagement-range"
            step="0.1"
            suffix="%"
          />

          <label className="block max-w-56 space-y-1 text-xs font-medium text-foreground">
            Minimum connections
            <Input
              type="number"
              min="0"
              value={filters.minConnections || ""}
              onChange={(event) =>
                onFieldChange("minConnections", Math.max(0, Number(event.target.value) || 0))
              }
              className="h-9"
              data-testid="creator-min-connections-filter"
            />
          </label>
        </DrawerBody>

        <DrawerFooter className="mt-0 shrink-0 border-t border-border px-5 pt-4">
          <Button type="button" variant="outline" onClick={onReset} data-testid="creator-reset-drawer">
            Reset filters
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DrawerFooter>
      </Drawer>
    </DirectionProvider>
  );
}
