import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonResponseDTO, CourseResponseDTO } from '../../../../types/course-builder.types';

/**
 * Component responsible for rendering the active lesson content, including video players,
 * text/markdown files, external resource links, and loading/error states.
 */
@Component({
  selector: 'app-lesson-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-content.component.html',
  styleUrl: './lesson-content.component.css'
})
export class LessonContentComponent {
  /**
   * The currently active lesson to display.
   */
  @Input() lesson: LessonResponseDTO | null = null;

  /**
   * The parent course context to which this lesson belongs.
   */
  @Input() course: CourseResponseDTO | null = null;

  /**
   * Signifies if a lesson payload is currently loading from the backend service.
   */
  @Input() isLoading: boolean = false;

  /**
   * A string containing error messages encountered during lesson retrieval.
   */
  @Input() error: string = '';

  /**
   * Constructs the LessonContentComponent.
   *
   * @param sanitizer - Angular service to bypass security checks and trust dynamic iframe/video resources.
   */
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Evaluates if the lesson has a valid YouTube link and parses its ID,
   * returning a sanitized URL formatted for a responsive iframe embedded player.
   *
   * @param lesson - The lesson information containing the URL.
   * @returns A trusted SafeResourceUrl object if valid, or null.
   */
  getYouTubeEmbedUrl(lesson: LessonResponseDTO | null): SafeResourceUrl | null {
    if (!lesson || lesson.type !== 3 || !lesson.videoUrl) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = lesson.videoUrl.match(regExp);

    if (match && match[2].length === 11) {
      const videoId = match[2];
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}?autoplay=0`);
    }
    return null;
  }

  /**
   * Formats the media source URL depending on whether the lesson is an external hyperlink
   * (type 3 or http(s) prefixed) or an uploaded file stored on the local media server.
   *
   * @param lesson - The lesson object.
   * @returns The fully-formed media path string, or null.
   */
  getMediaUrl(lesson: LessonResponseDTO | null): string | null {
    if (!lesson || !lesson.videoUrl) return null;
    
    // Type 3 is Link (URL), return as-is
    if (lesson.type === 3) return lesson.videoUrl;
    
    // External links (just in case)
    if (lesson.videoUrl.startsWith('http')) return lesson.videoUrl;
    
    // Prepend BASE_URL for uploaded files
    const baseUrl = 'http://localhost:5232';
    return `${baseUrl}/${lesson.videoUrl.replace(/^\//, '')}`;
  }
}
