export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'member' | 'admin' | 'publicity' | 'prayer';
  phoneNumber?: string;
  hostelName?: string;
  dateOfBirth?: string;
  publicProfile?: boolean;
  stats?: {
    versesHighlighted?: number;
    quizzesTaken?: number;
    sermonsHeard?: number;
    bookmarks?: number;
    [key: string]: number | undefined;
  };
  bibleData?: Record<string, {
    highlights?: Record<number, string>;
    bookmarked?: boolean;
    lastRead?: string;
  }>;
  createdAt?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  lastActive?: string;
  streak?: {
    count: number;
    lastChecked: string;
    best: number;
  };
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface Testimony {
  id: string;
  uid: string;
  authorName: string;
  content: string;
  approved: boolean;
  createdAt: string;
}

export interface PrayerRequest {
  id: string;
  uid: string;
  authorName: string;
  content: string;
  isPrivate: boolean;
  approved: boolean;
  createdAt: string;
  prayedBy?: string[];
  prayedCount?: number;
  completed?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'service' | 'youth' | 'outreach';
  location?: string;
  meetingLink?: string; // Room name for Jitsi
  createdBy: string;
  createdAt?: string;
}

export interface Quiz {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Sermon {
  id: string;
  title: string;
  description: string;
  speaker: string;
  series: string;
  date: string;
  duration: string;
  coverUrl: string;
  audioUrl: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  date: string;
  uploadedBy: string;
  externalLink?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export interface SiteSettings {
  contactEmail?: string;
  momoNumber?: string;
  momoName?: string;
  telecelNumber?: string;
  telecelName?: string;
  bankInfo?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
  };
  givingCategories?: string[];
  givingAmounts?: string[];
}

export interface GivingStats {
  weeklyGoal: number;
  currentProgress: number;
  lastResetDate: string;
  impactBreakdown?: {
    label: string;
    percent: number;
  }[];
}

export interface StudyPlan {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  duration: number; // in days
  days: {
    dayNumber: number;
    title: string;
    passage: string;
    content: string;
  }[];
  createdAt: string;
  category: 'weekly' | 'monthly' | 'topical';
}

export interface StudyNote {
  id: string;
  uid: string;
  planId?: string;
  dayNumber?: number;
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  uid: string;
  authorName: string;
  type: 'image' | 'video' | 'text';
  content: string; // URL or text
  expiresAt: any;
  createdAt: any;
}

export interface GlobalReaction {
  id: string;
  emoji: string;
  uid: string;
  displayName?: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  createdAt: any;
  role?: string;
}

