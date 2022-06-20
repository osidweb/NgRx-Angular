import {Injectable} from '@angular/core';
import { select, Store } from '@ngrx/store';
import { INotifyNotifications } from '../../common/interfaces/notificator/notificator-state.interface';
import { setNotifyAboutUpdateNotifications } from '../../store/notificator/notificator.actions';
import { selectNotifyAboutUpdateNotifications } from '../../store/notificator/notificator.selectors';

@Injectable({
  providedIn: 'root'
})
export class NotificatorSharedService {
  // содержить true/false стоит ли обновить уведомлений?
  notifyAboutUpdateNotifications$ = this.store.pipe(select(selectNotifyAboutUpdateNotifications));

  // содержить true/false стоит ли автоматический открыть уведомлений?
  isAutoOpened = false;

  constructor(
    private store: Store
  ) {
  }

  // обновить уведомления (сообщить подписчикам, что нужно обновить уведомления)
  changeNotifyAboutUpdateNotifications(notifyAboutUpdateNotifications: INotifyNotifications): void {
    this.store.dispatch(setNotifyAboutUpdateNotifications({ notifyAboutUpdateNotifications }));
  }
}
