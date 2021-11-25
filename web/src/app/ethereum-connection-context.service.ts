import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ethers } from 'ethers';

@Injectable({
  providedIn: 'root'
})
export class EthereumConnectionContextService {

  constructor() { }

  private _isEthereumConnectionReady : boolean = false;
  private isEthereumConnectionReadySource = new Subject<boolean>();
  private _web3Provider : ethers.providers.Web3Provider | null = null;
  private _web3Signer : ethers.providers.JsonRpcSigner | null = null;

  public get isEthereumConnectionReady() {
    return this._isEthereumConnectionReady;
  }

  isEthereumConnectionReady$ = this.isEthereumConnectionReadySource.asObservable();

  public get web3Provider() {
    return this._web3Provider;
  }

  public get web3Signer() {
    return this._web3Signer;
  }

  update(
    isEthereumConnectionReady : boolean,
    web3Provider : ethers.providers.Web3Provider | null,
    web3Signer : ethers.providers.JsonRpcSigner | null) {
    this._isEthereumConnectionReady = isEthereumConnectionReady;
    this._web3Provider = web3Provider;
    this._web3Signer = web3Signer;
    this.isEthereumConnectionReadySource.next(isEthereumConnectionReady);
  }
}
