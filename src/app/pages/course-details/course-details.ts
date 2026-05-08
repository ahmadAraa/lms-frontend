import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CoursesApiService } from '../../services/courses-api.service';
import { SectionsApiService } from '../../services/sections-api.service';
import { ProgressService } from '../../services/progress.service';
import { CourseResponseDTO, SectionResponseDTO } from '../../types/course-builder.types';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-details.html',
  styleUrl: './course-details.css',
})
export class CourseDetails implements OnInit {
  course = signal<CourseResponseDTO | null>(null);
  sections = signal<SectionResponseDTO[]>([]);
  isLoading = signal(true);
  isLocked = signal(false);
  lockReason = signal('Complete the previous course to at least 85% to unlock this one.');
  error = signal('');
  expandedSections = signal<Set<number>>(new Set());
  pathId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coursesApi: CoursesApiService,
    private sectionsApi: SectionsApiService,
    private progressService: ProgressService,
  ) {}

  ngOnInit() {
    const state = history.state as Record<string, unknown>;

    if (state?.['course']) {
      const course = state['course'] as CourseResponseDTO;
      this.course.set(course);
      this.pathId = (state['pathId'] as number) ?? null;
      void this.checkAccessThenLoad(course.id);
    } else {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      if (id) {
        void this.loadCourse(id);
      } else {
        this.error.set('Course not found.');
        this.isLoading.set(false);
      }
    }
  }

  async loadCourse(id: number) {
    try {
      const course = await this.coursesApi.getCourseById(id);
      this.course.set(course);
      await this.checkAccessThenLoad(id);
    } catch {
      this.error.set('Failed to load course.');
      this.isLoading.set(false);
    }
  }

  async checkAccessThenLoad(courseId: number) {
    const result = await this.progressService.canAccess(courseId);
    if (!result.canAccess) {
      this.isLocked.set(true);
      if (result.reason) this.lockReason.set(this.cleanReason(result.reason));
      this.isLoading.set(false);
      return;
    }
    await this.loadSections(courseId);
  }

  async loadSections(courseId: number) {
    this.isLoading.set(true);
    try {
      const sections = await this.sectionsApi.getSectionsByCourse(courseId);
      this.sections.set(sections);
    } catch {
      this.error.set('Failed to load course content.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Strip surrounding HTTP error prefix that fetchJson adds */
  private cleanReason(raw: string): string {
    // fetchJson wraps 403 as "HTTP Error 403: Forbidden" or passes the body message
    const match = raw.match(/Complete previous course.*$/i);
    if (match) return match[0];
    if (raw.toLowerCase().includes('403')) {
      return 'Complete the previous course to at least 85% to unlock this one.';
    }
    return raw;
  }

  toggleSection(sectionId: number) {
    const current = new Set(this.expandedSections());
    if (current.has(sectionId)) {
      current.delete(sectionId);
    } else {
      current.add(sectionId);
    }
    this.expandedSections.set(current);
  }

  isSectionExpanded(sectionId: number): boolean {
    return this.expandedSections().has(sectionId);
  }

  openLesson(lessonId: number) {
    this.router.navigate(['/lesson', lessonId]);
  }

  backLink(): string[] {
    return this.pathId ? ['/learning-path', String(this.pathId)] : ['/employee/dashboard'];
  }

  goDashboard() {
    void this.router.navigate(['/employee/dashboard']);
  }

}
