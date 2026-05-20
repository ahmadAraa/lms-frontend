import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseResponseDTO } from '../../../../core/services/learning-path.service';
import { BASE_URL } from '../../../../types/course-builder.types';

interface EnrolledCourse {
  course: CourseResponseDTO;
  learningPathId: number;
  learningPathTitle: string;
}

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-courses.component.html',
  styleUrl: './my-courses.component.css',
})
export class MyCoursesComponent {
  @Input({ required: true }) enrolledCourses!: EnrolledCourse[];
  @Input({ required: true }) courseProgressMap!: Map<number, number>;

  @Output() open = new EventEmitter<{ course: CourseResponseDTO; learningPathId: number }>();

  private readonly gradients = [
    'linear-gradient(135deg, #0f1b3d 0%, #1e3a8a 100%)',
    'linear-gradient(135deg, #065f56 0%, #0d9488 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
    'linear-gradient(135deg, #581c87 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  ];

  getCourseProgress(courseId: number): number {
    return this.courseProgressMap.get(courseId) ?? 0;
  }

  getGradient(index: number): string {
    return this.gradients[index % this.gradients.length];
  }

  getCoursePictureUrl(course: CourseResponseDTO): string {
    if (!course.image) return '';
    if (course.image.startsWith('http')) return course.image;
    return `${BASE_URL}/${course.image.replace(/^\//, '')}`;
  }
}
