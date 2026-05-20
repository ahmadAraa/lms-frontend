import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminActivity, ActivityService } from '../../../../core/services/activity.service';

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activity.component.html',
  styleUrl: './recent-activity.component.css',
})
export class RecentActivityComponent {
  @Input({ required: true }) activities!: AdminActivity[];

  constructor(private activityService: ActivityService) {}

  timeAgo(iso: string): string {
    return this.activityService.timeAgo(iso);
  }
}
