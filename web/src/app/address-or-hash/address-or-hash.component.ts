import { Component, Input } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard'
import { MatSnackBar } from '@angular/material/snack-bar';

export enum Mode {
    Address = 0,
    Hash = 1
}

@Component({
    selector: 'app-address-or-hash',
    templateUrl: './address-or-hash.component.html',
    styleUrls: ['./address-or-hash.component.scss']
})
export class AddressOrHashComponent {
    private _addressOrHash!: string;

    AddressOrHash = Mode;

    @Input() mode!: Mode;

    @Input() set addressOrHash(value: string) {
        this._addressOrHash = value;
        this.shortenedAddressOrHash =
            this._addressOrHash.substring(0, 10)
            + '.....'
            + this._addressOrHash.substring(this._addressOrHash.length - 10)
    }

    get addressOrHash(): string {
        return this._addressOrHash;
    }

    shortenedAddressOrHash!: string;

    constructor(
        private clipboard: Clipboard,
        private snackBar: MatSnackBar) { }

    copyToClipboard() {
        this.clipboard.copy(this.addressOrHash);
        this.snackBar.open("Copied to clipboard.", undefined, { duration: 2000, panelClass: "snackBar" });
    }
}
