import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningPathResponseDto } from '../../../../core/services/learning-path.service';
import { BASE_URL } from '../../../../types/course-builder.types';

@Component({
  selector: 'app-learning-path-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-path-card.component.html',
  styleUrl: './learning-path-card.component.css',
})
export class LearningPathCardComponent {
  @Input({ required: true }) path!: LearningPathResponseDto;
  @Input({ required: true }) isEnrolled!: boolean;
  @Input() progress = 0;
  @Input({ required: true }) gradient!: string;

  @Output() clickPath = new EventEmitter<number>();

  getCourseCount(): number {
    return this.path.courses?.length ?? 0;
  }

  getPictureUrl(): string {
    if (!this.path.image) return '';
    if (this.path.image.startsWith('http')) return this.path.image;
    return `${BASE_URL}/${this.path.image.replace(/^\//, '')}`;
  }
}
