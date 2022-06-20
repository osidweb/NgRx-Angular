import { Component, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { TranslateService } from '@ngx-translate/core';
import { select, Store } from "@ngrx/store";
import { Observable, Subject} from 'rxjs';
import { Subscription } from 'rxjs/internal/Subscription';
import { filter, switchMap, take, takeUntil, tap, map, mergeMap } from 'rxjs/operators';
import * as _ from 'underscore';
import { DiscusService } from '../../common/services/discus.service';
import { INotification} from '../../common/interfaces/notificator/inotif';
import { NotificatorService } from './notificator.service';
import { IServerTimes, SocketService } from '../../common/services/socket.service';
import DiscusTask from '../../common/models/discus-task';
import DiscusProcess from '../../common/models/discus-process';
import DiscusVoting from '../../common/models/discus-voting';
import DiscusAdapt from '../../common/models/discus-adapt';
import DiscusContact from '../../common/models/discus-contact';
import DiscusMessage from '../../common/models/discus-message';
import DiscusMessagebb from '../../common/models/discus-messagebb';
import {IShareModel} from '../../common/interfaces/ishare-model';
import {DiscusParticipantsService} from '../../common/services/discus-participants.service';
import {NotificatorSharedService} from './notificator-shared.service';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {GotoService} from '../../common/services/goto.service';
import { IDiscusTaskSubjects } from '../../common/interfaces/idiscus-task-subjects';
import { selectNotifications, selectNotificationsStatus } from '../../store/notificator/notificator.selectors';
import { IChangedNotification, INotifyNotifications } from '../../common/interfaces/notificator/notificator-state.interface';


@Component({
  selector: 'app-notificator',
  templateUrl: './notificator.component.html',
  styleUrls: ['./notificator.component.scss'],
  providers: [
    NotificatorService,
    GotoService,
  ]
})
export class NotificatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private _destroyed: Subject<boolean> = new Subject<boolean>();
  private discusSubscription: Subscription;

  // содержит уведомления, полученные с сервера
  serverNotifications$: Observable<INotification[]> = this.store.pipe(select(selectNotifications));
  notifications: INotification[] = [];
  urgentNotifications: INotification[] = [];
  normalNotifications: INotification[] = [];

  // содержит уведомления, полученные по сокету
  socketNotifications: INotification[] = [];
  openedNotification: IChangedNotification = { unid: null };

  mainDoc: DiscusTask | DiscusProcess | DiscusVoting | DiscusAdapt | DiscusContact;

  get comments(): (DiscusTask | DiscusVoting | DiscusMessage | DiscusMessagebb)[] {
    return this.discusService.comments;
  }
  set comments(value: (DiscusTask | DiscusVoting | DiscusMessage | DiscusMessagebb)[]) {
    this.discusService.comments = value;
  }

  // серверное время
  serverTimes: IServerTimes;
  // обновляются уведомления
  isUpdatingNotifications = false;

  // загружаются уведомления с сервера?
  readonly isLoading$: Observable<boolean> = this.store.pipe(
    select(selectNotificationsStatus),
    map(status => status === 'loading')
  );

  constructor(
    public readonly notificatorService: NotificatorService,
    private titleService: Title,
    private socketService: SocketService,
    private iconRegistry: MatIconRegistry,
    private notificatorSharedService: NotificatorSharedService,
    private sanitizer: DomSanitizer,
    private discusService: DiscusService,
    private translate: TranslateService,
    private gotoService: GotoService,
    private discusParticipantsService: DiscusParticipantsService,
    private activatedRoute: ActivatedRoute,
    private store: Store,
  ) {
    this.iconRegistry.addSvgIconSetInNamespace
    ('notificator', this.sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/svg-sprite-notificator.svg'));
  }

  ngOnInit() {
    this.setPageTitle();
    this.listenLoadNotificationsFromServer();

    // задать серверное время
    this.serverTimes = this.socketService.serverTimes;

    this.listenNotificationStatusUpdates();
    this.listenToggleNotification();
    this.listenCheckedNotification();
    this.listenUpdateAllNotifications();
    this.listenSocketNotify();
  }

  ngAfterViewInit(): void {
    this.gotoService.activate();
  }

  // обработка открытия дискуссии
  handleOpenedNotification(unid: string) {
    if (!unid) {
      return;
    }

    // уведомление сворачивается?
    const notificationCloses = this.notifications.find(item => item.state.opened)?.unid;
    const notification = this.notifications.find(item => item.unid === unid);

    // если уведомление сворачивается: обновить все уведомления
    if (notificationCloses) {
      this.setInitialState(this.socketNotifications);
    }

    // если только свернули развенутое уведомление
    if (notification.state.opened) {
      this.setPageTitle();
      this.setOpened(null);
      this.socketService.off('addComment');

      this.mainDoc = undefined;
      this.comments = undefined;
      return;
    }

    this.setLoading(unid);
    this.discusSubscription?.unsubscribe();
    this.discusSubscription = this.discusService.getWithUnreadedComments(notification)
      .pipe(
        take(1),
        switchMap((response) => {
          this.setPageTitle(response.document.subject);

          // расспределить clarify/result по mainDoc и comments
          response.tasks.forEach((item: DiscusMessagebb) => {
            this.discusService.addItemInTaskingProperty({
              mainDoc: response.document,
              comments: response.comments,
              newComment: item
            });
          });

          this.mainDoc = response.document;

          // перезаписать текущее значение документа (main-doc) на полученное с сервера
          // для использования его в компонентах, в которых сделана подписка на эти изменения
          this.discusService.changeMainDocument(this.mainDoc);

          this.comments = response.comments;

          this.setLoading(null);
          this.setOpened(unid);

          return this.socketService.authenticatedChanges$;
        }),
        tap(() => this.listenSocketRefreshDiscusUsers()),
        filter((authenticated: boolean) => authenticated),
        takeUntil(this._destroyed)
      )
      .subscribe(() => {
        this.socketService.emit('joinDiscus', this.mainDoc.unid);
        this.listenSocketAddComment();
      });
  }

  // подписаться на изменение документа: comment/main_doc (addComment)
  listenSocketAddComment(): void {
    this.socketService.on('addComment')
      .pipe(
        takeUntil(this._destroyed)
      )
      .subscribe((discusDocument: DiscusTask | DiscusProcess | DiscusVoting | DiscusAdapt |
        DiscusContact | DiscusMessage | DiscusMessagebb) => {
        // если сокет прислал main_doc
        if (discusDocument.unid === this.mainDoc.unid) {
          const updatedDoc = this.discusService.parseMainDocument(discusDocument);

          // сохраняю tasking т.к этого поля не существует в discusDocument
          if (updatedDoc instanceof DiscusTask && this.mainDoc instanceof DiscusTask) {
            updatedDoc.tasking = this.mainDoc.tasking;
          }

          this.mainDoc = updatedDoc;
          // перезаписать текущее значение документа (main-doc) на полученное с сервера
          // для использования его в компонентах, в которых сделана подписка на эти изменения
          this.discusService.changeMainDocument(this.mainDoc);
        } else {
          // если сокет прислал comment
          // если коммент принадлежит main_doc
          if (discusDocument.parentID === this.mainDoc.unid) {
            const newComment: DiscusTask | DiscusVoting | DiscusMessage | DiscusMessagebb
              = this.discusService.parseComment(discusDocument);

            // если сокет прислал "результат/уточнение", добавить его в "tasking" родительской просьбы
            this.discusService.addItemInTaskingProperty({
              mainDoc: this.mainDoc,
              comments: this.comments,
              newComment: newComment
            });

            // заменить или добавить новый comment
            const match = _.findWhere(this.comments, {unid: newComment.unid});
            if (match) {
              // заменить comment
              _.extend(_.findWhere(this.comments, {unid: newComment.unid}), newComment);

              // перезаписать unid комментария, который был изменен
              // чтобы, например, выполнить действия при инициализации компонента-комментария, если этот комментарий был изменен
              this.discusService.changeModifiedCommentUnid(newComment.unid);
            } else {
              // добавить новый comment
              this.comments = [...this.comments, newComment];
            }

            // если коммент - просьба
            // обновить список подписанных участников main_doc с учетом исполнителей коммента-просьбы
            // обновить список tasksSubjects: { unid: название просьбы } с учетом новой вложенной просьбы
            if (newComment instanceof DiscusTask) {
              // обновить список tasksSubjects
              let tasksSubjects: IDiscusTaskSubjects = {};
              this.discusService.discusTasksSubjectsChanges
                .pipe(takeUntil(this._destroyed))
                .subscribe((res: IDiscusTaskSubjects) => {
                  tasksSubjects = res;
                });
              tasksSubjects[newComment.unid] = newComment.subject;
              this.discusService.changeDiscusTasksSubjects(tasksSubjects);


              // обновить список подписанных участников main_doc
              const subscribedParts = newComment.getParticipants('subscribed') || [];
              const subscribedPartsUserName = _.pluck(subscribedParts, 'userName');

              const mainSubscribedParts = this.mainDoc.getParticipants('subscribed') || [];
              const mainSubscribedPartsUserName = _.pluck(mainSubscribedParts, 'userName');

              // получить массив: string[] с уникальными участниками из newComment
              // чтобы дополнить ими main_doc.security
              const diff: string[] = _.difference(subscribedPartsUserName, mainSubscribedPartsUserName);

              // дополнить уникальными участниками из newComment main_doc.security
              for (let i = 0; i < diff.length; i++) {
                const part = diff[i];

                this.discusParticipantsService.addParticipant({
                  participant: part, type: 'username', whichDoc: this.mainDoc, save: true
                })
                  .pipe(takeUntil(this._destroyed))
                  .subscribe((res) => {
                    if (res) {
                      this.mainDoc.security = res.security;
                    }
                  });
              }


              // обновить список подписанных межпортальных участников main_doc
              const subscribedShareParts = newComment.getShareParticipants('subscribed') || [];
              const mainSubscribedShareParts = this.mainDoc.getShareParticipants('subscribed') || [];
              const shareDiff: IShareModel[] = [];

              // получить массив: IShareModel[] с уникальными межпортальными участниками из newComment
              // чтобы дополнить ими main_doc.shareSecurity
              for (let i = 0; i < subscribedShareParts.length; i++) {
                const domainInfo = subscribedShareParts[i];
                const sdmatch = _.findWhere(mainSubscribedShareParts, {domain: domainInfo.domain});

                // если в main_doc.shareSecurity есть такой же домен, что и в newComment.shareSecurity
                if (sdmatch) {
                  const sdparts = _.difference(domainInfo.participants, sdmatch.participants);

                  for (let j = 0; j < sdparts.length; j++) {
                    const part = sdparts[j];
                    const item: IShareModel = {domain: domainInfo.domain, login: part};
                    shareDiff.push(item);
                  }
                } else {
                  for (let j = 0; j < domainInfo.participants.length; j++) {
                    const part = domainInfo.participants[j];
                    const item: IShareModel = {domain: domainInfo.domain, login: part};
                    shareDiff.push(item);
                  }
                }
              }

              // дополнить main_doc.shareSecurity уникальными межпортальными участниками из newComment
              for (let j = 0; j < shareDiff.length; j++) {
                const domain = shareDiff[j].domain;
                const part = shareDiff[j].login;

                this.mainDoc.addSharePrivilege(domain, 'read', part, 'username');
                this.mainDoc.addSharePrivilege(domain, 'subscribed', part, 'username');
              }


              // перезаписать текущее значение документа (main-doc) на полученное с сервера
              // для использования его в компонентах, в которых сделана подписка на эти изменения
              this.discusService.changeMainDocument(this.mainDoc);
            }
          }
        }
      });
  }

  // подписаться на обновление списка пользователей, находящихся в дискуссии
  listenSocketRefreshDiscusUsers(): void {
    this.socketService.on('refreshDiscusUsers')
      .pipe(
        take(1)
      )
      .subscribe((discusUsers) => {
        if (discusUsers) {
          // перезаписать текущее значение списка пользователей, находящихся в дискуссии, на полученное с сервера
          // для использования его в компонентах, в которых сделана подписка на эти изменения
          this.socketService.changeDiscusUserList(discusUsers);
        }
      });
  }

  // Заголовок страницы "Информатор"
  private setPageTitle(pageTitle?: string): void {
    if (pageTitle) {
      this.titleService.setTitle(pageTitle);
      return;
    }

    this.translate.get('notificator.title')
      .pipe(takeUntil(this._destroyed))
      .subscribe((title: string) => this.titleService.setTitle(title));
  }

  /**
   * подписаться на загрузку уведомлений с сервера
   * сама загрузка уведомлений с сервера запускается в компоненте profile.component
   */
  private listenLoadNotificationsFromServer(): void {
    this.serverNotifications$
      .pipe(
        switchMap((list: INotification[]) => {
          // задать начальное состояние для всех уведомлений
          this.setInitialState(list);
          this.socketService.changeNotifications(list);
          return this.activatedRoute.paramMap;
        }),
        filter((params: ParamMap) => !!params.get('unid') && this.notificatorSharedService.isAutoOpened),
        takeUntil(this._destroyed)
      )
      .subscribe((params: ParamMap) => {
        // если при переходе в информатор нужно открыть уведомление
        const unid = params.get('unid');
        this.notificatorService.changeOpenedNotification({ unid });
        this.notificatorSharedService.isAutoOpened = false;
      });
  }

  /**
   * подписаться на обновленные уведомления (когда изменился статус): this.notificationService.notificationsWithState$,
   * чтобы обновить notifications, normalNotifications и urgentNotifications
   */
  private listenNotificationStatusUpdates(): void {
    this.notificatorService.notificationsWithState$.pipe(
      takeUntil(this._destroyed),
      mergeMap((notificationsWithState: INotification[]) => this.getNotifications(notificationsWithState)),
    ).subscribe((notifs: INotification[]) => {
      this.notifications = notifs;
      this.urgentNotifications = this.getUrgentNotifications();
      this.normalNotifications = this.getNormalNotifications();
    });
  }

  // подписка на изменения когда пользователь нажимает на стрелку открыть уведомления
  private listenToggleNotification(): void {
    this.notificatorService.openedNotification$
      .pipe(takeUntil(this._destroyed))
      .subscribe((openedNotification: IChangedNotification) => {
        this.openedNotification = openedNotification;
        this.handleOpenedNotification(openedNotification?.unid);
      });
  }

  // подписка на изменения когда пользователь нажимает на чекбокс уведомления
  private listenCheckedNotification(): void {
    this.notificatorService.checkedNotification$
      .pipe(takeUntil(this._destroyed))
      .subscribe((checkedNotification: IChangedNotification) => {
        setTimeout(() => this.toggleChecked(checkedNotification?.unid), 0);
      });
  }

  // эта подписка используется как триггер для того чтобы обновить уведомления
  private listenUpdateAllNotifications(): void {
    this.notificatorSharedService.notifyAboutUpdateNotifications$
      .pipe(
        takeUntil(this._destroyed),
        filter((notify: INotifyNotifications) => notify.update === true)
      )
      .subscribe(() => {
        this.setInitialState(this.socketNotifications);
      });
  }

  // подписка на обновления уведомлений по сокету
  private listenSocketNotify(): void {
    this.socketService.notificationsChanges$
      .pipe(
        takeUntil(this._destroyed)
      )
      .subscribe((res: INotification[]) => {
        this.socketNotifications = res;
        
        // изменить urgency уведомления
        const match = res.find(
          item => item.unid === this.openedNotification?.unid
        );

        const updatedNotification = this.notifications.find(
          item => item.unid === this.openedNotification?.unid
        );
        if (updatedNotification) {
          updatedNotification.urgency = match ? match.urgency : 0;
        }
      });
  }

  // все уведомления
  private getNotifications(notificationsWithState: INotification[]): Observable<INotification[]> {
    return new Observable(obs => {
      const notifs: INotification[] = notificationsWithState?.filter(item => {
        if ('notifyWhen' in item) {
          const notifyWhen = new Date(item.notifyWhen);
          return notifyWhen <= this.serverTimes?.serverTimeMsk;
        }
        return true;
      });

      obs.next(notifs);
    });
  }

  // срочные уведомления
  private getUrgentNotifications(): INotification[] {
    return this.notifications?.filter(item => item.urgency === 2) || [];
  }

  // нормальные (не срочные) уведомления
  private getNormalNotifications(): INotification[] {
    return this.notifications?.filter(item => item.urgency !== 2) || [];
  }

  private setInitialState(list: INotification[]) {
    this.notificatorService.setInitialState(list);
  }

  private setLoading(unid: string) {
    this.notificatorService.setLoadingState(unid);
  }

  private setOpened(unid: string) {
    this.notificatorService.setOpenedState(unid);
  }

  private toggleChecked(unid: string) {
    this.notificatorService.toggleCheckedState(unid);
  }

  trackByFn(idx: number, notification: INotification): string {
    return notification.unid;
  }

  ngOnDestroy() {
    this.notificatorService.changeOpenedNotification({ unid: null });
    this.notificatorService.changeCheckedNotification({ unid: null });
    this._destroyed.next(null);
    this._destroyed.complete();
  }
}
