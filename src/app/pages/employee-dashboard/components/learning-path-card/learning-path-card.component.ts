import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningPathResponseDto } from '../../../../core/services/learning-path.service';
import { BASE_URL } from '../../../../types/course-builder.types';

/**
 * Presentational component rendering a single learning path card. Renders a card cover
 * using custom cover images or linear gradient fallbacks, showing active course counts
 * and completion progress bars for enrolled users.
 */
@Component({
  selector: 'app-learning-path-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-path-card.component.html',
  styleUrl: './learning-path-card.component.css',
})
export class LearningPathCardComponent {
  /**
   * The learning path response payload data to display.
   */
  @Input({ required: true }) path!: LearningPathResponseDto;

  /**
   * Flag indicating if the current employee is already enrolled in this path.
   */
  @Input({ required: true }) isEnrolled!: boolean;

  /**
   * The active completion progress percentage (defaults to 0).
   */
  @Input() progress = 0;

  /**
   * CSS gradient string used as a fallback background cover.
   */
  @Input({ required: true }) gradient!: string;

  /**
   * Emits the unique path ID when the user clicks the card to open its details.
   */
  @Output() clickPath = new EventEmitter<number>();

  /**
   * Returns the count of courses nested inside the learning path.
   *
   * @returns An integer count.
   */
  getCourseCount(): number {
    return this.path.courses?.length ?? 0;
  }

  /**
   * Resolves the proper relative or absolute HTTP URL for the learning path cover image.
   *
   * @returns The fully qualified image URL string, or empty if undefined.
   */
  getPictureUrl(): string {
    if (!this.path.image) return '';
    if (this.path.image.startsWith('http')) return this.path.image;
    return `${BASE_URL}/${this.path.image.replace(/^\//, '')}`;
  }
}
