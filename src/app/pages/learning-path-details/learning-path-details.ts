import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LearningPathService, LearningPathResponseDto, CourseResponseDTO } from '../../services/learning-path.service';
import { ProgressService } from '../../services/progress.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-learning-path-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './learning-path-details.html',
  styleUrl: './learning-path-details.css'
})
export class LearningPathDetails implements OnInit {
  pathId = signal<number | null>(null);
  path = signal<LearningPathResponseDto | null>(null);
  courseProgressMap = signal<Map<number, number>>(new Map());
  isLoading = signal(true);
  error = signal('');

  private readonly baseUrl = 'http://localhost:5232';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private learningPathService: LearningPathService,
    private progressService: ProgressService,
    private authService: AuthService,
  ) {}

  goBack() {
    void this.router.navigate(this.isStaffPreview() ? ['/learning-paths'] : ['/employee/dashboard']);
  }

  async openCourse(course: CourseResponseDTO) {
    if (!this.isStaffPreview()) {
      const access = await this.progressService.canAccess(course.id);
      if (!access.canAccess) {
        void this.router.navigate(['/course', course.id], {
          state: {
            course,
            pathId: this.pathId(),
            lockReason: access.reason,
          },
        });
        return;
      }
    }

    if (course.sections && course.sections.length > 0) {
      for (const section of course.sections) {
        if (section.lessons && section.lessons.length > 0) {
          const firstLesson = section.lessons[0] as { id?: number };
          if (firstLesson.id) {
            void this.router.navigate(['/lesson', firstLesson.id], {
              state: { courseId: course.id, pathId: this.pathId() },
            });
            return;
          }
        }
      }
    }

    void this.router.navigate(['/course', course.id], {
      state: { course, pathId: this.pathId() }
    });
  }

  getCourseImageUrl(course: CourseResponseDTO): string {
    if (!course.image) return '';
    if (course.image.startsWith('http')) return course.image;
    return `${this.baseUrl}/${course.image.replace(/^\//, '')}`;
  }

  getLessonCount(course: CourseResponseDTO): number {
    if (!course.sections) return 0;
    return course.sections.reduce((sum, s) => sum + (s.lessons?.length ?? 0), 0);
  }

  getSectionCount(course: CourseResponseDTO): number {
    return course.sections?.length ?? 0;
  }

  getCourseProgress(courseId: number): number {
    return this.courseProgressMap().get(courseId) ?? 0;
  }

  getCourseStatus(courseId: number): string {
    const progress = this.getCourseProgress(courseId);
    if (progress >= 100) return 'Completed';
    if (progress > 0) return 'In Progress';
    return 'Available';
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.pathId.set(parseInt(idParam, 10));
      this.loadPathDetails();
    } else {
      this.isLoading.set(false);
      this.error.set('No path ID found in the URL.');
    }
  }

  loadPathDetails() {
    if (!this.pathId()) return;

    this.isLoading.set(true);
    this.learningPathService.getPathById(this.pathId()!).subscribe({
      next: (data) => {
        this.path.set(data);
        this.isLoading.set(false);
        void this.loadCourseProgress(data.courses ?? []);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(`Error ${err.status}: ${err.message}`);
        this.isLoading.set(false);
        console.error('loadPathDetails failed:', err);
      }
    });
  }

  async loadCourseProgress(courses: CourseResponseDTO[]) {
    if (this.isStaffPreview()) {
      this.courseProgressMap.set(new Map());
      return;
    }

    const courseIds = [...new Set(courses.map((course) => course.id).filter(Boolean))];

    if (courseIds.length === 0) {
      this.courseProgressMap.set(new Map());
      return;
    }

    const results = await Promise.all(
      courseIds.map((courseId) => this.progressService.getCourseProgress(courseId))
    );
    const progressMap = new Map<number, number>();
    results.forEach((result) => progressMap.set(result.courseId, result.progress));
    this.courseProgressMap.set(progressMap);
  }

  isStaffPreview(): boolean {
    const role = this.authService.getUserRole();

    return role === 'HR' || role === 'MANAGER';
  }
}
