import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, map, of, switchMap } from "rxjs";
import { INotif, INotification } from "../../../common/interfaces/notificator/inotif";
import { NotificationService } from "../../../common/services/notification.service";
import { loadNotificationsAction, loadNotificationsFailureAction, loadNotificationsSuccessAction } from "../notificator.actions";

@Injectable()
export class LoadNotificationsEffect {

  loadNotifications$ = createEffect(() => this.actions$.pipe(
    ofType(loadNotificationsAction),
    switchMap(({ username }) => this.notificationService.loadNotif(username)
      .pipe(
        map((notif: INotif) => {
          const notifications: INotification[] = this.notificationService.toNotifications(notif);
          return loadNotificationsSuccessAction({ notifications });
        }),
        catchError((error) => of(loadNotificationsFailureAction()))
      )
    )
  ));

  constructor(
    private actions$: Actions,
    private notificationService: NotificationService
  ) {
  }
}
