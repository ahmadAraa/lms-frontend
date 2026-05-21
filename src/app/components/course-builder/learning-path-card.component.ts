import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningPathResponseDto, BASE_URL } from '../../types/course-builder.types';

/**
 * Card Component for displaying a single learning path in the Course Builder panel.
 * Contains direct styling templates, binds course count badges and title/description strings,
 * and emits callbacks when managing, editing, or deleting the path is requested.
 */
@Component({
  selector: 'app-learning-path-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lp-card">
      <div class="lp-card-banner" [style.background]="getBannerBackground()">
        @if (hasPicture()) {
          <img [src]="getPictureUrl()" alt="Learning path cover" class="lp-card-img" />
        }
        <div class="lp-card-overlay"></div>
        <span class="lp-badge">
          <span class="material-symbols-outlined">menu_book</span>
          {{ path.courses.length }} course{{ path.courses.length !== 1 ? 's' : '' }}
        </span>
      </div>
      <div class="lp-card-body">
        <h3 class="lp-card-title">{{ path.title }}</h3>
        <p class="lp-card-desc">{{ path.description || 'No description provided.' }}</p>
        <div class="lp-card-actions">
          <button class="btn-manage" (click)="manage.emit(path.id)">
            <span class="material-symbols-outlined">settings</span>
            Manage Courses
          </button>
          <div class="btn-group">
            <button class="btn-icon btn-edit" (click)="edit.emit(path)" title="Edit">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-delete" (click)="remove.emit(path.id)" title="Delete">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .lp-card {
        background: #fff;
        border-radius: 14px;
        border: 1px solid #e5e7eb;
        overflow: hidden;
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        transition: transform 0.28s ease, box-shadow 0.28s ease;
        display: flex;
        flex-direction: column;
      }
      .lp-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 36px rgba(0,0,0,0.12);
      }

      /* ── Banner ────────────────────────────── */
      .lp-card-banner {
        position: relative;
        height: 160px;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
      }
      .lp-card-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .lp-card-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.45) 100%);
        z-index: 1;
      }
      .lp-badge {
        position: relative;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin: 0 0 12px 14px;
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.25);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 8px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .lp-badge .material-symbols-outlined { font-size: 15px; }

      /* ── Body ───────────────────────────────── */
      .lp-card-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
      }
      .lp-card-title {
        font-size: 17px;
        font-weight: 700;
        color: #111827;
        line-height: 1.3;
        letter-spacing: -0.2px;
      }
      .lp-card-desc {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.55;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        flex: 1;
      }

      /* ── Actions ────────────────────────────── */
      .lp-card-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 12px;
        border-top: 1px solid #f3f4f6;
        margin-top: 6px;
      }
      .btn-manage {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #0f1b3d, #2563eb);
        color: #fff;
        border: none;
        border-radius: 9px;
        font-size: 13px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(37,99,235,0.25);
      }
      .btn-manage:hover {
        box-shadow: 0 6px 18px rgba(37,99,235,0.35);
        transform: translateY(-1px);
      }
      .btn-manage .material-symbols-outlined { font-size: 17px; }

      .btn-group { display: flex; gap: 6px; }

      .btn-icon {
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-icon .material-symbols-outlined { font-size: 17px; }

      .btn-edit { color: #3b82f6; }
      .btn-edit:hover { background: #eff6ff; border-color: #93c5fd; }

      .btn-delete { color: #ef4444; }
      .btn-delete:hover { background: #fef2f2; border-color: #fca5a5; }
    `,
  ],
})
export class LearningPathCardComponent {
  /**
   * The learning path payload data bound to the card.
   */
  @Input({ required: true }) path!: LearningPathResponseDto;

  /**
   * Index value inside list iterators, used to cycle cover art backup gradients.
   */
  @Input() cardIndex: number = 0;

  /**
   * Event dispatched when clicking the manage course button, emitting the path's ID.
   */
  @Output() manage = new EventEmitter<number>();

  /**
   * Event dispatched when clicking the edit pencil, emitting the full path object.
   */
  @Output() edit = new EventEmitter<LearningPathResponseDto>();

  /**
   * Event dispatched when clicking the delete trashcan, emitting the path's ID.
   */
  @Output() remove = new EventEmitter<number>();

  /**
   * Predefined gradients list to use as aesthetic placeholders when cover art is not present.
   */
  private readonly gradients = [
    'linear-gradient(135deg, #0f1b3d 0%, #1e3a8a 100%)',
    'linear-gradient(135deg, #065f56 0%, #0d9488 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
    'linear-gradient(135deg, #581c87 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  ];

  /**
   * Validates if a custom picture cover art is set for the path.
   *
   * @returns True if pictureUrl exists, false otherwise.
   */
  hasPicture(): boolean {
    return !!this.path.pictureUrl;
  }

  /**
   * Formats and returns the course cover art url, appending local server bases if relative.
   *
   * @returns Formatted image URL string.
   */
  getPictureUrl(): string {
    if (!this.path.pictureUrl) return '';
    // If it's already an absolute URL, use it directly
    if (this.path.pictureUrl.startsWith('http')) return this.path.pictureUrl;
    // Otherwise, prepend the base URL
    return `${BASE_URL}/${this.path.pictureUrl.replace(/^\//, '')}`;
  }

  /**
   * Decides which background setting should fill the card banner.
   * Returns a transparent fill if cover art exists, or cycles aesthetic gradients according to `cardIndex`.
   *
   * @returns Background fill CSS string.
   */
  getBannerBackground(): string {
    if (this.hasPicture()) return 'transparent';
    return this.gradients[this.cardIndex % this.gradients.length];
  }
}
