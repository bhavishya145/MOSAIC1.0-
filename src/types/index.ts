export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'user' | 'creator' | 'admin';
  avatar_url?: string;
  bio?: string;
  created_at?: string;
  stats?: {
    storiesCount: number;
    totalReads: number;
    followersCount: number;
    followingCount: number;
  };
  isFollowing?: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  stories_count?: number;
}

export type TileSize = 'small' | 'medium' | 'large' | 'featured';

export interface Story {
  id: number;
  title: string;
  subtitle?: string;
  slug: string;
  content?: string;
  cover_image: string;
  reading_time_minutes: number;
  tile_size: TileSize;
  status: 'published' | 'draft' | 'archived';
  views_count: number;
  created_at: string;
  updated_at?: string;
  excerpt?: string;
  category: {
    id: number;
    name: string;
    slug: string;
    color?: string;
  };
  author: {
    id: number;
    name: string;
    username: string;
    avatar_url?: string;
    bio?: string;
    isFollowing?: boolean;
  };
  stats?: {
    comments: number;
    reactions: number;
    bookmarks: number;
  };
  reactions?: {
    appreciate: number;
    interesting: number;
    useful: number;
    thought_provoking: number;
  };
  totalReactions?: number;
  userReaction?: 'appreciate' | 'interesting' | 'useful' | 'thought_provoking' | null;
  isBookmarked?: boolean;
}

export interface Comment {
  id: number;
  content: string;
  likesCount: number;
  createdAt: string;
  parentId?: number | null;
  userHasLiked?: boolean;
  author: {
    id: number;
    name: string;
    username: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  cover_color?: string;
  cover_image?: string;
  created_at: string;
  user_name?: string;
  user_username?: string;
  user_avatar?: string;
  stories_count?: number;
}

export interface NotificationItem {
  id: number;
  type: 'comment' | 'reply' | 'reaction' | 'follow' | 'bookmark';
  message: string;
  is_read: number;
  created_at: string;
  story_id?: number;
  story_title?: string;
  story_slug?: string;
  actor_name: string;
  actor_username: string;
  actor_avatar?: string;
}
