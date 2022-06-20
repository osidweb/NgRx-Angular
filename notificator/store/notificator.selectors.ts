import { createFeatureSelector, createSelector } from "@ngrx/store";
import { INotification } from "../../common/interfaces/notificator/inotif";
import { INotificatorState, IChangedNotification, INotifyNotifications } from "../../common/interfaces/notificator/notificator-state.interface";
import { AppStateInterface } from "../../common/interfaces/store/app-state.interface";

export const notificatorFeatureSelector = createFeatureSelector<
  AppStateInterface,
  INotificatorState>
  ('notificator');

export const selectNotifications = createSelector(
  notificatorFeatureSelector,
  (state: INotificatorState): INotification[] => state.notifications
);

export const selectNotificationsStatus = createSelector(
  notificatorFeatureSelector,
  (state: INotificatorState) => state.notificationsStatus
);

export const selectNotificationsWithState = createSelector(
  notificatorFeatureSelector,
  (state: INotificatorState): INotification[] => state.notificationsWithState
);

export const selectNotifyAboutUpdateNotifications = createSelector(
  notificatorFeatureSelector,
  (state: INotificatorState): INotifyNotifications => state.notifyAboutUpdateNotifications
);

export const selectCheckedNotification = createSelector(
  notificatorFeatureSelector,
  (state: INotificatorState): IChangedNotification => state.checkedNotification
);

export const selectOpenedNotification = createSelector(
  notificatorFeatureSelector,
  (state: INotificatorState): IChangedNotification => state.openedNotification
);
