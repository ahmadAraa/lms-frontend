import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Supported classification types for toast notifications.
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Structure of a toast notification message.
 */
export interface ToastMessage {
  /** Unique sequential identifier of the toast message. */
  id: number;
  /** Content text to be displayed in the toast notification. */
  text: string;
  /** Severity type of the toast. */
  type: ToastType;
}

/**
 * Service that manages displaying real-time toast alert messages throughout the application.
 *
 * It uses RxJS BehaviorSubject stream mapping to broadcast toast changes to the UI overlays,
 * and handles automated self-dismiss timeouts (3 seconds) for each active toast alert.
 */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  /**
   * Internal subject carrying the list of currently active toast messages.
   * @private
   */
  private readonly messagesSubject = new BehaviorSubject<ToastMessage[]>([]);

  /**
   * Observable stream of active toast messages that the UI components can subscribe to.
   */
  readonly messages$ = this.messagesSubject.asObservable();

  /**
   * Next unique numeric ID to assign to a newly generated toast message.
   * @private
   */
  private nextId = 1;

  /**
   * Map caching scheduled setTimeout tokens for automatic dismissal of active toasts.
   * @private
   */
  private readonly timeouts = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * Triggers a success toast notification with green styling.
   *
   * @param text - The text content to display.
   */
  success(text: string): void {
    this.show(text, 'success');
  }

  /**
   * Triggers an error toast notification with red styling.
   *
   * @param text - The text content to display.
   */
  error(text: string): void {
    this.show(text, 'error');
  }

  /**
   * Triggers a warning toast notification with orange styling.
   *
   * @param text - The text content to display.
   */
  warning(text: string): void {
    this.show(text, 'warning');
  }

  /**
   * Triggers an info toast notification with blue styling.
   *
   * @param text - The text content to display.
   */
  info(text: string): void {
    this.show(text, 'info');
  }

  /**
   * Removes a specific toast notification from the active list and cancels its dismissal timeout.
   *
   * @param id - The unique identifier of the toast to remove.
   */
  remove(id: number): void {
    const timeout = this.timeouts.get(id);

    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }

    const currentMessages = this.messagesSubject.getValue();

    this.messagesSubject.next(
      currentMessages.filter((message) => message.id !== id)
    );
  }

  /**
   * Instantly dismisses all currently active toast notifications and cancels all pending timeouts.
   */
  clear(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
    this.messagesSubject.next([]);
  }

  /**
   * Appends a new toast message to the stream and schedules a 3-second self-dismissal timer.
   *
   * @param text - The message text of the toast.
   * @param type - The severity type of the toast.
   * @private
   */
  private show(text: string, type: ToastType): void {
    const id = this.nextId++;

    const message: ToastMessage = {
      id,
      text,
      type,
    };

    const currentMessages = this.messagesSubject.getValue();

    this.messagesSubject.next([...currentMessages, message]);

    const timeout = setTimeout(() => {
      this.remove(id);
    }, 3000);

    this.timeouts.set(id, timeout);
  }
}