import { TestBed } from '@angular/core/testing';
import { RecentActivityComponent } from './recent-activity.component';
import { ActivityService } from '../../../../core/services/activity.service';

describe('RecentActivityComponent', () => {
  let mockActivityService: any;

  beforeEach(async () => {
    mockActivityService = {
      timeAgo: (iso: string) => '10 minutes ago',
    };

    await TestBed.configureTestingModule({
      imports: [RecentActivityComponent],
      providers: [
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(RecentActivityComponent);
    const component = fixture.componentInstance;
    component.activities = [];
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should format time ago', () => {
    const fixture = TestBed.createComponent(RecentActivityComponent);
    const component = fixture.componentInstance;
    expect(component.timeAgo('2026-05-20T12:00:00Z')).toBe('10 minutes ago');
  });
});
