import { Component, OnInit } from '@angular/core';
import { Router, Event, NavigationEnd } from '@angular/router';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import { EthereumConnectionContextService } from '../ethereum-connection-context.service';
import { Mode as AddressOrHashMode } from '../address-or-hash/address-or-hash.component';
import { ProviderRpcError } from '../common-types';

@Component({
    selector: 'app-top-bar',
    templateUrl: './top-bar.component.html',
    styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent implements OnInit {

    private web3Provider: ethers.providers.Web3Provider | null = null;
    private web3Signer: ethers.providers.JsonRpcSigner | null = null;

    private _isEthereumProviderConnectedToCompatibleNetwork: boolean = false;

    AddressOrHash = AddressOrHashMode;

    isInDocumentDetail: boolean = false;
    isInitializingEthereumProvider: boolean = true;
    isEthereumProviderPresent: boolean = false;
    isEthereumProviderConnected: boolean = false;
    isEthereumProviderActionNeeded: boolean = false;
    selectedAddress: string | null = null;

    get isEthereumProviderConnectedToCompatibleNetwork() {
        return this._isEthereumProviderConnectedToCompatibleNetwork;
    }

    set isEthereumProviderConnectedToCompatibleNetwork(val: boolean) {
        this._isEthereumProviderConnectedToCompatibleNetwork = val;
        this.ethereumConnectionContextService.update(
            val,
            val ? this.web3Provider : null,
            val ? this.web3Signer : null);
    }

    constructor(
        private ethereumConnectionContextService: EthereumConnectionContextService,
        private router: Router) {
        this.router.events.subscribe((event: Event) => {
            if (event instanceof NavigationEnd) {
                this.isInDocumentDetail = event.url.includes('document');
            }
        });
    }

    async ngOnInit() {

        const ethereumProvider = await detectEthereumProvider() as any;
        this.isInitializingEthereumProvider = false;

        if (ethereumProvider) {
            this.isEthereumProviderPresent = true;
            this.web3Provider = new ethers.providers.Web3Provider(ethereumProvider, 'any');

            // TODO: not triggered when initial connect is ignored, page is refreshed
            //       and then connect is completed through MetaMask
            ethereumProvider.on(
                'accountsChanged',
                (_: Array<string>) => {
                    // this.refreshEthereumConnection(); does not reflect the change, rather reload
                    window.location.reload();
                });

            ethereumProvider.on(
                'chainChanged',
                (_: string) => window.location.reload());

            await this.refreshEthereumConnection();
        }
        else {
            this.isEthereumProviderPresent = false;
        }
    }

    async connect() {
        try {
            this.isEthereumProviderActionNeeded = true;
            await this.web3Provider!.send('eth_requestAccounts', []);
            // this.refreshEthereumConnection(); - not needed, will be reloaded
        }
        catch (err) {
            const errorCode = (err as ProviderRpcError).code;

            if (errorCode == 4001) {
                // request rejected
                this.isEthereumProviderActionNeeded = false;
            }
            else if (errorCode == -32002) {
                // request already submitted, do nothing
            }
            else {
                // TODO: handle
                throw err;
            }
        }
    }

    async refreshEthereumConnection() {
        try {
            this.web3Signer = await this.web3Provider!.getSigner();
            this.selectedAddress = await this.web3Signer!.getAddress();

            this.isEthereumProviderConnected = true;
            this.isEthereumProviderActionNeeded = false;

            const network = await this.web3Provider!.getNetwork();
            this.isEthereumProviderConnectedToCompatibleNetwork =
                network.chainId == 4 ||  // Rinkeby
                network.chainId == 1337;  // local
        }
        catch (err) {
            this.isEthereumProviderConnected = false;
            this.isEthereumProviderConnectedToCompatibleNetwork = false;
            this.selectedAddress = null;
        }
    }
}
