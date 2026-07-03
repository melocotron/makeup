"use server";

import { signOut } from "./config";

export async function logout() {
  await signOut({ redirectTo: "/es/admin/login" });
}