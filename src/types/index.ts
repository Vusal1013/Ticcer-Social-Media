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
  verified: boolean;
  role: 'user' | 'admin';
  created_at: string;
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
  profile?: Profile;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
};