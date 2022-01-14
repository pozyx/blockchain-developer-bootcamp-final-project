import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DocumentInputContextService {

    constructor() { }

    private _openedFileName: string | null = null;

    get openedFileName() {
        return this._openedFileName;
    }

    update(
        openedFileName: string | null) {
        this._openedFileName = openedFileName;
    }
}
