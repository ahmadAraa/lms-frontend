import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InlineEditComponent } from '../../../components/course-builder/inline-edit.component';
import { CoursesApiService } from '../../../services/courses-api.service';
import { LearningPathsApiService } from '../../../services/learning-paths-api.service';
import { LessonsApiService } from '../../../services/lessons-api.service';
import { SectionsApiService } from '../../../services/sections-api.service';
import { ToastService } from '../../../services/toast.service';
import {
  BASE_URL,
  CourseResponseDTO,
  LearningPathResponseDto,
  LessonResponseDTO,
  SectionResponseDTO,
} from '../../../types/course-builder.types';

interface SectionDragState {
  courseId: number;
  sectionId: number;
}

interface LessonDragState {
  sectionId: number;
  lessonId: number;
}

@Component({
  selector: 'app-course-manager-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InlineEditComponent],
  templateUrl: './course-manager.html',
  styleUrl: './course-manager.css',
})
export class CourseManagerPage implements OnInit {
  pathId = 0;
  tree: LearningPathResponseDto | null = null;
  loading = true;
  error = '';
  expandedCourseIds = new Set<number>();
  expandedSectionIds = new Set<number>();
  editingKey = '';

  // Course modal
  courseModalOpen = false;
  editingCourseId: number | null = null;
  courseTitle = '';
  courseDescription = '';
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isDragOver = false;
  isSaving = false;
  isReordering = false;
  draggingSection: SectionDragState | null = null;
  dragOverSectionId: number | null = null;
  draggingLesson: LessonDragState | null = null;
  dragOverLessonId: number | null = null;

  // Section modal
  sectionModalOpen = false;
  sectionTargetCourseId: number | null = null;
  sectionTitle = '';
  sectionDescription = '';

  // Lesson modal
  lessonModalOpen = false;
  lessonTargetSectionId: number | null = null;
  lessonTitle = '';
  lessonDescription = '';
  lessonVideoFile: File | null = null;
  lessonLinkUrl = '';
  lessonMaterialType = 0; // default to Video (0)
  lessonOrder = 1;

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

  toggleCourse(id: number): void {
    this.expandedCourseIds.has(id) ? this.expandedCourseIds.delete(id) : this.expandedCourseIds.add(id);
  }

  toggleSection(id: number): void {
    this.expandedSectionIds.has(id) ? this.expandedSectionIds.delete(id) : this.expandedSectionIds.add(id);
  }

  // ── Course Image helpers ─────────────────────────
  getCourseImageUrl(course: CourseResponseDTO): string {
    if (!course.pictureUrl) return '';
    if (course.pictureUrl.startsWith('http')) return course.pictureUrl;
    return `${BASE_URL}/${course.pictureUrl.replace(/^\//, '')}`;
  }

  getLessonCount(course: CourseResponseDTO): number {
    return (course.sections ?? []).reduce((sum, s) => sum + (s.lessons?.length ?? 0), 0);
  }

  getSectionCount(course: CourseResponseDTO): number {
    return course.sections?.length ?? 0;
  }

  // ── Course modal ─────────────────────────────────
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

  previewLesson(course: CourseResponseDTO, lessonId: number): void {
    void this.router.navigate(['/lesson', lessonId], {
      state: { courseId: course.id, pathId: this.pathId },
    });
  }

