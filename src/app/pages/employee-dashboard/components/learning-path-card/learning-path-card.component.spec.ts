import { TestBed } from '@angular/core/testing';
import { LearningPathCardComponent } from './learning-path-card.component';
import { LearningPathResponseDto } from '../../../../core/services/learning-path.service';

describe('LearningPathCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LearningPathCardComponent],
    }).compileComponents();
  });

  it('should create and handle card actions', () => {
    const fixture = TestBed.createComponent(LearningPathCardComponent);
    const component = fixture.componentInstance;

    const mockPath: LearningPathResponseDto = {
      id: 1,
      title: 'Path 1',
      description: 'Desc 1',
      image: 'images/path.png',
      courses: [],
    };

    component.path = mockPath;
    component.isEnrolled = true;
    component.progress = 60;
    component.gradient = 'linear-gradient(135deg, #0f1b3d 0%, #1e3a8a 100%)';

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.getCourseCount()).toBe(0);
    expect(component.getPictureUrl()).toContain('/images/path.png');

    let clickedId: number | undefined;
    component.clickPath.subscribe((id) => {
      clickedId = id;
    });

    const element = fixture.nativeElement as HTMLElement;
    const card = element.querySelector('.ed-card');
    card?.dispatchEvent(new Event('click'));

    expect(clickedId).toBe(1);
  });
});
