import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Reusable inline editor component for titles and descriptions.
 *
 * Implements two-way bound input/textarea elements with confirmation/cancel event triggers.
 * Highly integrated into the admin course builder and sections configuration pages.
 */
@Component({
  selector: 'app-inline-edit',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="inline-edit">
      <input [(ngModel)]="title" />
      @if (showDescription) {
        <textarea [(ngModel)]="description"></textarea>
      }
      <div class="row">
        <button (click)="confirm.emit({ title: title.trim(), description: description.trim() })">✔</button>
        <button class="secondary" (click)="cancel.emit()">✖</button>
      </div>
    </div>
  `,
  styles: [
    `
      .inline-edit { display: grid; gap: 6px; margin-bottom: 8px; }
      input, textarea { width: 100%; border: 1px solid var(--gray-300); border-radius: 6px; padding: 8px; }
      textarea { min-height: 64px; }
      .row { display: flex; gap: 8px; }
      button { border: none; background: var(--blue); color: white; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
      .secondary { background: var(--gray-200); color: var(--gray-800); }
    `,
  ],
})
export class InlineEditComponent {
  /**
   * The text value of the title.
   */
  @Input() title = '';

  /**
   * The text value of the description.
   */
  @Input() description = '';

  /**
   * Flag determining whether to show the description textarea field.
   */
  @Input() showDescription = true;

  /**
   * Event emitter firing when the user clicks confirm, providing sanitized title and description values.
   */
  @Output() confirm = new EventEmitter<{ title: string; description: string }>();

  /**
   * Event emitter firing when the user cancels the edit operation.
   */
  @Output() cancel = new EventEmitter<void>();
}
