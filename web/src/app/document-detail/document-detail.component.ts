import { Component, OnInit, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ethers } from 'ethers'
import { EthereumConnectionContextService } from '../ethereum-connection-context.service';

@Component({
  selector: 'app-document-detail',
  templateUrl: './document-detail.component.html',
  styleUrls: ['./document-detail.component.css']
})
export class DocumentDetailComponent implements OnInit {

  private ethereumConnectionContextServiceSubscription: Subscription;

  constructor(
    private route: ActivatedRoute,
    private ethereumConnectionContextService : EthereumConnectionContextService) {
      this.ethereumConnectionContextServiceSubscription =
        ethereumConnectionContextService.isEthereumConnectionReady$.subscribe(val => {
          if (val)
            this.loadDocument();
      });
    }

  ngOnInit(): void {
    if (this.ethereumConnectionContextService.isEthereumConnectionReady)
      this.loadDocument();
  }

  loadDocument()
  {
    const fileHash = this.route.snapshot.params['documentHash'];
    console.log("filehash", fileHash);
    console.log("LOAD DOCUMENT");
    // const ethNOS = new ethers.Contract(
    //   '0xB225e7bDC888d4dD407Ff9487b0d5d2ccc98823c',);
  }

  ngOnDestroy() {
    this.ethereumConnectionContextServiceSubscription.unsubscribe();
  }
}
