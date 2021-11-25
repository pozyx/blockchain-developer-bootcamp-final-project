import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { ethers } from 'ethers'

@Component({
  selector: 'app-document-input',
  templateUrl: './document-input.component.html',
  styleUrls: ['./document-input.component.css']
})
export class DocumentInputComponent implements OnInit {

  constructor(
    private router: Router,
    private ngZone: NgZone) { }

  ngOnInit(): void {
  }

  handleSelectFile(event: Event) {
    let fileList = (event.currentTarget as HTMLInputElement).files;
    if (fileList && fileList.length == 1)
    {
      let file = fileList.item(0);
      if (file)
        this.selectFile(file);
    }
  }

  public handleDropFile(fileList: NgxFileDropEntry[]) {
    if (fileList.length == 1)
    {
      let droppedFile = fileList[0];
      if (droppedFile.fileEntry.isFile) {
        (droppedFile.fileEntry as FileSystemFileEntry)
          .file((file: File) =>
            this.ngZone.run(() =>
              this.selectFile(file)));
      }
    }
  }

  selectFile(file: File) {
    var reader = new FileReader();
    var router = this.router;
    reader.onload = function() {
      var arrayBuffer = <ArrayBuffer>this.result;
      if (arrayBuffer)
      {
        var byteArray = new Uint8Array(arrayBuffer);
        var fileHash = ethers.utils.keccak256(byteArray);
        router.navigateByUrl('/document/' + fileHash);
      }
    }
    reader.readAsArrayBuffer(file);
  }
}
