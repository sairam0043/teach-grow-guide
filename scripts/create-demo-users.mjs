import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const firstEnv = (...keys) => {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  return null;
};

const tryLoadDotEnv = async () => {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const envPath = resolve(here, "..", ".env");
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2] ?? "";
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore: .env might not exist in some environments
  }
};

const requiredEnv = (label, ...keys) => {
  const v = firstEnv(...keys);
  if (!v) throw new Error(`Missing required env var: ${label} (tried: ${keys.join(", ")})`);
  return v;
};

await tryLoadDotEnv();

const SUPABASE_URL = requiredEnv("Supabase URL", "SUPABASE_URL", "VITE_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requiredEnv("Supabase service role key", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY");

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "TempPass123!";

const DEMO_USERS = [
  {
    label: "Admin",
    email: "admin.demo@teachgrow.local",
    password: DEMO_PASSWORD,
    role: "admin",
    metadata: { full_name: "Demo Admin", role: "admin" },
  },
  {
    label: "Student",
    email: "student.demo@teachgrow.local",
    password: DEMO_PASSWORD,
    role: "student",
    metadata: { full_name: "Demo Student", role: "student", phone: "9999999999" },
  },
  {
    label: "Tutor",
    email: "tutor.demo@teachgrow.local",
    password: DEMO_PASSWORD,
    role: "tutor",
    metadata: {
      full_name: "Demo Tutor",
      role: "tutor",
      phone: "8888888888",
      category: "academic",
      subjects: JSON.stringify(["Math", "Science"]),
      experience: "3",
      qualification: "B.Ed",
      city: "Demo City",
      teaching_mode: "online",
      bio: "Demo tutor account",
    },
  },
];

const findUserByEmail = async (email) => {
  // Supabase doesn't provide a direct get-by-email helper in all versions,
  // so we list and filter. This is fine for small demo projects.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000, page: 1 });
  if (error) throw error;
  return data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase()) || null;
};

const ensureUser = async ({ email, password, metadata }) => {
  const existing = await findUserByEmail(email);

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    return data.user;
  }

  // Keep it idempotent: update password + metadata if the user already exists
  const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    user_metadata: metadata,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
};

const ensureRoleRow = async (userId, role) => {
  const { error } = await admin.from("user_roles").upsert(
    { user_id: userId, role },
    { onConflict: "user_id,role" },
  );
  if (error) throw error;
};

const ensureTutorApproved = async (userId) => {
  const { error } = await admin.from("tutors").update({ approval_status: "approved" }).eq("user_id", userId);
  // It's okay if the tutor row doesn't exist (e.g., schema not applied yet)
  if (error && !String(error.message || "").toLowerCase().includes("relation")) throw error;
};

const main = async () => {
  console.log("Creating demo users...");
  console.log(`Using DEMO_PASSWORD=${JSON.stringify(DEMO_PASSWORD)}`);

  for (const u of DEMO_USERS) {
    const user = await ensureUser(u);
    await ensureRoleRow(user.id, u.role);
    if (u.role === "tutor") await ensureTutorApproved(user.id);
    console.log(`- ${u.label}: ${u.email}`);
  }

  console.log("Done.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
