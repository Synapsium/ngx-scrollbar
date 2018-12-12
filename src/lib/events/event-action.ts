export class EventAction {
    public element: any;
    public events: Array<string>;
    public call: (event: any) => boolean | void;
    public remove?: () => boolean | void;
    public condition?: () => boolean;

    constructor() {
        this.events = new Array<string>();
    }
}
