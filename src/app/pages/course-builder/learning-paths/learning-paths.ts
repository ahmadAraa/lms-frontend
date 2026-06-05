import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LearningPathCardComponent } from '../../../components/course-builder/learning-path-card.component';
import { LearningPathsApiService } from '../../../core/services/learning-paths-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { LearningPathResponseDto } from '../../../types/course-builder.types';

/**
 * Learning Paths Roster Page Component.
 * Acts as the entry point for the Course Builder panel. Lists all active learning paths,
 * allows creating new paths or editing properties (with visual cover art drag-and-drop file support),
 * and handles routing administrators to course catalogs.
 */
@Component({
  selector: 'app-learning-paths-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LearningPathCardComponent],
  templateUrl: './learning-paths.html',
  styleUrl: './learning-paths.css',
})
export class LearningPathsPage implements OnInit {
  /**
   * Flag indicating if learning paths list is currently fetching.
   */
  loading = true;

  /**
   * Error message string populated on API load failure.
   */
  error = '';

  /**
   * Directory of all learning paths fetched from database.
   */
  paths: LearningPathResponseDto[] = [];

  /**
   * Modal view visibility toggle.
   */
  modalOpen = false;

  /**
   * ID of the learning path currently selected for updates (null signifies path addition).
   */
  editingId: number | null = null;

  /**
   * Title text string bound to the modal form.
   */
  title = '';

  /**
   * Description text string bound to the modal form.
   */
  description = '';

  /**
   * Flag indicating if a creation/update transaction is processing.
   */
  isSaving = false;

  // Image upload
  /**
   * The binary File object chosen for visual cover art.
   */
  selectedFile: File | null = null;

  /**
   * Reader data-url string representing the image preview shown in the modal.
   */
  imagePreview: string | null = null;

  /**
   * Visual indicator signaling if a file is hovering inside the drag drop target.
   */
  isDragOver = false;

  // Delete modal state
  deleteModalOpen = false;
  deletePathId: number | null = null;
  deletePathTitle = '';
  deleteConfirmText = '';

  /**
   * Constructs the LearningPathsPage component.
   *
   * @param api - API service targeting learning path endpoints.
   * @param toast - System toast notification manager.
   * @param router - Navigation router.
   * @param cdr - Change detector utility.
   */
  constructor(
    private readonly api: LearningPathsApiService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initial page hook. Triggers a request to fetch existing paths.
   */
  ngOnInit(): void {
    void this.loadPaths();
  }

  /**
   * Fetches learning paths from the backend server and refreshes the local roster.
   */
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

  /**
   * Configures form values and launches the creation dialog modal.
   */
  openCreateModal(): void {
    this.editingId = null;
    this.title = '';
    this.description = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.modalOpen = true;
  }

  /**
   * Populates properties and launches the modification dialog modal.
   *
   * @param path - The chosen learning path to update.
   */
  openEditModal(path: LearningPathResponseDto): void {
    this.editingId = path.id;
    this.title = path.title;
    this.description = path.description ?? '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.modalOpen = true;
  }

  // ── File selection / drag-drop ──────────────────────
  /**
   * Processes manual file additions, extracting the chosen file.
   *
   * @param event - The input change event.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  /**
   * Prevents standard browser behaviors to enable custom drop handlers.
   *
   * @param event - The drag event.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Resets indicators when file leaves the drag-zone.
   *
   * @param event - The drag event.
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Intercepts dropped image files and verifies their type.
   *
   * @param event - The drop event.
   */
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

  /**
   * Discards the currently selected cover image file and clears visual previews.
   */
  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  /**
   * Asserts image file sizes (max 5MB) and processes binary payloads into Base64 read strings.
   *
   * @param file - The picture file.
   */
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
  /**
   * Submits the modal dialog forms to the server, processing either path creations or modifications.
   */
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

  /**
   * Prompts visual confirm overlays and triggers learning path deletion.
   *
   * @param id - The learning path ID.
   */
  async deletePath(id: number): Promise<void> {
    const path = this.paths.find((p) => p.id === id);
    if (!path) return;

    this.deletePathId = id;
    this.deletePathTitle = path.title;
    this.deleteConfirmText = '';
    this.deleteModalOpen = true;
  }

  /**
   * Performs actual deletion after safety text confirmation matches.
   */
  async confirmDeletePath(): Promise<void> {
    if (this.deleteConfirmText.trim().toLowerCase() !== 'delete' || !this.deletePathId) return;

    const id = this.deletePathId;
    this.deleteModalOpen = false;
    try {
      await this.api.deletePath(id);
      this.toast.success('Learning path deleted');
      await this.loadPaths();
    } catch (error) {
      this.toast.error((error as Error).message || 'Unable to delete learning path');
    }
  }

  /**
   * Triggers navigation redirect to the course management editor for a specific path ID.
   *
   * @param id - The learning path ID.
   */
  manageCourses(id: number): void {
    void this.router.navigate(['/learning-paths', id]);
  }
}
