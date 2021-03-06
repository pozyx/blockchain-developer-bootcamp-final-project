import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { EthereumConnectionContextService } from './ethereum-connection-context.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    providers: [EthereumConnectionContextService]
})
export class AppComponent {

    private ethereumConnectionContextServiceSubscription: Subscription;

    title = 'ethNOS';

    isEthereumConnectionReady: boolean = false;

    constructor(private ethereumConnectionContextService: EthereumConnectionContextService) {
        this.ethereumConnectionContextServiceSubscription =
            ethereumConnectionContextService.isEthereumConnectionReady$.subscribe(val => {
                this.isEthereumConnectionReady = val;
            });
    }

    ngOnDestroy() {
        this.ethereumConnectionContextServiceSubscription.unsubscribe();
    }
}
