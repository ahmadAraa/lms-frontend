import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LearningPathCardComponent } from '../../../components/course-builder/learning-path-card.component';
import { LearningPathsApiService } from '../../../core/services/learning-paths-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { LearningPathResponseDto } from '../../../types/course-builder.types';

@Component({
  selector: 'app-learning-paths-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LearningPathCardComponent],
  templateUrl: './learning-paths.html',
  styleUrl: './learning-paths.css',
})
export class LearningPathsPage implements OnInit {
  loading = true;
  error = '';
  paths: LearningPathResponseDto[] = [];
  modalOpen = false;
  editingId: number | null = null;
  title = '';
  description = '';
  isSaving = false;

  // Image upload
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isDragOver = false;

  constructor(
    private readonly api: LearningPathsApiService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    void this.loadPaths();
  }

  async loadPaths(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.paths = await this.api.getPaths();
    } catch (error) {
      this.error = (error as Error).message || 'Failed to load learning paths.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openCreateModal(): void {
    this.editingId = null;
    this.title = '';
    this.description = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.modalOpen = true;
  }

  openEditModal(path: LearningPathResponseDto): void {
    this.editingId = path.id;
    this.title = path.title;
    this.description = path.description ?? '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.modalOpen = true;
  }

  // ── File selection / drag-drop ──────────────────────
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

  // ── Submit ──────────────────────────────────────────
  async submitModal(): Promise<void> {
    if (!this.title.trim()) return;
    this.isSaving = true;
    try {
      if (this.editingId === null) {
        await this.api.addPath({
          title: this.title.trim(),
          description: this.description.trim() || null,
          picture: this.selectedFile,
        });
        this.toast.success('Learning path created');
      } else {
        await this.api.updatePath(this.editingId, {
          title: this.title.trim(),
          description: this.description.trim() || null,
          picture: this.selectedFile,
        });
        this.toast.success('Learning path updated');
      }
      this.modalOpen = false;
      await this.loadPaths();
    } catch (error) {
      this.toast.error((error as Error).message || 'Unable to save learning path');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async deletePath(id: number): Promise<void> {
    if (!confirm('Delete this learning path?')) return;
    try {
      await this.api.deletePath(id);
      this.toast.success('Learning path deleted');
      await this.loadPaths();
    } catch (error) {
      this.toast.error((error as Error).message || 'Unable to delete learning path');
    }
  }

  manageCourses(id: number): void {
    void this.router.navigate(['/learning-paths', id]);
  }
}
