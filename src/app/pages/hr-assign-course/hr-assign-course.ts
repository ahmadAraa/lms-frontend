import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of, forkJoin, map } from 'rxjs';
import { LearningPathService } from '../../core/services/learning-path.service';
import { EnrollmentService, UserInfo, UserSearchResult } from '../../core/services/enrollment.service';
import { ActivityService } from '../../core/services/activity.service';
import { AuthService } from '../../core/services/auth';

/**
 * Interface representing a normalized course item pulled from learning path collections.
 */
export interface CourseItem {
  /**
   * The unique course ID.
   */
  id: number;

  /**
   * The display title of the course.
   */
  title: string;

  /**
   * Optional description summarizing the course curriculum.
   */
  description?: string;

  /**
   * Parent learning path ID to which the course belongs.
   */
  pathId: number;

  /**
   * Display title of the parent learning path.
   */
  pathTitle: string;

  /**
   * Total count of sections inside this course.
   */
  sectionCount: number;

  /**
   * ID of the first lesson inside the curriculum, used to deep-link previews.
   */
  firstLessonId: number | null;
}

/**
 * HR Assign Course Component.
 * Enables HR staff or managers to enroll individual employees into specific courses.
 * Pulls the path-course tree and flattens it for convenient listing, utilizes debounced autocomplete
 * searches for employee verification, handles course routing previews, and dispatches API enrollments.
 */
@Component({
  selector: 'app-hr-assign-course',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-assign-course.html',
  styleUrl: './hr-assign-course.css',
})
export class HrAssignCourse implements OnInit {
  // User search
  /**
   * Signal storing the current user-typed search string.
   */
  searchQuery = signal('');

  /**
   * Signal containing the list of search results matching the query.
   */
  searchResults = signal<UserSearchResult[]>([]);

  /**
   * Signal indicating if a search query is actively processing on the server.
   */
  isSearching = signal(false);

  /**
   * Signal indicating if detailed user profile query is in flight.
   */
  isLoadingUserInfo = signal(false);

  /**
   * Signal holding the currently selected employee's UserInfo details.
   */
  selectedUser = signal<UserInfo | null>(null);

  /**
   * Signal determining if the autocomplete dropdown list should be visible.
   */
  showDropdown = signal(false);

  // Courses
  /**
   * Signal storing the compiled catalog of available courses.
   */
  courses = signal<CourseItem[]>([]);

  /**
   * Signal holding the ID of the selected course.
   */
  selectedCourseId = signal<number | null>(null);

  // Submit state
  /**
   * Signal tracking if the course enrollment request is actively submitting.
   */
  isSubmitting = signal(false);

  /**
   * Signal capturing successful enrollment notifications.
   */
  successMessage = signal('');

  /**
   * Signal capturing errors encountered during assignments.
   */
  errorMessage = signal('');

  /**
   * Subject pipeline routing typed search queries to debounce/switchMap operators.
   */
  private search$ = new Subject<string>();

  /**
   * Concurrency ID to discard out-of-order asynchronous user profile details responses.
   */
  private userInfoRequestId = 0;

  /**
   * Constructs the HrAssignCourse component.
   *
   * @param learningPathService - Service to fetch available learning paths and their child courses.
   * @param enrollmentService - Service to fetch user info, search directories, and perform course enrollments.
   * @param location - Angular location provider to perform back browser navigations.
   * @param activityService - Local mock or service logging system activities.
   * @param authService - Service to extract current manager/administrator ID.
   * @param router - Navigation controller to route course previews.
   */
  constructor(
    private learningPathService: LearningPathService,
    private enrollmentService: EnrollmentService,
    private location: Location,
    private activityService: ActivityService,
    private authService: AuthService,
    private router: Router,
  ) {}

