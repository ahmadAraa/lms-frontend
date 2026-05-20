import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly messagesSubject = new BehaviorSubject<ToastMessage[]>([]);
  readonly messages$ = this.messagesSubject.asObservable();

  private nextId = 1;
  private readonly timeouts = new Map<number, ReturnType<typeof setTimeout>>();

  success(text: string): void {
    this.show(text, 'success');
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  warning(text: string): void {
    this.show(text, 'warning');
  }

  info(text: string): void {
    this.show(text, 'info');
  }

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

  clear(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
    this.messagesSubject.next([]);
  }

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