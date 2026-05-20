import { TestBed } from '@angular/core/testing';
import { ContinueLearningComponent } from './continue-learning.component';
import { LearningPathResponseDto } from '../../../../core/services/learning-path.service';

describe('ContinueLearningComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContinueLearningComponent],
    }).compileComponents();
  });

  it('should create and emit resume event', () => {
    const fixture = TestBed.createComponent(ContinueLearningComponent);
    const component = fixture.componentInstance;

    const mockPath: LearningPathResponseDto = {
      id: 1,
      title: 'Path 1',
      description: 'Desc 1',
      image: '',
      courses: [],
    };

    component.continuePath = mockPath;
    component.continuePathProgress = 45;
    component.isContinueCompleted = false;
    component.continueState = {
      isCompleted: false,
      pathId: 1,
      pathTitle: 'Path 1',
      lessonId: 10,
      courseId: 2,
      message: 'Resume',
    };

    fixture.detectChanges();

    expect(component).toBeTruthy();

    let emitted = false;
    component.resume.subscribe(() => {
      emitted = true;
    });

    const element = fixture.nativeElement as HTMLElement;
    const card = element.querySelector('.continue-card');
    card?.dispatchEvent(new Event('click'));

    expect(emitted).toBe(true);
  });
});
