import { TestBed } from '@angular/core/testing';
import { MyCoursesComponent } from './my-courses.component';
import { CourseResponseDTO } from '../../../../core/services/learning-path.service';

describe('MyCoursesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyCoursesComponent],
    }).compileComponents();
  });

  it('should create and display courses', () => {
    const fixture = TestBed.createComponent(MyCoursesComponent);
    const component = fixture.componentInstance;

    const mockCourse: CourseResponseDTO = {
      id: 1,
      title: 'Course 1',
      description: 'Desc 1',
      image: '/images/course.png',
      sections: [],
    };

    component.enrolledCourses = [
      {
        course: mockCourse,
        learningPathId: 5,
        learningPathTitle: 'Learning Path 5',
      },
    ];
    component.courseProgressMap = new Map([[1, 80]]);

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.getCourseProgress(1)).toBe(80);
    expect(component.getCourseProgress(99)).toBe(0);
    expect(component.getGradient(0)).toBeTruthy();
    expect(component.getCoursePictureUrl(mockCourse)).toContain('/images/course.png');

    let openedEvent: { course: CourseResponseDTO; learningPathId: number } | undefined;
    component.open.subscribe((evt) => {
      openedEvent = evt;
    });

    const element = fixture.nativeElement as HTMLElement;
    const item = element.querySelector('.course-mini-card');
    item?.dispatchEvent(new Event('click'));

    expect(openedEvent).toEqual({
      course: mockCourse,
      learningPathId: 5,
    });
  });
});
