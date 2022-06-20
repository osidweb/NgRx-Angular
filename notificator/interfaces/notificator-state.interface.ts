import { INotification } from "./inotif";

export interface INotifyNotifications {
  update: boolean;
}

export interface IChangedNotification {
  unid: string;
}

export interface INotificatorState {
  // все уведомления
  notifications: INotification[],
  notificationsStatus: 'loading' | 'success' | 'error',
  // уведомления с заданным начальным состоянием: loading, opened, checked
  notificationsWithState: INotification[],
  // оповещает подписчиков чтобы они обновили список уведомлений
  notifyAboutUpdateNotifications: INotifyNotifications,
  // развернутое уведомление
  openedNotification: IChangedNotification | null,
  // отмеченное уведомление
  checkedNotification: IChangedNotification | null,
}