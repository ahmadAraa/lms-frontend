import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LearningPathService, LearningPathResponseDto, CourseResponseDTO } from '../../services/learning-path.service';
import { AuthService } from '../../services/auth';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell';

@Component({
  selector: 'app-learning-path-details',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationBellComponent],
  templateUrl: './learning-path-details.html',
  styleUrl: './learning-path-details.css'
})
export class LearningPathDetails implements OnInit {
  pathId = signal<number | null>(null);
  path = signal<LearningPathResponseDto | null>(null);
  isLoading = signal(true);
  error = signal('');

  private readonly baseUrl = 'http://localhost:5232';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private learningPathService: LearningPathService,
    private authService: AuthService,
  ) {}

  goBack() {
    void this.router.navigate(['/employee/dashboard']);
  }

  logout() {
    this.authService.logout();
    void this.router.navigate(['/']);
  }

  openCourse(course: CourseResponseDTO) {
    if (course.sections && course.sections.length > 0) {
      for (const section of course.sections) {
        if (section.lessons && section.lessons.length > 0) {
          const firstLesson = section.lessons[0] as { id?: number };
          if (firstLesson.id) {
            void this.router.navigate(['/lesson', firstLesson.id]);
            return;
          }
        }
      }
    }

    this.router.navigate(['/course', course.id], {
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
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(`Error ${err.status}: ${err.message}`);
        this.isLoading.set(false);
        console.error('loadPathDetails failed:', err);
      }
    });
  }
}
