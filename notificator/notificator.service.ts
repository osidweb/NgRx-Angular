import {Injectable} from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { INotification } from '../../common/interfaces/notificator/inotif';
import { IChangedNotification } from '../../common/interfaces/notificator/notificator-state.interface';
import { setCheckedNotification,
  setNotificationsWithState,
  setOpenedNotification
} from '../../store/notificator/notificator.actions';
import { selectCheckedNotification,
  selectNotificationsWithState,
  selectOpenedNotification,
} from '../../store/notificator/notificator.selectors';

@Injectable()
export class NotificatorService {
  // содержит уведомления с заданным начальным состоянием: loading, opened, checked
  notificationsWithState: INotification[] = [];
  notificationsWithState$: Observable<INotification[]> = this.store.pipe(select(selectNotificationsWithState));

  // содержит unid отмеченного уведомления
  checkedNotification$ = this.store.pipe(select(selectCheckedNotification));
  // содержит unid открытого уведомления
  openedNotification$ = this.store.pipe(select(selectOpenedNotification));

  constructor(
    private store: Store
  ) {
  }


  // обновить notificationsWithState
  changeNotifications(updatedNotifications: INotification[]): void {
    this.notificationsWithState = updatedNotifications;
    this.store.dispatch(setNotificationsWithState({ notificationsWithState: updatedNotifications }));
  }

  // изменить развенутое уведомление
  changeOpenedNotification(openedNotification: IChangedNotification): void {
    this.store.dispatch(setOpenedNotification({ openedNotification }));
  }

  // изменить отмеченное уведомление
  changeCheckedNotification(checkedNotification: IChangedNotification): void {
    this.store.dispatch(setCheckedNotification({ checkedNotification }));
  }


  /**
   * @method setInitialState
   * @description задает начальное состояние для всех уведомлений
   * @param notifications
   */
  setInitialState(notifications: INotification[]): void {
    const updated = notifications?.map(notification => {

      const oldNotification = this.notificationsWithState.find(
        item => item.unid === notification.unid
      );

      return {
        ...notification,
        state: {
          loading: oldNotification?.state?.loading || false,
          opened: oldNotification?.state?.opened || false,
          checked: oldNotification?.state?.checked || false
        }
      };
    });

    this.changeNotifications(updated || []);
  }

  /**
   * @method setLoadingState
   * @description задает состояние 'загружается' для одного уведомления (отключив загрузку для других)
   * @param unid идентификатор уведомления (если не указано или неправильный идентификатор откл. состояние 'загружается' для всех)
   */
  setLoadingState(unid?: string): void {
    const updated = this.notificationsWithState?.map(notification => {
      return {
        ...notification,
        state: {
          ...notification.state,
          loading: notification.unid === unid
        }
      };
    });

    this.changeNotifications(updated || []);
  }

  /**
   * @method setOpenedState
   * @description задает состояние 'открыть' для одного уведомления (отключив открытие для других)
   * @param unid идентификатор уведомления (если не указано или неправильный идентификатор откл. состояние 'открыть' для всех)
   */
  setOpenedState(unid?: string): void {
    const updated = this.notificationsWithState?.map(notification => {
      return {
        ...notification,
        state: {
          ...notification.state,
          opened: notification.unid === unid && !notification.state.opened
        }
      };
    });

    this.changeNotifications(updated || []);
  }

  /**
   * @method toggleCheckedState
   * @description переключает состояние 'отмечено/неотмечено' для одного уведомления
   * @param unid идентификатор уведомления
   */
  toggleCheckedState(unid: string): void {
    const updated = this.notificationsWithState?.map(notification => {
      return {
        ...notification,
        state: {
          ...notification.state,
          checked: notification.unid === unid
            ? !notification.state.checked
            : notification.state.checked
        }
      };
    });

    this.changeNotifications(updated || []);
  }
}
