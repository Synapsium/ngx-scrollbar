import { Scrollbar } from './scrollbar';

export class ScrollbarContainer {
    public scrollbar: Scrollbar;
    public marginTop?: string;
    public marginBottom: string;
    public marginRight: string;
    public marginLeft: string;

    constructor() {
        this.scrollbar = new Scrollbar();
    }
}
