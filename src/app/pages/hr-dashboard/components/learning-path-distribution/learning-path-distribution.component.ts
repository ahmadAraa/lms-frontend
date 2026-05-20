import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LearningPathResponseDto } from '../../../../core/services/learning-path.service';

@Component({
  selector: 'app-learning-path-distribution',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './learning-path-distribution.component.html',
  styleUrl: './learning-path-distribution.component.css',
})
export class LearningPathDistributionComponent {
  private readonly maxStudentsPerPath = 20;

  @Input({ required: true }) paths!: LearningPathResponseDto[];
  @Input({ required: true }) enrolledCounts!: Record<number, number>;

  getEnrolledCount(pathId: number): number {
    return this.enrolledCounts[pathId] ?? 0;
  }

  getBarWidth(path: LearningPathResponseDto): number {
    const count = this.getEnrolledCount(path.id);
    if (count <= 0) return 0;

    return Math.min(Math.round((count / this.maxStudentsPerPath) * 100), 100);
  }
}
