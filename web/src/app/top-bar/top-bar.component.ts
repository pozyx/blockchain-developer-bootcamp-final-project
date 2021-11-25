import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ethers } from 'ethers';
import detectEthereumProvider  from '@metamask/detect-provider';
import { EthereumConnectionContextService } from '../ethereum-connection-context.service';

// TODO: extract?
interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.css']
})

export class TopBarComponent implements OnInit {

  private web3Provider : ethers.providers.Web3Provider | null = null;
  private web3Signer : ethers.providers.JsonRpcSigner | null = null;

  private _isEthereumProviderConnectedToCompatibleNetwork : boolean = false;

  public isInitializingEthereumProvider : boolean = true;
  public isEthereumProviderPresent : boolean = false;
  public isEthereumProviderConnected : boolean = false;
  public isEthereumProviderActionNeeded : boolean = false;
  public selectedAddress : string | null = null;

  public get isEthereumProviderConnectedToCompatibleNetwork(){
    return this._isEthereumProviderConnectedToCompatibleNetwork;
  }

  public set isEthereumProviderConnectedToCompatibleNetwork(val: boolean) {

    this._isEthereumProviderConnectedToCompatibleNetwork = val;

    this.ethereumConnectionContextService.update(
      val,
      val ? this.web3Provider : null,
      val ? this.web3Signer : null);
  }

  constructor(private ethereumConnectionContextService : EthereumConnectionContextService)
  { }

  async ngOnInit() {
    const ethereumProvider = await detectEthereumProvider() as any;

    this.isInitializingEthereumProvider = false;

    if (ethereumProvider) {
      this.isEthereumProviderPresent = true;
      this.web3Provider = new ethers.providers.Web3Provider(ethereumProvider, "any");

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
    try
    {
      this.isEthereumProviderActionNeeded = true;
      await this.web3Provider!.send("eth_requestAccounts", []);
      // this.refreshEthereumConnection(); - not needed, will be reloaded
    }
    catch (err)
    {
      const errorCode = (err as ProviderRpcError).code;

      if (errorCode == 4001)
      {
        // request rejected
        this.isEthereumProviderActionNeeded = false;
      }
      else if (errorCode == -32002)
      {
        // request already submitted, do nothing
      }
      else
      {
        // TODO: handle
        throw err;
      }
    }
  }

  async refreshEthereumConnection()
  {
    try
    {
      this.web3Signer = await this.web3Provider!.getSigner();
      this.selectedAddress = await this.web3Signer!.getAddress();

      this.isEthereumProviderConnected = true;
      this.isEthereumProviderActionNeeded = false;

      const network = await this.web3Provider!.getNetwork();
      this.isEthereumProviderConnectedToCompatibleNetwork =
        network.chainId == 4 ||  // Rinkeby
        network.chainId > 1000;  // local
    }
    catch (err)
    {
      this.isEthereumProviderConnected = false;
      this.isEthereumProviderConnectedToCompatibleNetwork = false;
      this.selectedAddress = null;
    }
  }
}
