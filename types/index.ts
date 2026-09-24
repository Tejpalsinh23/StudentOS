export interface User {
  id: string;
  name: string | null;
  email: string;
  course: string | null;
  university: string | null;
  profile_image: string | null;
  target_grade: string | null;
  study_goal_hours: number | null;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  category: 'Homework' | 'Revision' | 'Exam' | 'Personal';
  due_date: string | null;
  completed: boolean;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string | null;
  start_time: string;
  duration: number; // minutes
  completed: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  content: string | null;
  file_url: string | null;
  favorite: boolean;
  created_at: string;
}

export interface TimetableEvent {
  id: string;
  user_id: string;
  subject_id: string | null;
  day: number; // 0=Sunday, 1=Monday...
  start_time: string; // Time string like '09:00:00'
  end_time: string;
  location: string | null;
  type: string | null; // e.g., 'Class', 'Study', 'Break', 'Event'
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reminder_time: string;
  completed: boolean;
  created_at: string;
}
