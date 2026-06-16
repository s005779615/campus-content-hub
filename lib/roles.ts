import type { UserRole } from "@/lib/types";

export function roleLabel(role: UserRole) {
  if (role === "admin") return "管理员";
  if (role === "member") return "校区负责人";
  return "校区代理";
}

export function managedRoleLabel(role: UserRole) {
  if (role === "admin") return "校区负责人";
  if (role === "member") return "校区代理";
  return "成员";
}
