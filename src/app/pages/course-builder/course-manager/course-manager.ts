import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InlineEditComponent } from '../../../components/course-builder/inline-edit.component';
import { CoursesApiService } from '../../../core/services/courses-api.service';
import { LearningPathsApiService } from '../../../core/services/learning-paths-api.service';
import { LessonsApiService } from '../../../core/services/lessons-api.service';
import { SectionsApiService } from '../../../core/services/sections-api.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  BASE_URL,
  CourseResponseDTO,
  LearningPathResponseDto,
  LessonResponseDTO,
  SectionResponseDTO,
} from '../../../types/course-builder.types';

/**
 * Drag state tracking information for section reordering.
 */
interface SectionDragState {
  /**
   * The ID of the course in which the section resides.
   */
  courseId: number;

  /**
   * The ID of the section currently being dragged.
   */
  sectionId: number;
}

/**
 * Drag state tracking information for lesson reordering.
 */
interface LessonDragState {
  /**
   * The ID of the section in which the lesson resides.
   */
  sectionId: number;

  /**
   * The ID of the lesson currently being dragged.
   */
  lessonId: number;
}

/**
 * Course Builder Orchestrator Page.
 * Implements full course curriculum management (CRUD courses, sections, and lessons)
 * for a designated learning path. Features drag-and-drop hierarchy sorting, modal-based
 * asset uploads (images for courses, video files for lessons), and responsive inline edit text inputs.
 */
@Component({
  selector: 'app-course-manager-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InlineEditComponent],
  templateUrl: './course-manager.html',
  styleUrl: './course-manager.css',
})
export class CourseManagerPage implements OnInit {
  /**
   * ID of the active learning path.
   */
  pathId = 0;

  /**
   * The full hierarchical learning path, course, section, and lesson tree.
   */
  tree: LearningPathResponseDto | null = null;

  /**
   * Signifies if data load is active.
   */
  loading = true;

  /**
   * Captures load failure error messages.
   */
  error = '';

  /**
   * Set containing course IDs currently expanded/opened in the list view.
   */
  expandedCourseIds = new Set<number>();

  /**
   * Set containing section IDs currently expanded/opened in the accordion.
   */
  expandedSectionIds = new Set<number>();

  /**
   * Current inline editor edit identifier (e.g. `section-{id}` or `lesson-{id}`).
   */
  editingKey = '';

  // Course modal
  /**
   * Flag indicating if the course create/edit modal window is open.
   */
  courseModalOpen = false;

  /**
   * ID of the course currently being edited (null signifies adding a new course).
   */
  editingCourseId: number | null = null;

  /**
   * Course modal input binding for title.
   */
  courseTitle = '';

  /**
   * Course modal input binding for description.
   */
  courseDescription = '';

  /**
   * Chosen course picture file.
   */
  selectedFile: File | null = null;

  /**
   * Image file data-URL string for visual cover preview in the modal.
   */
  imagePreview: string | null = null;

  /**
   * Flag indicating if a file is hovering over the modal drag-and-drop container.
   */
  isDragOver = false;

  /**
   * Flag indicating if a modal action is saving on the server.
   */
  isSaving = false;

  /**
   * Flag indicating if a reordering API call is active.
   */
  isReordering = false;

  /**
   * Current section drag transaction state.
   */
  draggingSection: SectionDragState | null = null;

  /**
   * Section ID currently being hovered over during a section drag.
   */
  dragOverSectionId: number | null = null;

  /**
   * Current lesson drag transaction state.
   */
  draggingLesson: LessonDragState | null = null;

  /**
   * Lesson ID currently being hovered over during a lesson drag.
   */
  dragOverLessonId: number | null = null;

  // Section modal
  /**
   * Flag indicating if the section create/edit modal window is open.
   */
  sectionModalOpen = false;

  /**
   * ID of the course in which the new section will be created.
   */
  sectionTargetCourseId: number | null = null;

  /**
   * Section modal input binding for title.
   */
  sectionTitle = '';

