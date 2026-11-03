/**
 * Centralized Single Toast & Notification Dispatcher Service
 *
 * Manages a single active notification at a time with automatic dismiss timing,
 * manual 'x' close capability, and unified Secret Developer Toast styling.
 */

import { logger } from './logger';

export type NotificationType = 'info' | 'success' | 'error' | 'warn';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  durationMs: number;
  timestamp: string;
}

export type NotificationSubscriber = (notification: AppNotification | null) => void;

class NotificationService {
  private activeNotification: AppNotification | null = null;
  private subscribers: Set<NotificationSubscriber> = new Set();
  private dismissTimer: any = null;

  constructor() {
    this.activeNotification = null;
  }

  /**
   * Dispatches a single toast notification.
   * Immediately replaces any active notification so UI stays clean and singular.
   */
  public show(message: string, type: NotificationType = 'info', durationMs: number = 3000): AppNotification {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    // Brief, punchy message formatting
    const trimmedMessage = message.length > 80 ? `${message.substring(0, 77)}...` : message;

    const notification: AppNotification = {
      id,
      message: trimmedMessage,
      type,
      durationMs,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Cancel existing timer
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    this.activeNotification = notification;

    // Diagnostic logging
    const logLevel = type === 'error' ? 'error' : type === 'warn' ? 'warn' : type === 'success' ? 'success' : 'info';
    logger.log({
      source: 'client',
      stage: 'system',
      level: logLevel,
      message: `[Notification] (${type.toUpperCase()}) ${trimmedMessage}`,
      details: { id, durationMs },
    });

    // Notify all subscribers
    this.notifySubscribers();

    // Auto-dismiss after durationMs
    if (durationMs > 0) {
      this.dismissTimer = setTimeout(() => {
        if (this.activeNotification?.id === id) {
          this.activeNotification = null;
          this.dismissTimer = null;
          this.notifySubscribers();
        }
      }, durationMs);
    }

    return notification;
  }

  public success(message: string, durationMs: number = 2800): AppNotification {
    return this.show(message, 'success', durationMs);
  }

  public error(message: string, durationMs: number = 3500): AppNotification {
    return this.show(message, 'error', durationMs);
  }

  public warn(message: string, durationMs: number = 3200): AppNotification {
    return this.show(message, 'warn', durationMs);
  }

  public info(message: string, durationMs: number = 2800): AppNotification {
    return this.show(message, 'info', durationMs);
  }

  /**
   * Dismisses the active notification (e.g. when user clicks 'x')
   */
  public dismiss(id?: string): void {
    if (id && this.activeNotification && this.activeNotification.id !== id) {
      return;
    }
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (this.activeNotification) {
      logger.system(`Dismissed notification: "${this.activeNotification.message}"`);
    }
    this.activeNotification = null;
    this.notifySubscribers();
  }

  public clear(): void {
    this.dismiss();
  }

  public getActive(): AppNotification | null {
    return this.activeNotification;
  }

  public subscribe(subscriber: NotificationSubscriber): () => void {
    this.subscribers.add(subscriber);
    // Immediately invoke with active notification
    subscriber(this.activeNotification);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private notifySubscribers(): void {
    const snapshot = this.activeNotification;
    this.subscribers.forEach((sub) => {
      try {
        sub(snapshot);
      } catch (err) {
        console.error('Error invoking notification subscriber:', err);
      }
    });
  }
}

export const notificationService = new NotificationService();
