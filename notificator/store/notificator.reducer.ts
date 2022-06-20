import { createReducer, on } from '@ngrx/store';
import { INotificatorState } from "../../common/interfaces/notificator/notificator-state.interface";
import { loadNotificationsAction,
  loadNotificationsFailureAction,
  loadNotificationsSuccessAction,
  setCheckedNotification,
  setNotificationsWithState,
  setNotifyAboutUpdateNotifications,
  setOpenedNotification,
} from './notificator.actions';

export const initialNotificatorState: INotificatorState = {
  notifications: [],
  notificationsStatus: 'success',
  notificationsWithState: [],
  notifyAboutUpdateNotifications: {
    update: false
  },
  openedNotification: {
    unid: null
  },
  checkedNotification: {
    unid: null,
  },
}

export const notificatorReducer = createReducer(
  initialNotificatorState,
  // LOAD NOTIFICATIONS ---------------------------------
  on(
    loadNotificationsAction,
    (state: INotificatorState) => ({
      ...state,
      notificationsStatus: 'loading' as const
    })
  ),
  on(
    loadNotificationsSuccessAction,
    (state: INotificatorState, action) => ({
      ...state,
      notifications: action.notifications,
      notificationsStatus: 'success' as const
    })
  ),
  on(
    loadNotificationsFailureAction,
    (state: INotificatorState, action) => ({
      ...state,
      notificationsStatus: 'error' as const
    })
  ),
  // SET notificationsWithState ---------------------------
  on(
    setNotificationsWithState,
    (state: INotificatorState, action) => ({
      ...state,
      notificationsWithState: action.notificationsWithState
    })
  ),
  // SET notifyAboutUpdateNotifications ------------------
  on(
    setNotifyAboutUpdateNotifications,
    (state: INotificatorState, action) => ({
      ...state,
      notifyAboutUpdateNotifications: action.notifyAboutUpdateNotifications
    })
  ),
  // SET checkedNotificationUnid ------------------------
  on(
    setCheckedNotification,
    (state: INotificatorState, action) => ({
      ...state,
      checkedNotification: action.checkedNotification
    })
  ),
  // SET openedNotificationUnid ------------------
  on(
    setOpenedNotification,
    (state: INotificatorState, action) => ({
      ...state,
      openedNotification: action.openedNotification
    })
  ),
);