  /**
   * Initial component hook. Queries available paths, extracts and flattens courses,
   * resolves first lesson references, and boots up the reactive user search stream with debounce.
   */
  ngOnInit() {
    this.learningPathService.getPaths().subscribe({
      next: (paths) => {
        const courseList: CourseItem[] = [];
        for (const path of paths) {
          for (const course of path.courses ?? []) {
            courseList.push({
              id: course.id,
              title: course.title,
              description: course.description,
              pathId: path.id,
              pathTitle: path.title,
              sectionCount: course.sections?.length ?? 0,
              firstLessonId: this.getFirstLessonId(course),
            });
          }
        }
        this.courses.set(courseList);
      },
      error: () => {},
    });

    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.trim().length < 2) {
          this.searchResults.set([]);
          this.isSearching.set(false);
          return of([]);
        }
        this.isSearching.set(true);
        return this.enrollmentService.searchUsers(q).pipe(
          switchMap((users) => {
            if (users.length === 0) return of([]);
            return forkJoin(
              users.map((user) =>
                this.enrollmentService.getUserInfo(user.id).pipe(catchError(() => of(null))),
              ),
            ).pipe(
              map((infos) =>
                infos
                  .filter((info): info is UserInfo => info?.role === 'EMPLOYEE')
                  .map((info) => ({
                    id: info.id,
                    userName: info.userName,
                    email: info.email,
                  })),
              ),
            );
          }),
          catchError(() => of([]))
        );
      })
    ).subscribe(results => {
      this.searchResults.set(results);
      this.isSearching.set(false);
      this.showDropdown.set(results.length > 0);
    });
  }

  /**
   * Handler dispatched when a user types into the search box.
   * Invalidates outdated user profile requests and updates the search query pipe.
   *
   * @param event - The input event.
   */
  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.userInfoRequestId++;
    this.isLoadingUserInfo.set(false);
    this.searchQuery.set(value);
    this.selectedUser.set(null);
    this.search$.next(value);
    if (value.trim().length < 2) {
      this.showDropdown.set(false);
    }
  }

  /**
   * Selects an employee from the autocomplete drop-down, loading their profile info.
   * Asserts that only regular employees can receive courses, raising errors otherwise.
   *
   * @param user - The chosen search result item.
   */
  selectUser(user: UserSearchResult) {
    const requestId = ++this.userInfoRequestId;
    this.isLoadingUserInfo.set(true);
    this.selectedUser.set(null);
    this.searchQuery.set(user.userName);
    this.showDropdown.set(false);
    this.searchResults.set([]);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.enrollmentService.getUserInfo(user.id).subscribe({
      next: (info) => {
        if (requestId !== this.userInfoRequestId) return;
        this.isLoadingUserInfo.set(false);
        if (info.role !== 'EMPLOYEE') {
          this.searchQuery.set('');
          this.errorMessage.set(
            `Only employees can be enrolled. ${info.userName || user.userName} is ${this.roleLabel(info.role)}.`,
          );
          return;
        }
        this.selectedUser.set(info);
        this.searchQuery.set(info.userName || user.userName);
      },
      error: () => {
        if (requestId !== this.userInfoRequestId) return;
        this.isLoadingUserInfo.set(false);
        this.searchQuery.set('');
        this.errorMessage.set('Could not verify this user role. Please try another employee.');
      },
    });
  }

  /**
   * Clears the autocomplete search box and resets active employee selections.
   */
  clearUser() {
    this.userInfoRequestId++;
    this.selectedUser.set(null);
    this.isLoadingUserInfo.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showDropdown.set(false);
  }

  /**
   * Selects or deselects a course item in the list panel.
   *
   * @param id - The course ID.
   */
  selectCourse(id: number) {
    this.selectedCourseId.set(this.selectedCourseId() === id ? null : id);
  }

  /**
   * Route user to a course preview page. If a first lesson ID is resolved,
   * routes them straight into the Lesson Viewer in visual preview mode, otherwise course details.
   *
   * @param course - The target course item.
   * @param event - The trigger click event.
   */
  previewCourse(course: CourseItem, event: Event) {
    event.stopPropagation();
    if (course.firstLessonId) {
      void this.router.navigate(['/lesson', course.firstLessonId], {
        state: { courseId: course.id, pathId: course.pathId },
      });
      return;
    }

    void this.router.navigate(['/course', course.id], {
      state: { pathId: course.pathId },
    });
  }

  /**
   * Resolves the first available lesson ID within a course's curriculum structure.
   *
   * @param course - The course tree node.
   * @returns The resolved numeric lesson ID, or null.
   */
  private getFirstLessonId(course: { sections?: { lessons?: unknown[] }[] }): number | null {
    for (const section of course.sections ?? []) {
      for (const lesson of section.lessons ?? []) {
        const node = lesson && typeof lesson === 'object' ? lesson as Record<string, unknown> : {};
        const id = Number(node['id'] ?? node['Id']);
        if (Number.isFinite(id) && id > 0) return id;
      }
    }

    return null;
  }

  /**
   * Assesses if form state meets submission prerequisites (i.e. valid employee selected,
   * course selected, and no operations are currently in-flight).
   *
   * @returns True if submit button should be enabled.
   */
  canSubmit(): boolean {
    return (
      this.selectedUser()?.role === 'EMPLOYEE' &&
      !!this.selectedCourseId() &&
      !this.isSubmitting() &&
      !this.isLoadingUserInfo()
    );
  }

  /**
   * Enrolls the selected employee into the selected course.
   * Triggers a logging transaction in the activity panel and clears form selections upon success.
   */
  assign() {
    if (!this.canSubmit()) return;
    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const managerId = this.authService.getUserId();
    const selectedUser = this.selectedUser();
    const selectedCourseId = this.selectedCourseId();

    if (!selectedUser || selectedUser.role !== 'EMPLOYEE' || !selectedCourseId) {
      this.isSubmitting.set(false);
      this.errorMessage.set('Only employees can be enrolled in a course.');
      return;
    }

    this.enrollmentService.enrollCourse(selectedUser.id, selectedCourseId, managerId).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const userName = selectedUser.userName;
        const courseTitle = this.courses().find(c => c.id === selectedCourseId)?.title ?? '';
        this.successMessage.set(`✓ ${userName} has been enrolled in "${courseTitle}"`);
        this.activityService.log(
          'assignment_ind',
          `<strong>${userName}</strong> was assigned to the <strong>${courseTitle}</strong> course.`,
          'Course Assignments'
        );
        this.clearUser();
        this.selectedCourseId.set(null);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error || 'Enrollment failed. Please try again.');
      },
    });
  }

  /**
   * Converts raw database role strings into reader-friendly terminology labels.
   *
   * @param role - The raw role.
   * @returns Dynamic label string.
   */
  roleLabel(role: string): string {
    switch ((role ?? '').toUpperCase()) {
      case 'HR': return 'HR';
      case 'MANAGER': return 'a manager';
      case 'EMPLOYEE': return 'an employee';
      default: return 'not an employee';
    }
  }

  /**
   * Navigates back one step in browser window history.
   */
  goBack() {
    this.location.back();
  }
}
