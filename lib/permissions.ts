export const PERMISSIONS = [
  { key: "view_stats", label: "View platform stats", hint: "Totals on the dashboard" },
  { key: "edit_users", label: "Edit users & balances", hint: "Change profiles, balances, fees, reassign admins" },
  { key: "delete_users", label: "Delete users", hint: "Permanently remove a user" },
  { key: "view_documents", label: "View user documents", hint: "Open uploaded documents" },
  { key: "message_users", label: "Message users", hint: "Send Telegram messages to users" },
  { key: "manage_withdrawals", label: "Manage withdrawals", hint: "See and approve/reject all withdrawals" },
  { key: "manage_settings", label: "Manage settings", hint: "Support contact and deposit addresses" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

/** Normalizes a stored value: null/invalid = unrestricted, otherwise the known keys only. */
export function resolvePermissions(stored: unknown): PermissionKey[] {
  if (!Array.isArray(stored)) return ALL_PERMISSIONS;
  return ALL_PERMISSIONS.filter((k) => stored.includes(k));
}
