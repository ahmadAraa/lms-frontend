import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LearningPathResponseDto } from '../../../../core/services/learning-path.service';

/**
 * Component displaying a visual distribution chart of employee enrollments across learning paths.
 * Renders progressive horizontal bars matching relative student densities per learning path.
 */
@Component({
  selector: 'app-learning-path-distribution',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './learning-path-distribution.component.html',
  styleUrl: './learning-path-distribution.component.css',
})
export class LearningPathDistributionComponent {
  /**
   * The constant maximum students cap used for calculating percentage widths of progress bars.
   */
  private readonly maxStudentsPerPath = 20;

  /**
   * Catalog of active learning paths to plot in the distribution chart.
   */
  @Input({ required: true }) paths!: LearningPathResponseDto[];

  /**
   * Mapping object relating learning path IDs to their absolute student enrollment counts.
   */
  @Input({ required: true }) enrolledCounts!: Record<number, number>;

  /**
   * Retrieves the absolute number of enrolled students for a specific learning path ID.
   *
   * @param pathId - The unique identifier of the learning path.
   * @returns The number of enrolled students, defaulting to 0 if not set.
   */
  getEnrolledCount(pathId: number): number {
    return this.enrolledCounts[pathId] ?? 0;
  }

  /**
   * Calculates the relative percentage width (0-100) of the visual bar for a learning path,
   * scaling the path's student count against the predefined maximum threshold cap.
   *
   * @param path - The learning path record to evaluate.
   * @returns The calculated percentage width (0 to 100).
   */
  getBarWidth(path: LearningPathResponseDto): number {
    const count = this.getEnrolledCount(path.id);
    if (count <= 0) return 0;

    return Math.min(Math.round((count / this.maxStudentsPerPath) * 100), 100);
  }
}
