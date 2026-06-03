import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseResponseDTO, SectionResponseDTO } from '../../../../types/course-builder.types';

/**
 * Component representing the course navigation sidebar within the lesson viewer interface.
 * Displays sections and their lessons, shows lesson progress and completion checkboxes,
 * and allows users to expand/collapse sections and click to load specific lessons.
 */
@Component({
  selector: 'app-lesson-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-sidebar.component.html',
  styleUrl: './lesson-sidebar.component.css'
})
export class LessonSidebarComponent {
  /**
   * The course details being navigated.
   */
  @Input() course: CourseResponseDTO | null = null;

  /**
   * List of curriculum sections under the course.
   */
  @Input() sections: SectionResponseDTO[] = [];

  /**
   * Active IDs of sections currently expanded in the UI accordion list.
   */
  @Input() expandedSectionIds: number[] = [];

  /**
   * List of lesson IDs completed by the user.
   */
  @Input() completedLessonIds: number[] = [];

  /**
   * ID of the active/current lesson in progress.
   */
  @Input() currentLessonId?: number;

  /**
   * Flag showing if the sidebar is running in visual-preview mode.
   * In preview mode, user progress tracking actions might be disabled or ignored.
   */
  @Input() isPreviewMode = false;

  /**
   * Event emitted when a section accordion header is clicked.
   * Passes the clicked section's ID.
   */
  @Output() toggleSection = new EventEmitter<number>();

  /**
   * Event emitted when a user selects a lesson.
   * Passes the selected lesson's ID.
   */
  @Output() openLesson = new EventEmitter<number>();

  /**
   * Event emitted when a user checks or unchecks a lesson's completion box.
   * Passes both the lesson ID and the source checkbox change Event.
   */
  @Output() toggleCompletion = new EventEmitter<{ lessonId: number, event: Event }>();

  /**
   * Event emitted when a user clicks the back button to navigate back to the main course page.
   */
  @Output() backToTop = new EventEmitter<void>();

  /**
   * Calculates the total number of lessons across all course sections.
   *
   * @returns The total count of all lessons.
   */
  countTotalLessons(): number {
    return this.sections.reduce((acc, sec) => acc + (sec.lessons?.length || 0), 0);
  }

  /**
   * Counts the completed lessons within a specific curriculum section.
   *
   * @param section - The section to evaluate.
   * @returns The number of completed lessons inside the specified section.
   */
  countCompletedLessons(section: SectionResponseDTO): number {
    return (section.lessons ?? []).filter((lesson) => this.isLessonCompleted(lesson.id)).length;
  }

  /**
   * Checks whether a section is currently expanded in the sidebar's accordion.
   *
   * @param sectionId - The unique identifier of the section.
   * @returns True if the section is expanded, false otherwise.
   */
  isSectionExpanded(sectionId: number): boolean {
    return this.expandedSectionIds.includes(sectionId);
  }

  /**
   * Checks whether a specific lesson has been completed by the current user.
   *
   * @param lessonId - The unique identifier of the lesson.
   * @returns True if the lesson is completed, false otherwise.
   */
  isLessonCompleted(lessonId: number): boolean {
    return this.completedLessonIds.includes(lessonId);
  }

  /**
   * Dispatches the section toggle event upward when accordion header is clicked.
   *
   * @param sectionId - The ID of the clicked section.
   */
  onToggleSection(sectionId: number) {
    this.toggleSection.emit(sectionId);
  }

  /**
   * Dispatches the lesson opening navigation request upward when a lesson item is clicked.
   *
   * @param lessonId - The ID of the clicked lesson.
   */
  onOpenLesson(lessonId: number) {
    this.openLesson.emit(lessonId);
  }

  /**
   * Dispatches a completion change request event when a lesson checkbox is toggled.
   *
   * @param lessonId - The ID of the lesson.
   * @param event - The underlying checkbox change DOM event.
   */
  onToggleCompletion(lessonId: number, event: Event) {
    this.toggleCompletion.emit({ lessonId, event });
  }

  /**
   * Dispatches the request to navigate back to the parent course view.
   */
  onBackToTop() {
    this.backToTop.emit();
  }
}
