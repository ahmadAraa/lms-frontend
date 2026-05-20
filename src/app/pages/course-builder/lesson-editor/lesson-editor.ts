import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LessonsApiService } from '../../../core/services/lessons-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-lesson-editor-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-editor.html',
  styleUrl: './lesson-editor.css',
})
export class LessonEditorPage implements OnInit {
  lessonId = 0;
  loading = true;
  error = '';
  title = '';
  description = '';
  content = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly lessonsApi: LessonsApiService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    if (!this.lessonId) {
      this.error = 'Invalid lesson id.';
      this.loading = false;
      return;
    }
    void this.loadLesson();
  }

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

  goBack(): void {
    this.location.back();
  }
}
