import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LearningPathDistributionComponent } from './learning-path-distribution.component';
import { LearningPathResponseDto } from '../../../../core/services/learning-path.service';

describe('LearningPathDistributionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LearningPathDistributionComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create and calculate bar width correctly', () => {
    const fixture = TestBed.createComponent(LearningPathDistributionComponent);
    const component = fixture.componentInstance;
    
    const mockPath: LearningPathResponseDto = {
      id: 1,
      title: 'Path 1',
      description: 'Desc 1',
      image: '',
      courses: [],
    };
    
    component.paths = [mockPath];
    component.enrolledCounts = { 1: 5 };
    
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
    expect(component.getEnrolledCount(1)).toBe(5);
    // Max is 20 students per path, so 5/20 = 25%
    expect(component.getBarWidth(mockPath)).toBe(25);
  });
});
