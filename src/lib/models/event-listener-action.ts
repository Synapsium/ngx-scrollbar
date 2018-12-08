export class EventListenerAction {
    public element: any;
    public events: Array<string>;
    public action: (event: any) => boolean | void;
    public condition?: () => boolean;

    constructor() {
        this.events = new Array<string>();
    }
}