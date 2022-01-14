import { Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { ethers } from 'ethers'
import { DocumentInputContextService } from '../document-input-context.service';

@Component({
    selector: 'app-document-input',
    templateUrl: './document-input.component.html',
    styleUrls: ['./document-input.component.scss']
})
export class DocumentInputComponent {

    constructor(
        private router: Router,
        private ngZone: NgZone,
        private documentInputContextService: DocumentInputContextService) { }

    handleSelectFile(event: Event) {
        let fileList = (event.currentTarget as HTMLInputElement).files;
        if (fileList && fileList.length == 1) {
            let file = fileList.item(0);
            if (file)
                this.selectFile(file);
        }
    }

    handleDropFile(fileList: NgxFileDropEntry[]) {
        if (fileList.length == 1) {
            let droppedFile = fileList[0];
            if (droppedFile.fileEntry.isFile) {
                (droppedFile.fileEntry as FileSystemFileEntry)
                    .file((file: File) =>
                        this.ngZone.run(() =>
                            this.selectFile(file)));
            }
        }
    }

    private selectFile(file: File) {
        const reader = new FileReader();
        const router = this.router;
        const documentInputContextService = this.documentInputContextService;

        reader.onload = function () {
            const arrayBuffer = <ArrayBuffer>this.result;
            if (arrayBuffer) {
                const byteArray = new Uint8Array(arrayBuffer);
                const documentHash = ethers.utils.keccak256(byteArray);

                documentInputContextService.update(file.name);
                router.navigateByUrl('/document/' + documentHash);
            }
        }
        reader.readAsArrayBuffer(file);
    }
}
