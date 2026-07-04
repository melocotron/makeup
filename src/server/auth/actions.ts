"use server";

import { signOut } from "./config";

export async function logout(locale: string = "es") {
  await signOut({ redirectTo: `/${locale}/admin/login` });
}