import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningPathResponseDto } from '../../../../core/services/learning-path.service';

/**
 * Interface representing the progress state of the current continue-learning recommendation.
 */
interface ContinueLearningState {
  /** True if the learning path is fully completed. */
  isCompleted: boolean;
  /** The unique identifier of the active learning path. */
  pathId: number;
  /** The title of the active learning path. */
  pathTitle: string;
  /** The identifier of the next lesson to learn (can be null). */
  lessonId: number | null;
  /** The identifier of the next course to learn (can be null). */
  courseId: number | null;
  /** Custom descriptive status messages from the continue-learning tracker. */
  message: string;
}

/**
 * Presentational component displaying a shortcut card to resume the employee's active learning path.
 *
 * Renders path progress details, completion banners, and triggers resume navigation events.
 */
@Component({
  selector: 'app-continue-learning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './continue-learning.component.html',
  styleUrl: './continue-learning.component.css',
})
export class ContinueLearningComponent {
  /**
   * The learning path currently recommended for continuation.
   */
  @Input({ required: true }) continuePath!: LearningPathResponseDto;

  /**
   * The current completion progress percentage of the continuation path.
   */
  @Input({ required: true }) continuePathProgress!: number;

  /**
   * Flag indicating if the recommended path has been completely finished.
   */
  @Input({ required: true }) isContinueCompleted!: boolean;

  /**
   * The active continue-learning details block.
   */
  @Input({ required: true }) continueState!: ContinueLearningState | null;

  /**
   * Emits an event requesting to resume learning from the current saved location.
   */
  @Output() resume = new EventEmitter<void>();
}
