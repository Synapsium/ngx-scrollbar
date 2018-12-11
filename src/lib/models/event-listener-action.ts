export class EventListenerAction {
    public element: any;
    public events: Array<string>;
    public call: (event: any) => boolean | void;
    public remove?: (event: any) => boolean | void;
    public condition?: () => boolean;

    constructor() {
        this.events = new Array<string>();
    }
}