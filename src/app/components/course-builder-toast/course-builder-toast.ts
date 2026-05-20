import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-course-builder-toast',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './course-builder-toast.html',
  styleUrl: './course-builder-toast.css',
})
export class CourseBuilderToast {
  constructor(public toastService: ToastService) {}
}
