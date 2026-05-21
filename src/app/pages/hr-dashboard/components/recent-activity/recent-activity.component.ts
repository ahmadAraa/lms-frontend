import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminActivity, ActivityService } from '../../../../core/services/activity.service';

/**
 * Presentational component displaying a scrollable list of recent admin activities.
 * Uses the ActivityService to calculate readable relative timestamps (e.g. "2 hours ago").
 */
@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activity.component.html',
  styleUrl: './recent-activity.component.css',
})
export class RecentActivityComponent {
  /**
   * List of administrative logs or student enrollment events to show in the list.
   */
  @Input({ required: true }) activities!: AdminActivity[];

  /**
   * Constructs the RecentActivityComponent.
   *
   * @param activityService - Service containing utility functions for relative time math and logs.
   */
  constructor(private activityService: ActivityService) {}

  /**
   * Converts a ISO datetime string into a human-friendly "time ago" expression.
   *
   * @param iso - The ISO date-time string.
   * @returns A friendly string, e.g., "5 minutes ago", "Just now".
   */
  timeAgo(iso: string): string {
    return this.activityService.timeAgo(iso);
  }
}
