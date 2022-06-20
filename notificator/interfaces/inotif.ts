export interface INotif {
  [key: string]: INotification;
}

export interface INotification {
  Author: string;
  AuthorLogin: string;
  addedFrom: string;
  addedWhen: string;
  notifyWhen?: string;
  authorRus: string;
  created: string;
  docs: Record<string, INotificationDocs>;
  entryOrder: string;
  form: string;
  id: string;
  isPublic: boolean;
  lastMailSendUnid: string;
  modified: string;
  parentForm: string;
  parentUnid: string;
  receiver: string;
  status: string;
  subject: string;
  unid: string;
  urgency: number;

  state?: {
    opened: boolean;
    checked: boolean;
    loading: boolean;
  };

  // TODO unknown props
  subjVoting?: any;
  note?: any;
  documentType?: any;
  DocumentTypeGroup?: any;
}

export interface INotificationDocs {
  subject: string;
  timestamp: string;
  urgency: number;
}
