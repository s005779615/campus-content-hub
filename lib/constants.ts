import {
  BarChart3,
  BookOpenText,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  School,
  Settings,
  Smartphone,
  UsersRound,
  WandSparkles
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const appName = "校园内容中台";

export const platforms = ["小红书", "抖音", "视频号"] as const;
export const mvpPlatforms = ["小红书", "抖音"] as const;

export const contentTypes = [
  "宿舍攻略",
  "开学清单",
  "校园周边",
  "食堂测评",
  "新生避坑",
  "校园卡",
  "被子床品",
  "军训用品",
  "学长学姐建议"
] as const;

export const contentGoals = ["涨粉", "私信咨询", "加微信", "成交转化"] as const;

export const toneStyles = [
  "真实学长学姐口吻",
  "避坑攻略口吻",
  "生活分享口吻",
  "强转化口吻"
] as const;

export const riskTermSuggestions: Record<string, string> = {
  官方: "非官方校园生活分享",
  学校指定: "不少新生会关注",
  辅导员推荐: "学长学姐经验里常被提到",
  必须办理: "可以按个人需要了解",
  不办会影响入学: "不确定是否需要的话建议提前问清楚",
  内部渠道: "校园生活信息整理",
  保证通过: "以实际办理规则为准"
};

export const riskTerms = Object.keys(riskTermSuggestions);

type NavHref =
  | "/dashboard"
  | "/schools"
  | "/team"
  | "/generate"
  | "/accounts"
  | "/library"
  | "/tasks"
  | "/analytics"
  | "/settings";

type NavItem = {
  href: NavHref;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const navItems = [
  { href: "/dashboard", label: "首页", icon: LayoutDashboard },
  { href: "/schools", label: "学校", icon: School },
  { href: "/team", label: "队员", icon: UsersRound, adminOnly: true },
  { href: "/generate", label: "生成", icon: WandSparkles },
  { href: "/accounts", label: "账号", icon: Smartphone },
  { href: "/library", label: "内容库", icon: FileText },
  { href: "/tasks", label: "任务", icon: CalendarDays },
  { href: "/analytics", label: "看板", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings }
] satisfies readonly NavItem[];

export const platformAccent: Record<string, string> = {
  小红书: "bg-coral-50 text-coral-600 border-coral-100",
  抖音: "bg-ink text-white border-ink",
  视频号: "bg-skyline-50 text-skyline-600 border-skyline-100"
};

export const homeTips = [
  {
    icon: GraduationCap,
    title: "非官方定位",
    text: "所有内容都以校园生活攻略、学长学姐经验、新生避坑为表达边界。"
  },
  {
    icon: BookOpenText,
    title: "先资料后生成",
    text: "学校资料越具体，生成内容越像本校真实生活，而不是泛泛模板。"
  }
];
