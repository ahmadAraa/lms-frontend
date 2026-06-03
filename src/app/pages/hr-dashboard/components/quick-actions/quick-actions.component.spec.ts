import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QuickActionsComponent } from './quick-actions.component';

describe('QuickActionsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickActionsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(QuickActionsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
