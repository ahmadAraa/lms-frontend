import { Component, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CourseBuilderToast } from './components/course-builder-toast/course-builder-toast';

/**
 * Root component of the LMS front-end application.
 *
 * Provides the top-level template wrapper including the router outlet and the global toast notifications overlay.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CourseBuilderToast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  /**
   * Protected read-only signal storing the title of the application.
   */
  protected readonly title = signal('lms-frontend');

  /**
   * Constructs the root App component.
   *
   * @param router - The Angular Router service injected for navigation control.
   */
  constructor(public router: Router) {}
}
