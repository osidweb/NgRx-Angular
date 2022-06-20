import { createAction, props } from '@ngrx/store';
import { INotification } from '../../common/interfaces/notificator/inotif';
import { IChangedNotification, INotifyNotifications } from '../../common/interfaces/notificator/notificator-state.interface';
import { ENotificatorActionsTypes } from './actionTypes';

// LOAD NOTIFICATIONS FROM SERVER Actions -----------------------------------------
export const loadNotificationsAction = createAction(
  ENotificatorActionsTypes.LOAD_NOTIFICATIONS,
  props<{ username: string }>()
);

export const loadNotificationsSuccessAction = createAction(
  ENotificatorActionsTypes.LOAD_NOTIFICATIONS_SUCCESS,
  props<{ notifications: INotification[] }>()
);

export const loadNotificationsFailureAction = createAction(
  ENotificatorActionsTypes.LOAD_NOTIFICATIONS_FAILURE
);

export const setNotificationsWithState = createAction(
  ENotificatorActionsTypes.UPDATE_NOTIFICATIONS_WITH_STATE,
  props<{ notificationsWithState: INotification[] }>()
);

export const setNotifyAboutUpdateNotifications = createAction(
  ENotificatorActionsTypes.NOTIFY_ABOUT_UPDATE_NOTIFICATIONS,
  props<{ notifyAboutUpdateNotifications: INotifyNotifications }>()
);

export const setOpenedNotification = createAction(
  ENotificatorActionsTypes.OPEN_NOTIFICATION,
  props<{ openedNotification: IChangedNotification }>()
);

export const setCheckedNotification = createAction(
  ENotificatorActionsTypes.CHECK_NOTIFICATION,
  props<{ checkedNotification: IChangedNotification }>()
);