  /**
   * Section modal input binding for description.
   */
  sectionDescription = '';

  // Lesson modal
  /**
   * Flag indicating if the lesson create/edit modal window is open.
   */
  lessonModalOpen = false;

  /**
   * ID of the section in which the new lesson will be created.
   */
  lessonTargetSectionId: number | null = null;

  /**
   * Lesson modal input binding for title.
   */
  lessonTitle = '';

  /**
   * Lesson modal input binding for description.
   */
  lessonDescription = '';

  /**
   * Uploaded lesson video file.
   */
  lessonVideoFile: File | null = null;

  /**
   * Lesson modal input binding for external URLs (for link material types).
   */
  lessonLinkUrl = '';

  /**
   * Material type selector: 0 for Video file, 3 for Link.
   */
  lessonMaterialType = 0; // default to Video (0)

  /**
   * Lesson sorting sequence order value.
   */
  lessonOrder = 1;

  // Delete modal state
  deleteModalOpen = false;
  deleteItemType: 'course' | 'section' | null = null;
  deleteItemId: number | null = null;
  deleteItemTitle = '';
  deleteConfirmText = '';

  /**
   * Constructs the CourseManagerPage component.
   *
   * @param route - Active route configuration to read query arguments.
   * @param router - Navigation router.
   * @param pathsApi - API service to fetch path details trees.
   * @param coursesApi - API service to manage course records.
   * @param sectionsApi - API service to manage section records.
   * @param lessonsApi - API service to manage lesson records.
   * @param toast - Toast notification manager.
   * @param cdr - Change detector utility.
   */
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly pathsApi: LearningPathsApiService,
    private readonly coursesApi: CoursesApiService,
    private readonly sectionsApi: SectionsApiService,
    private readonly lessonsApi: LessonsApiService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initial page hook. Resolves path identity parameter and triggers initial data pull.
   */
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('learningPathId'));
    if (!id) {
      this.error = 'Invalid learning path id.';
      this.loading = false;
      return;
    }
    this.pathId = id;
    void this.reload();
  }

  /**
   * Reloads the complete curriculum structure for the current learning path.
   * Re-evaluates visual order and notifies user on failures.
   */
  async reload(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.tree = await this.pathsApi.getPathById(this.pathId);
      this.sortTree();
    } catch (error) {
      this.error = (error as Error).message || 'Failed to load learning path.';
      this.toast.error(this.error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Toggles the open/collapsed layout display state of a course card.
   *
   * @param id - The course ID.
   */
  toggleCourse(id: number): void {
    this.expandedCourseIds.has(id) ? this.expandedCourseIds.delete(id) : this.expandedCourseIds.add(id);
  }

  /**
   * Toggles the open/collapsed layout display state of a section accordion.
   *
   * @param id - The section ID.
   */
  toggleSection(id: number): void {
    this.expandedSectionIds.has(id) ? this.expandedSectionIds.delete(id) : this.expandedSectionIds.add(id);
  }

  // ── Course Image helpers ─────────────────────────
  /**
   * Normalizes course cover art URLs, prepending local base URLs if necessary.
   *
   * @param course - The course object.
   * @returns Fully-formed image URL or empty string.
   */
  getCourseImageUrl(course: CourseResponseDTO): string {
    if (!course.pictureUrl) return '';
    if (course.pictureUrl.startsWith('http')) return course.pictureUrl;
    return `${BASE_URL}/${course.pictureUrl.replace(/^\//, '')}`;
  }

  /**
   * Aggregates the total number of lessons inside a course's sections.
   *
   * @param course - The course object.
   * @returns Total count of lessons.
   */
  getLessonCount(course: CourseResponseDTO): number {
    return (course.sections ?? []).reduce((sum, s) => sum + (s.lessons?.length ?? 0), 0);
  }

  /**
   * Returns the count of sections under a course.
   *
   * @param course - The course object.
   * @returns Section count.
   */
  getSectionCount(course: CourseResponseDTO): number {
    return course.sections?.length ?? 0;
  }

  // ── Course modal ─────────────────────────────────
  /**
   * Navigates administrators to a student-facing visual preview of the course.
   * Automatically targets the first lesson inside the course if available, or redirects to course details.
   *
   * @param course - The course object.
   */
  previewCourse(course: CourseResponseDTO): void {
    const firstLessonId = this.getFirstLessonId(course);
    if (firstLessonId) {
      this.previewLesson(course, firstLessonId);
      return;
    }

    void this.router.navigate(['/course', course.id], {
      state: { course, pathId: this.pathId },
    });
  }

  /**
   * Deep-links and opens the Lesson Viewer interface for a specific lesson preview.
   *
   * @param course - The course context.
   * @param lessonId - The lesson ID.
   */
  previewLesson(course: CourseResponseDTO, lessonId: number): void {
    void this.router.navigate(['/lesson', lessonId], {
      state: { courseId: course.id, pathId: this.pathId },
    });
  }

  /**
   * Helper that traverses and finds the first chronological lesson ID in a course.
   *
   * @param course - The course context.
   * @returns Numeric lesson ID or null.
   */
  private getFirstLessonId(course: CourseResponseDTO): number | null {
    const sections = [...(course.sections ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const section of sections) {
      const firstLesson = [...(section.lessons ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
      if (firstLesson?.id) return firstLesson.id;
    }

    return null;
  }

  /**
   * Resets form values and opens the course creation modal dialog.
   */
  openAddCourseModal(): void {
    this.editingCourseId = null;
    this.courseTitle = '';
    this.courseDescription = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.courseModalOpen = true;
  }

  /**
   * Loads existing details and opens the course edit modal dialog.
   *
   * @param course - The course object to modify.
   */
  openEditCourseModal(course: CourseResponseDTO): void {
    this.editingCourseId = course.id;
    this.courseTitle = course.title;
    this.courseDescription = course.description ?? '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.courseModalOpen = true;
  }

  // ── File selection / drag-drop ──────────────────
  /**
   * Handles keyboard/input file selections, loading the chosen file for upload.
   *
   * @param event - The input change event.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  /**
   * Triggers dragover visuals when a file is hovered over the drop area.
   *
   * @param event - The drag event.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Removes hover visuals when drag leaves.
   *
   * @param event - The drag event.
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Extracts dropped files and validates that they are images.
   *
   * @param event - The drop event.
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.setFile(file);
      } else {
        this.toast.error('Please select an image file.');
      }
    }
  }

  /**
   * Clears the current image selection from the course modal.
   */
  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  /**
   * Validates file size (max 5MB) and converts the image to a reader preview data string.
   *
   * @param file - The chosen picture file.
   */
  private setFile(file: File): void {
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Image must be under 5 MB.');
      return;
    }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  /**
   * Submits the course modal form, initiating either course creation or modification.
   * Triggers reload and toasts status updates.
   */
  async submitCourseModal(): Promise<void> {
    if (!this.courseTitle.trim()) return;
    this.isSaving = true;
    try {
      if (this.editingCourseId === null) {
        await this.coursesApi.createCourse({
          title: this.courseTitle.trim(),
          description: this.courseDescription.trim() || null,
          learningPathId: this.pathId,
          picture: this.selectedFile,
        });
        this.toast.success('Course created');
      } else {
        await this.coursesApi.updateCourse(this.editingCourseId, {
          title: this.courseTitle.trim(),
          description: this.courseDescription.trim() || null,
          learningPathId: this.pathId,
          picture: this.selectedFile,
        });
        this.toast.success('Course updated');
      }
      this.courseModalOpen = false;
      await this.reload();
    } catch (error) {
      this.toast.error((error as Error).message || 'Unable to save course');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  // ── Section modal ────────────────────────────────
  /**
   * Configures target context parameters and opens the section addition modal.
   *
   * @param courseId - The ID of the course in which the section will be added.
   */
  openAddSectionModal(courseId: number): void {
    this.sectionTargetCourseId = courseId;
    this.sectionTitle = '';
    this.sectionDescription = '';
    this.sectionModalOpen = true;
  }

  /**
   * Submits the section creation form, linking the new section to the target course.
   */
  async submitSectionModal(): Promise<void> {
    if (!this.sectionTitle.trim() || this.sectionTargetCourseId === null) return;
    this.isSaving = true;
    try {
      await this.sectionsApi.createSection({
        title: this.sectionTitle.trim(),
        description: this.sectionDescription.trim() || null,
        courseId: this.sectionTargetCourseId,
      });
      this.toast.success('Section added');
      this.sectionModalOpen = false;
      await this.reload();
    } catch (error) {
      this.toast.error((error as Error).message || 'Add section failed');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  // ── Lesson modal ─────────────────────────────────
  /**
   * Resets form states, calculates the sequential order index, and opens the lesson addition modal.
   *
   * @param sectionId - The ID of the section in which the lesson will be added.
   */
  openAddLessonModal(sectionId: number): void {
    this.lessonTargetSectionId = sectionId;
    this.lessonTitle = '';
    this.lessonDescription = '';
    this.lessonVideoFile = null;
    this.lessonLinkUrl = '';
    this.lessonMaterialType = 0; // Default to Video
    // Auto-compute order: count existing lessons in this section + 1
    const section = this.tree?.courses
      .flatMap(c => c.sections)
      .find(s => s.id === sectionId);
    this.lessonOrder = (section?.lessons?.length ?? 0) + 1;
    this.lessonModalOpen = true;
  }

  /**
   * Handles lesson video file selection updates.
   *
   * @param event - The input change event.
   */
  onLessonVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.lessonVideoFile = input.files[0];
    }
  }

  /**
   * Validates type settings, verifies that necessary assets (video files vs. external URLs)
   * exist, and submits a lesson creation request to the LessonsApiService.
   */
  async submitLessonModal(): Promise<void> {
    if (!this.lessonTitle.trim() || this.lessonTargetSectionId === null) return;
    
    const materialTypeNum = Number(this.lessonMaterialType);
    
    // Validate based on material type
    if (materialTypeNum === 3) {
      if (!this.lessonLinkUrl.trim()) {
        this.toast.error('Please provide a valid link URL.');
        return;
      }
    } else {
      if (!this.lessonVideoFile) {
        this.toast.error('Please select a file to upload.');
        return;
      }
    }

    this.isSaving = true;
    try {
      await this.lessonsApi.createLesson({
        title: this.lessonTitle.trim(),
        description: this.lessonDescription.trim() || null,
        content: '',
        videoUrl: materialTypeNum !== 3 ? (this.lessonVideoFile || undefined) : undefined,
        linkUrl: materialTypeNum === 3 ? this.lessonLinkUrl.trim() : undefined,
        materialType: materialTypeNum,
        sectionId: this.lessonTargetSectionId,
        order: this.lessonOrder,
      });
      this.toast.success('Lesson added');
      this.lessonModalOpen = false;
      await this.reload();
    } catch (error) {
      this.toast.error((error as Error).message || 'Add lesson failed');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  // ── Inline editing (sections/lessons) ────────────
  /**
   * Processes inline title and description updates for a specific section.
   *
   * @param sectionId - The section ID.
   * @param event - Object holding new text inputs.
   */
  async updateSection(sectionId: number, event: { title: string; description: string }): Promise<void> {
    try {
      await this.sectionsApi.updateSection(sectionId, { title: event.title, description: event.description || null });
      this.editingKey = '';
      this.toast.success('Section updated');
      await this.reload();
    } catch (error) {
      this.toast.error((error as Error).message || 'Update section failed');
    }
  }

  /**
   * Processes inline title and description updates for a specific lesson.
   *
   * @param lesson - The lesson object.
   * @param event - Object holding new text inputs.
   */
  async updateLesson(lesson: LessonResponseDTO, event: { title: string; description: string }): Promise<void> {
    try {
      await this.lessonsApi.updateLesson(lesson.id, { title: event.title, description: event.description || null, content: lesson.content || '' });
      this.editingKey = '';
      this.toast.success('Lesson updated');
      await this.reload();
    } catch (error) {
      this.toast.error((error as Error).message || 'Update lesson failed');
    }
  }

  // ── Deletes ──────────────────────────────────────
  /**
   * Prompts user and deletes a course record.
   *
   * @param id - The course ID.
   */
  async removeCourse(id: number): Promise<void> {
    const course = this.tree?.courses?.find((c) => c.id === id);
    if (!course) return;

    this.deleteItemType = 'course';
    this.deleteItemId = id;
    this.deleteItemTitle = course.title;
    this.deleteConfirmText = '';
    this.deleteModalOpen = true;
  }

  /**
   * Prompts user and deletes a section record.
   *
   * @param id - The section ID.
   */
  async removeSection(id: number): Promise<void> {
    const section = this.tree?.courses
      ?.flatMap((c) => c.sections || [])
      ?.find((s) => s.id === id);
    if (!section) return;

    this.deleteItemType = 'section';
    this.deleteItemId = id;
    this.deleteItemTitle = section.title;
    this.deleteConfirmText = '';
    this.deleteModalOpen = true;
  }

  /**
   * Performs actual deletion after safety text confirmation matches.
   */
  async confirmDelete(): Promise<void> {
    if (this.deleteConfirmText.trim().toLowerCase() !== 'delete' || !this.deleteItemId || !this.deleteItemType) return;
    
    const id = this.deleteItemId;
    const type = this.deleteItemType;
    this.deleteModalOpen = false;

    if (type === 'course') {
      await this.safeDelete(async () => this.coursesApi.deleteCourse(id), 'Course deleted');
    } else if (type === 'section') {
      await this.safeDelete(async () => this.sectionsApi.deleteSection(id), 'Section deleted');
    }
  }

  /**
   * Prompts user and deletes a lesson record.
   *
   * @param id - The lesson ID.
   */
  async removeLesson(id: number): Promise<void> {
    if (!confirm('Delete this lesson?')) return;
    await this.safeDelete(async () => this.lessonsApi.deleteLesson(id), 'Lesson deleted');
  }

  /**
   * Routes the browser to the rich text markdown content editor page for a specific lesson.
   *
   * @param id - The lesson ID.
   */
  editLessonContent(id: number): void {
    void this.router.navigate(['/lessons', id, 'edit']);
  }

  /**
   * Wraps delete operations, triggers toasts on completion, and reloads active lists.
   *
   * @param action - Async delete action delegate.
   * @param successMessage - Toast message on success.
   */
  private async safeDelete(action: () => Promise<void>, successMessage: string): Promise<void> {
    try {
      await action();
      this.toast.success(successMessage);
      await this.reload();
    } catch (error) {
      this.toast.error((error as Error).message || 'Delete failed');
    }
  }

  /**
   * Computes a unique string key identifier for section items.
   *
   * @param section - The section object.
   * @returns Key identifier.
   */
  sectionKey(section: SectionResponseDTO): string {
    return `section-${section.id}`;
  }

  // Drag-and-drop section methods
  /**
   * Sets up drag data transfer when an administrator initiates dragging a section.
   *
   * @param course - The parent course.
   * @param section - The dragged section.
   * @param event - The drag event.
   */
  startSectionDrag(course: CourseResponseDTO, section: SectionResponseDTO, event: DragEvent): void {
    event.stopPropagation();
    if (this.isReordering || this.editingKey === this.sectionKey(section)) return;

    this.draggingSection = { courseId: course.id, sectionId: section.id };
    event.dataTransfer?.setData('text/plain', String(section.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  /**
   * Intercepts dragover events to support target move drops within the same course.
   *
   * @param course - The parent course.
   * @param section - The section hovered over.
   * @param event - The drag event.
   */
  onSectionDragOver(course: CourseResponseDTO, section: SectionResponseDTO, event: DragEvent): void {
    if (!this.draggingSection || this.draggingSection.courseId !== course.id || this.draggingSection.sectionId === section.id) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverSectionId = section.id;
  }

  /**
   * Clears hover indicators when dragging section leaves a target row.
   *
   * @param section - The section left.
   * @param event - The drag event.
   */
  onSectionDragLeave(section: SectionResponseDTO, event: DragEvent): void {
    event.stopPropagation();
    if (this.dragOverSectionId === section.id) this.dragOverSectionId = null;
  }

  /**
   * Handles dropping sections, calculating new visual index allocations,
   * updating local order fields, and dispatching structural reorders to the database.
   *
   * @param course - The parent course.
   * @param targetSection - The section acting as target.
   * @param event - The drag event.
   */
  async dropSection(course: CourseResponseDTO, targetSection: SectionResponseDTO, event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const dragState = this.draggingSection;
    this.dragOverSectionId = null;
    this.draggingSection = null;

    if (!dragState || dragState.courseId !== course.id || dragState.sectionId === targetSection.id) return;

    const sections = course.sections ?? [];
    const fromIndex = sections.findIndex((section) => section.id === dragState.sectionId);
    const toIndex = sections.findIndex((section) => section.id === targetSection.id);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    this.moveItem(sections, fromIndex, toIndex);
    await this.saveSectionOrder(sections);
  }

  /**
   * Clears dragging state metadata on drag termination.
   */
  endSectionDrag(): void {
    this.draggingSection = null;
    this.dragOverSectionId = null;
  }

  // Drag-and-drop lesson methods
  /**
   * Sets up drag data transfer when an administrator initiates dragging a lesson.
   *
   * @param section - The parent section.
   * @param lesson - The dragged lesson.
   * @param event - The drag event.
   */
  startLessonDrag(section: SectionResponseDTO, lesson: LessonResponseDTO, event: DragEvent): void {
    event.stopPropagation();
    if (this.isReordering || this.editingKey === `lesson-${lesson.id}`) return;

    this.draggingLesson = { sectionId: section.id, lessonId: lesson.id };
    event.dataTransfer?.setData('text/plain', String(lesson.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  /**
   * Intercepts dragover events to support lesson drops inside the same section boundary.
   *
   * @param section - The parent section.
   * @param lesson - The lesson hovered over.
   * @param event - The drag event.
   */
  onLessonDragOver(section: SectionResponseDTO, lesson: LessonResponseDTO, event: DragEvent): void {
    if (!this.draggingLesson || this.draggingLesson.sectionId !== section.id || this.draggingLesson.lessonId === lesson.id) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverLessonId = lesson.id;
  }

  /**
   * Clears hover indicators when dragging lesson leaves a target row.
   *
   * @param lesson - The lesson left.
   * @param event - The drag event.
   */
  onLessonDragLeave(lesson: LessonResponseDTO, event: DragEvent): void {
    event.stopPropagation();
    if (this.dragOverLessonId === lesson.id) this.dragOverLessonId = null;
  }

  /**
   * Handles dropping lessons, calculating new visual index allocations, and updating database orders.
   *
   * @param section - The parent section.
   * @param targetLesson - The lesson acting as target.
   * @param event - The drag event.
   */
  async dropLesson(section: SectionResponseDTO, targetLesson: LessonResponseDTO, event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const dragState = this.draggingLesson;
    this.dragOverLessonId = null;
    this.draggingLesson = null;

    if (!dragState || dragState.sectionId !== section.id || dragState.lessonId === targetLesson.id) return;

    const lessons = section.lessons ?? [];
    const fromIndex = lessons.findIndex((lesson) => lesson.id === dragState.lessonId);
    const toIndex = lessons.findIndex((lesson) => lesson.id === targetLesson.id);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    this.moveItem(lessons, fromIndex, toIndex);
    await this.saveLessonOrder(lessons);
  }

  /**
   * Clears dragging state metadata on drag termination.
   */
  endLessonDrag(): void {
    this.draggingLesson = null;
    this.dragOverLessonId = null;
  }

  /**
   * Shifts course order index upwards in the UI list, saving updates.
   *
   * @param index - Current index inside tree arrays.
   * @param event - Click event.
   */
  async moveCourseUp(index: number, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.isReordering || index === 0 || !this.tree || !this.tree.courses) return;

    const courses = this.tree.courses;
    const temp = courses[index];
    courses[index] = courses[index - 1];
    courses[index - 1] = temp;

    await this.saveCourseOrder(courses);
  }

  /**
   * Shifts course order index downwards in the UI list, saving updates.
   *
   * @param index - Current index inside tree arrays.
   * @param event - Click event.
   */
  async moveCourseDown(index: number, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.isReordering || !this.tree || !this.tree.courses || index === this.tree.courses.length - 1) return;

    const courses = this.tree.courses;
    const temp = courses[index];
    courses[index] = courses[index + 1];
    courses[index + 1] = temp;

    await this.saveCourseOrder(courses);
  }

  /**
   * Dispatches bulk course sorting indexes updates to the backend API.
   *
   * @param courses - List of courses.
   */
  private async saveCourseOrder(courses: CourseResponseDTO[]): Promise<void> {
    this.isReordering = true;

    // Update order values internally to match visual
    courses.forEach((c, i) => (c.order = i + 1));

    const dto = courses.map((c) => ({ id: c.id, order: c.order }));
    try {
      await this.coursesApi.reorderCourses(dto);
      this.toast.success('Course order updated');
    } catch (error) {
      this.toast.error((error as Error).message || 'Failed to save course order');
      await this.reload(); // Revert on failure
    } finally {
      this.isReordering = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Dispatches bulk section sorting indexes updates to the backend API.
   *
   * @param sections - List of sections.
   */
  private async saveSectionOrder(sections: SectionResponseDTO[]): Promise<void> {
    this.isReordering = true;
    sections.forEach((section, i) => (section.order = i + 1));

    try {
      await this.sectionsApi.reorderSections(sections.map((section) => ({ id: section.id, order: section.order })));
      this.toast.success('Section order updated');
    } catch (error) {
      this.toast.error((error as Error).message || 'Failed to save section order');
      await this.reload();
    } finally {
      this.isReordering = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Dispatches bulk lesson sorting indexes updates to the backend API.
   *
   * @param lessons - List of lessons.
   */
  private async saveLessonOrder(lessons: LessonResponseDTO[]): Promise<void> {
    this.isReordering = true;
    lessons.forEach((lesson, i) => (lesson.order = i + 1));

    try {
      await this.lessonsApi.reorderLessons(lessons.map((lesson) => ({ id: lesson.id, order: lesson.order })));
      this.toast.success('Lesson order updated');
    } catch (error) {
      this.toast.error((error as Error).message || 'Failed to save lesson order');
      await this.reload();
    } finally {
      this.isReordering = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Modifies array indices to shift items.
   *
   * @param items - Target array.
   * @param fromIndex - Origin array index.
   * @param toIndex - Destination array index.
   */
  private moveItem<T>(items: T[], fromIndex: number, toIndex: number): void {
    const [item] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, item);
  }

  /**
   * Sorts path, course, section, and lesson records in compliance with sequential order variables.
   */
  private sortTree(): void {
    if (!this.tree?.courses) return;

    this.tree.courses.sort((a, b) => this.compareOrder(a, b));
    this.tree.courses.forEach((course) => {
      course.sections?.sort((a, b) => this.compareOrder(a, b));
      course.sections?.forEach((section) => {
        section.lessons?.sort((a, b) => this.compareOrder(a, b));
      });
    });
  }

  /**
   * Sorting comparator delegate.
   *
   * @param a - Left comparison operand.
   * @param b - Right comparison operand.
   * @returns Sorting indicator integer.
   */
  private compareOrder<T extends { id: number; order: number }>(a: T, b: T): number {
    const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
    if (orderDiff !== 0) return orderDiff;

    return a.id - b.id;
  }
}
