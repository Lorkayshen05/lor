import bcrypt from "bcryptjs";

const COST = 12;
// Pre-computed hash so login takes the same time whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", COST);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  const ok = await bcrypt.compare(plain, hash ?? DUMMY_HASH);
  return hash ? ok : false;
}
