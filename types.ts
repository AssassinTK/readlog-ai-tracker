
export enum ReadingStatus {
  NOT_READ = '未讀',
  READING = '閱讀中',
  READ = '已讀'
}

export interface Note {
  id: string;
  text: string;
  timestamp: string;
  isForQuiz: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category?: string;
  tags?: string;
  status: ReadingStatus | string;
  rating: number;
  startDate?: string;
  endDate?: string;
  coverUrl?: string | null;
  notes?: Note[];
  isbn?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface AppSettings {
  googleSheetsUrl: string;
}
