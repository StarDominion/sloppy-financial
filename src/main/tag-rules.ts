import { query } from "./db";
import { Database } from "./database/Database";

export type MatchType = "substring" | "full_string" | "regex";

export interface TagRule {
  id: number;
  profile_id: number;
  substring: string;
  tag: string;
  match_type: MatchType;
  toggle_transaction: boolean;
  replace_description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTagRuleData {
  profileId: number;
  substring: string;
  tag: string;
  matchType?: MatchType;
  toggleTransaction?: boolean;
  replaceDescription?: string;
}

export async function listTagRules(profileId: number): Promise<TagRule[]> {
  return query<TagRule[]>(
    "SELECT * FROM tag_rules WHERE profile_id = ? ORDER BY created_at ASC",
    [profileId],
  );
}

export async function createTagRule(data: CreateTagRuleData): Promise<number> {
  const result = await query<{ insertId: number }>(
    "INSERT INTO tag_rules (profile_id, substring, tag, match_type, toggle_transaction, replace_description) VALUES (?, ?, ?, ?, ?, ?)",
    [
      data.profileId,
      data.substring,
      data.tag,
      data.matchType || "substring",
      data.toggleTransaction || false,
      data.replaceDescription || null,
    ],
  );
  return result.insertId;
}

export async function updateTagRule(
  id: number,
  data: {
    substring?: string;
    tag?: string;
    matchType?: MatchType;
    toggleTransaction?: boolean;
    replaceDescription?: string;
  },
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.substring !== undefined) {
    fields.push("substring = ?");
    values.push(data.substring);
  }
  if (data.tag !== undefined) {
    fields.push("tag = ?");
    values.push(data.tag);
  }
  if (data.matchType !== undefined) {
    fields.push("match_type = ?");
    values.push(data.matchType);
  }
  if (data.toggleTransaction !== undefined) {
    fields.push("toggle_transaction = ?");
    values.push(data.toggleTransaction);
  }
  if (data.replaceDescription !== undefined) {
    fields.push("replace_description = ?");
    values.push(data.replaceDescription || null);
  }

  if (fields.length === 0) return;

  values.push(id);
  await query(`UPDATE tag_rules SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteTagRule(id: number): Promise<void> {
  await query("DELETE FROM tag_rules WHERE id = ?", [id]);
}

export async function deleteAllTagRules(profileId: number): Promise<void> {
  await query("DELETE FROM tag_rules WHERE profile_id = ?", [profileId]);
}

export async function bulkCreateTagRules(
  profileId: number,
  rules: Array<{
    substring: string;
    tag: string;
    matchType?: MatchType;
    toggleTransaction?: boolean;
    replaceDescription?: string;
  }>,
): Promise<void> {
  if (rules.length === 0) return;

  const db = Database.getInstance();
  if (db.dialect === "sqlite") {
    // SQLite: insert one at a time
    for (const r of rules) {
      await query(
        "INSERT INTO tag_rules (profile_id, substring, tag, match_type, toggle_transaction, replace_description) VALUES (?, ?, ?, ?, ?, ?)",
        [profileId, r.substring, r.tag, r.matchType || "substring", r.toggleTransaction ? 1 : 0, r.replaceDescription || null],
      );
    }
  } else {
    // MySQL: batch insert with VALUES ?
    const values = rules.map((r) => [
      profileId,
      r.substring,
      r.tag,
      r.matchType || "substring",
      r.toggleTransaction || false,
      r.replaceDescription || null,
    ]);
    await query(
      "INSERT INTO tag_rules (profile_id, substring, tag, match_type, toggle_transaction, replace_description) VALUES ?",
      [values],
    );
  }
}

export async function replaceAllTagRules(
  profileId: number,
  rules: Array<{
    substring: string;
    tag: string;
    matchType?: MatchType;
    toggleTransaction?: boolean;
    replaceDescription?: string;
  }>,
): Promise<void> {
  // Delete all existing rules
  await deleteAllTagRules(profileId);

  // Create new rules
  await bulkCreateTagRules(profileId, rules);
}
