export class AttachedEvent {
    public element: any;
    public event: string;
    public unlisten: () => void;
    public remove?: () => boolean | void;
}
