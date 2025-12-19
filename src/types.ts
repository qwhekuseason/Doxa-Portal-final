export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'member' | 'admin';
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
  preacher: string;
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
