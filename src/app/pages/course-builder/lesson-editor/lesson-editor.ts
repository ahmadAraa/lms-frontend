import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LessonsApiService } from '../../../core/services/lessons-api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Lesson Rich Text Editor Page Component.
 * Provides administrators with editing capabilities for lesson details, descriptions,
 * and markdown/rich-text content. Fetches properties from the active route parameter,
 * manages intermediate changes, and saves content back through LessonsApiService.
 */
@Component({
  selector: 'app-lesson-editor-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-editor.html',
  styleUrl: './lesson-editor.css',
})
export class LessonEditorPage implements OnInit {
  /**
   * ID of the lesson currently being edited.
   */
  lessonId = 0;

  /**
   * Flag indicating if the lesson details are currently loading.
   */
  loading = true;

  /**
   * Captures and displays load failure errors.
   */
  error = '';

  /**
   * Title text string bound to input elements.
   */
  title = '';

  /**
   * Description text string bound to textareas.
   */
  description = '';

  /**
   * Markdown or raw HTML lesson content string.
   */
  content = '';

  /**
   * Constructs the LessonEditorPage component.
   *
   * @param route - Active route configuration to read parameters.
   * @param location - Angular location provider to enable back routing.
   * @param lessonsApi - API service to load and update lesson records.
   * @param toast - System toast notification manager.
   * @param cdr - Change detector utility.
   */
  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly lessonsApi: LessonsApiService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initial page hook. Resolves the target lesson ID parameter from the active route
   * and triggers the fetch operation.
   */
  ngOnInit(): void {
    this.lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    if (!this.lessonId) {
      this.error = 'Invalid lesson id.';
      this.loading = false;
      return;
    }
    void this.loadLesson();
  }

  /**
   * Fetches the current lesson's properties (title, description, content) from the API.
   */
  async loadLesson(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const lesson = await this.lessonsApi.getLessonById(this.lessonId);
      this.title = lesson.title;
      this.description = lesson.description ?? '';
      this.content = lesson.content ?? '';
    } catch (error) {
      this.error = (error as Error).message || 'Failed to load lesson.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Validates form parameters and dispatches updating payloads to LessonsApiService.
   */
  async save(): Promise<void> {
    try {
      await this.lessonsApi.updateLesson(this.lessonId, {
        title: this.title.trim(),
        description: this.description.trim() || null,
        content: this.content,
      });
      this.toast.success('Lesson saved');
    } catch (error) {
      this.toast.error((error as Error).message || 'Failed to save lesson');
    }
  }

  /**
   * Navigates the browser history back one step.
   */
  goBack(): void {
    this.location.back();
  }
}
