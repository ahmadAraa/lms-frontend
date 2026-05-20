import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningPathResponseDto } from '../../../../core/services/learning-path.service';

interface ContinueLearningState {
  isCompleted: boolean;
  pathId: number;
  pathTitle: string;
  lessonId: number | null;
  courseId: number | null;
  message: string;
}

@Component({
  selector: 'app-continue-learning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './continue-learning.component.html',
  styleUrl: './continue-learning.component.css',
})
export class ContinueLearningComponent {
  @Input({ required: true }) continuePath!: LearningPathResponseDto;
  @Input({ required: true }) continuePathProgress!: number;
  @Input({ required: true }) isContinueCompleted!: boolean;
  @Input({ required: true }) continueState!: ContinueLearningState | null;

  @Output() resume = new EventEmitter<void>();
}
