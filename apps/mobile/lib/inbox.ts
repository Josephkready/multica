import type { InboxItem } from "@multica/core/types";

// Port of packages/views/inbox/components/inbox-display.ts (pure JS, no JSX).
// Web's version is identical — kept in sync by hand for now (low churn).

function singleLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripQuickCreatePrefix(
  title: string,
  identifier?: string,
): string {
  const normalized = singleLine(title);
  if (!normalized) return "";
  if (identifier) {
    const exactPrefix = new RegExp(
      `^Created\\s+${escapeRegExp(identifier)}:\\s*`,
      "i",
    );
    const withoutExactPrefix = normalized.replace(exactPrefix, "");
    if (withoutExactPrefix !== normalized) return withoutExactPrefix.trim();
  }
  return normalized.replace(/^Created\s+[A-Z][A-Z0-9]*-\d+:\s*/i, "").trim();
}

export function getInboxDisplayTitle(item: InboxItem): string {
  const details = item.details ?? {};
  if (item.type === "quick_create_done") {
    const cleaned = stripQuickCreatePrefix(item.title, details.identifier);
    if (cleaned) return cleaned;
    const prompt = singleLine(details.original_prompt);
    if (prompt) return prompt;
  }
  if (item.type === "quick_create_failed") {
    const prompt = singleLine(details.original_prompt);
    if (prompt) return prompt;
  }
  return item.title;
}
