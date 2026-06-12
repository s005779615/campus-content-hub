export type UserRole = "admin" | "member";
export type Platform = "小红书" | "抖音" | "视频号";
export type TaskStatus =
  | "未开始"
  | "已生成"
  | "待发布"
  | "已发布"
  | "已回填"
  | "已复盘"
  | "异常";
export type AccountPositioning = "学长号" | "校园墙" | "校园生活号" | "新生攻略号";
export type AccountStatus = "启用" | "暂停" | "异常";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at?: string;
};

export type SchoolRecord = {
  id: string;
  name: string;
  campus_name: string | null;
  city: string;
  dormitory_info: string | null;
  cafeteria_info: string | null;
  nearby_food: string | null;
  nearby_fun: string | null;
  registration_notes: string | null;
  essentials: string | null;
  campus_card_notes: string | null;
  bedding_scenarios: string | null;
  freshman_faq: string | null;
  banned_phrases: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SchoolInput = Omit<
  SchoolRecord,
  "id" | "created_by" | "created_at" | "updated_at"
>;

export type ContentRecord = {
  id: string;
  user_id: string;
  school_id: string;
  platform: Platform;
  content_type: string;
  content_goal: string;
  tone: string;
  output: GeneratedOutput;
  risk_hits: RiskHit[];
  status: "draft" | "saved" | TaskStatus;
  task_id?: string | null;
  created_at: string;
  schools?: Pick<SchoolRecord, "name" | "campus_name" | "city"> | null;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
  publication_records?: PublicationRecord[];
};

export type PublicationRecord = {
  id: string;
  content_id: string;
  user_id: string;
  school_id: string;
  platform: Platform;
  published_at: string | null;
  publish_url: string | null;
  views: number;
  likes: number;
  favorites: number;
  comments: number;
  private_messages: number;
  wechat_adds: number;
  conversions: number;
  valid_inquiries: number;
  revenue: number;
  task_id?: string | null;
  screenshot_url?: string | null;
  notes: string | null;
  created_at: string;
  schools?: Pick<SchoolRecord, "name" | "campus_name"> | null;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
  content_records?: Pick<ContentRecord, "content_type" | "content_goal"> | null;
};

export type TaskRecord = {
  id: string;
  user_id: string;
  school_id: string | null;
  task_date: string;
  required_count: number;
  completed_count: number;
  is_done: boolean;
  platform: Platform | null;
  content_type: string | null;
  platform_account_id: string | null;
  content_id: string | null;
  status: TaskStatus;
  publish_screenshot_url: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  note: string | null;
  created_at: string;
  schools?: Pick<SchoolRecord, "name" | "campus_name"> | null;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
  platform_accounts?: Pick<
    PlatformAccount,
    "account_name" | "account_positioning" | "platform"
  > | null;
};

export type PlatformAccount = {
  id: string;
  user_id: string;
  school_id: string;
  platform: Platform;
  account_name: string;
  account_id: string | null;
  account_password: string | null;
  account_link: string | null;
  account_positioning: AccountPositioning;
  daily_publish_target: number;
  status: AccountStatus;
  notes: string | null;
  created_at: string;
  schools?: Pick<SchoolRecord, "name" | "campus_name" | "city"> | null;
  profiles?: Pick<Profile, "full_name" | "email" | "role"> | null;
};

export type RiskHit = {
  term: string;
  suggestion: string;
};

export type XiaohongshuOutput = {
  titles: string[];
  coverText: string;
  body: string;
  imageIdeas: string[];
  tags: string[];
  commentGuide: string;
  dmGuide: string;
};

export type DouyinOutput = {
  hook3s: string;
  script15s: string;
  script30s: string;
  storyboard: string[];
  shootingIdeas: string[];
  subtitles: string[];
  publishTitle: string;
  commentGuide: string;
};

export type VideoChannelOutput = {
  videoTitle: string;
  videoBody: string;
  momentsCopy: string;
  privateGuide: string;
};

export type GeneratedOutput =
  | XiaohongshuOutput
  | DouyinOutput
  | VideoChannelOutput
  | Record<string, unknown>;

export type GeneratePayload = {
  schoolId: string;
  platform: Platform;
  contentType: string;
  contentGoal: string;
  tone: string;
  model?: string;
  taskId?: string;
};
