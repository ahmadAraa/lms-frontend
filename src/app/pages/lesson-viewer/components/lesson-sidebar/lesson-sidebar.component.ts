import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseResponseDTO, SectionResponseDTO } from '../../../../types/course-builder.types';

@Component({
  selector: 'app-lesson-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-sidebar.component.html',
  styleUrl: './lesson-sidebar.component.css'
})
export class LessonSidebarComponent {
  @Input() course: CourseResponseDTO | null = null;
  @Input() sections: SectionResponseDTO[] = [];
  @Input() expandedSectionIds: number[] = [];
  @Input() completedLessonIds: number[] = [];
  @Input() currentLessonId?: number;
  @Input() isPreviewMode = false;

  @Output() toggleSection = new EventEmitter<number>();
  @Output() openLesson = new EventEmitter<number>();
  @Output() toggleCompletion = new EventEmitter<{ lessonId: number, event: Event }>();
  @Output() backToTop = new EventEmitter<void>();

  countTotalLessons(): number {
    return this.sections.reduce((acc, sec) => acc + (sec.lessons?.length || 0), 0);
  }

  countCompletedLessons(section: SectionResponseDTO): number {
    return (section.lessons ?? []).filter((lesson) => this.isLessonCompleted(lesson.id)).length;
  }

  isSectionExpanded(sectionId: number): boolean {
    return this.expandedSectionIds.includes(sectionId);
  }

  isLessonCompleted(lessonId: number): boolean {
    return this.completedLessonIds.includes(lessonId);
  }

  onToggleSection(sectionId: number) {
    this.toggleSection.emit(sectionId);
  }

  onOpenLesson(lessonId: number) {
    this.openLesson.emit(lessonId);
  }

  onToggleCompletion(lessonId: number, event: Event) {
    this.toggleCompletion.emit({ lessonId, event });
  }

  onBackToTop() {
    this.backToTop.emit();
  }
}
