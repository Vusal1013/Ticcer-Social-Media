export type Reel = {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  description: string | null;
  created_at: string;
  profile?: any;
  likes_count?: number;
  views_count?: number;
};

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  verified_type: 'none' | 'gray' | 'gold' | 'red';
  role: 'user' | 'admin';
  created_at: string;
  theme_id: string | null;
  language: 'az' | 'en' | 'ru';
};

export type AuthState = {
  user: import('@supabase/supabase-js').User | null;
  profile: Profile | null;
  loading: boolean;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  visibility: 'everyone' | 'close_friends';
  scheduled_at: string | null;
  profile?: Profile;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
};

export type SavedPost = {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  post?: Post;
};

export type AppNotification = {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message';
  title: string;
  body: string | null;
  data: any;
  read: boolean;
  created_at: string;
};

export type NotificationPreferences = {
  id: string;
  user_id: string;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  messages: boolean;
};

export type Call = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  status: 'ringing' | 'ongoing' | 'ended' | 'missed' | 'rejected';
  call_type: 'audio' | 'video';
  room_name: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  caller?: Profile;
  callee?: Profile;
};

export type CloseFriend = {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: Profile;
};

export type ScheduledPost = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  scheduled_at: string;
  status: 'pending' | 'published' | 'cancelled';
  created_at: string;
};

export type CommentReaction = {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type ProfileView = {
  id: string;
  viewer_id: string;
  profile_id: string;
  created_at: string;
  viewer?: Profile;
};

export type EditedMessage = {
  edited_at: string | null;
  deleted_at: string | null;
};

export type ProfileTheme = {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  background_gradient: string[];
  card_color: string;
};

export type AISuggestion = {
  id: string;
  post_id: string;
  user_id: string;
  suggestions: string[];
  created_at: string;
};

export type Locale = 'az' | 'en' | 'ru' | 'zh' | 'es' | 'hi' | 'ar' | 'pt' | 'fr' | 'de' | 'ja' | 'ko' | 'tr';