  private getFirstLessonId(course: CourseResponseDTO): number | null {
    const sections = [...(course.sections ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const section of sections) {
      const firstLesson = [...(section.lessons ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
      if (firstLesson?.id) return firstLesson.id;
    }

    return null;
  }

  openAddCourseModal(): void {
    this.editingCourseId = null;
    this.courseTitle = '';
    this.courseDescription = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.courseModalOpen = true;
  }

  openEditCourseModal(course: CourseResponseDTO): void {
    this.editingCourseId = course.id;
    this.courseTitle = course.title;
    this.courseDescription = course.description ?? '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.courseModalOpen = true;
  }

  // ── File selection / drag-drop ──────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

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

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

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
  openAddSectionModal(courseId: number): void {
    this.sectionTargetCourseId = courseId;
    this.sectionTitle = '';
    this.sectionDescription = '';
    this.sectionModalOpen = true;
  }

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

  onLessonVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.lessonVideoFile = input.files[0];
    }
  }

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
  async removeCourse(id: number): Promise<void> {
    if (!confirm('Delete this course?')) return;
    await this.safeDelete(async () => this.coursesApi.deleteCourse(id), 'Course deleted');
  }

  async removeSection(id: number): Promise<void> {
    if (!confirm('Delete this section?')) return;
    await this.safeDelete(async () => this.sectionsApi.deleteSection(id), 'Section deleted');
  }

  async removeLesson(id: number): Promise<void> {
    if (!confirm('Delete this lesson?')) return;
    await this.safeDelete(async () => this.lessonsApi.deleteLesson(id), 'Lesson deleted');
  }

  editLessonContent(id: number): void {
    void this.router.navigate(['/lessons', id, 'edit']);
  }

  private async safeDelete(action: () => Promise<void>, successMessage: string): Promise<void> {
    try {
      await action();
      this.toast.success(successMessage);
      await this.reload();
    } catch (error) {
      this.toast.error((error as Error).message || 'Delete failed');
    }
  }

  sectionKey(section: SectionResponseDTO): string {
    return `section-${section.id}`;
  }

  startSectionDrag(course: CourseResponseDTO, section: SectionResponseDTO, event: DragEvent): void {
    event.stopPropagation();
    if (this.isReordering || this.editingKey === this.sectionKey(section)) return;

    this.draggingSection = { courseId: course.id, sectionId: section.id };
    event.dataTransfer?.setData('text/plain', String(section.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onSectionDragOver(course: CourseResponseDTO, section: SectionResponseDTO, event: DragEvent): void {
    if (!this.draggingSection || this.draggingSection.courseId !== course.id || this.draggingSection.sectionId === section.id) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverSectionId = section.id;
  }

  onSectionDragLeave(section: SectionResponseDTO, event: DragEvent): void {
    event.stopPropagation();
    if (this.dragOverSectionId === section.id) this.dragOverSectionId = null;
  }

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

  endSectionDrag(): void {
    this.draggingSection = null;
    this.dragOverSectionId = null;
  }

  startLessonDrag(section: SectionResponseDTO, lesson: LessonResponseDTO, event: DragEvent): void {
    event.stopPropagation();
    if (this.isReordering || this.editingKey === `lesson-${lesson.id}`) return;

    this.draggingLesson = { sectionId: section.id, lessonId: lesson.id };
    event.dataTransfer?.setData('text/plain', String(lesson.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onLessonDragOver(section: SectionResponseDTO, lesson: LessonResponseDTO, event: DragEvent): void {
    if (!this.draggingLesson || this.draggingLesson.sectionId !== section.id || this.draggingLesson.lessonId === lesson.id) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverLessonId = lesson.id;
  }

  onLessonDragLeave(lesson: LessonResponseDTO, event: DragEvent): void {
    event.stopPropagation();
    if (this.dragOverLessonId === lesson.id) this.dragOverLessonId = null;
  }

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

  endLessonDrag(): void {
    this.draggingLesson = null;
    this.dragOverLessonId = null;
  }

  async moveCourseUp(index: number, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.isReordering || index === 0 || !this.tree || !this.tree.courses) return;

    const courses = this.tree.courses;
    const temp = courses[index];
    courses[index] = courses[index - 1];
    courses[index - 1] = temp;

    await this.saveCourseOrder(courses);
  }

  async moveCourseDown(index: number, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.isReordering || !this.tree || !this.tree.courses || index === this.tree.courses.length - 1) return;

    const courses = this.tree.courses;
    const temp = courses[index];
    courses[index] = courses[index + 1];
    courses[index + 1] = temp;

    await this.saveCourseOrder(courses);
  }

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

  private moveItem<T>(items: T[], fromIndex: number, toIndex: number): void {
    const [item] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, item);
  }

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

  private compareOrder<T extends { id: number; order: number }>(a: T, b: T): number {
    const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
    if (orderDiff !== 0) return orderDiff;

    return a.id - b.id;
  }
}
