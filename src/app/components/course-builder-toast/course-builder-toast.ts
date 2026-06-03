import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

/**
 * Toast alert presentation container component.
 *
 * Hooks into the application-wide ToastService messages$ observable stream
 * to display interactive overlay alerts for CRUD action outcomes.
 */
@Component({
  selector: 'app-course-builder-toast',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './course-builder-toast.html',
  styleUrl: './course-builder-toast.css',
})
export class CourseBuilderToast {
  /**
   * Constructs the CourseBuilderToast component.
   *
   * @param toastService - The global ToastService containing streams of active toast alerts.
   */
  constructor(public toastService: ToastService) {}
}
