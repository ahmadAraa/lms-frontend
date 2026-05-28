import { environment } from '../../environments/environment';

export const BASE_URL = environment.apiUrl;

export enum MaterialType {
  Video = 0,
  PDF = 1,
  Presentation = 2,
  Link = 3,
}

export interface LessonResponseDTO {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  order: number;
  sectionId: number;
  type: MaterialType;
  isComplete?: boolean;
}

export interface SectionResponseDTO {
  id: number;
  title: string;
  description: string | null;
  order: number;
  courseId: number;
  lessons: LessonResponseDTO[];
}

export interface CourseResponseDTO {
  id: number;
  title: string;
  description: string | null;
  order: number;
  learningPathId: number;
  pictureUrl: string | null;
  sections: SectionResponseDTO[];
}

export interface LearningPathResponseDto {
  id: number;
  title: string;
  description: string | null;
  pictureUrl: string | null;
  courses: CourseResponseDTO[];
}
