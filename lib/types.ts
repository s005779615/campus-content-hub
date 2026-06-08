export type UserRole = "admin" | "member";
export type Platform = "小红书" | "抖音" | "视频号";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
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
  status: "draft" | "saved";
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
  note: string | null;
  created_at: string;
  schools?: Pick<SchoolRecord, "name" | "campus_name"> | null;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
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
};
