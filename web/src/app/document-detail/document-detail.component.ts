import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { ethers } from 'ethers'
import { EthereumConnectionContextService } from '../ethereum-connection-context.service';
import { Mode as AddressOrHashMode } from '../address-or-hash/address-or-hash.component';

import EthNOS from '../EthNOS.json';

// TODO: extract?
enum CertificationState {
    NotSubmitted = 0,
    CertificationPending = 1,
    Certified = 2
}

// TODO: extract?
class SigningInfo {
    constructor(
        private _signatory: string,
        private _signTime: Date | null) { }

    get signatory() {
        return this._signatory;
    }

    get signTime() {
        return this._signTime;
    }
}

// TODO: extract?
function isKeyof<T extends object>(
    obj: T,
    possibleKey: keyof any)
    : possibleKey is keyof T {
    return possibleKey in obj;
}

// TODO: extract?
interface INetwork {
    address: string;
}

@Component({
    selector: 'app-document-detail',
    templateUrl: './document-detail.component.html',
    styleUrls: ['./document-detail.component.scss']
})
export class DocumentDetailComponent implements OnInit {

    private ethereumConnectionContextServiceSubscription: Subscription;

    CertificationState = CertificationState;
    AddressOrHash = AddressOrHashMode;

    documentHash: string | null = null;
    certificationState: CertificationState | null = null;
    submitter: string | null = null;
    submissionTime: Date | null = null;
    certificationTime: Date | null = null;
    signatories: SigningInfo[] = [];

    isBusy: boolean = true;

    constructor(
        private route: ActivatedRoute,
        private ethereumConnectionContextService: EthereumConnectionContextService,
        private snackBar: MatSnackBar,
        private router: Router) {
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

    async loadDocument() {
        try {
            this.isBusy = true;

            this.documentHash = this.route.snapshot.params['documentHash'];
            // console.log('documentHash', this.documentHash);

            const chainId =
                (await this.ethereumConnectionContextService.web3Provider!.getNetwork()).chainId;
            // console.log('chainId', chainId);
            if (!isKeyof(EthNOS.networks, chainId))
                throw new Error(`Unsupported Chain ID (${chainId})`);

            const contractAddress = (EthNOS.networks[chainId] as INetwork).address;
            // console.log('contractAddress', contractAddress);

            const ethNOS = new ethers.Contract(
                contractAddress,
                EthNOS.abi,
                this.ethereumConnectionContextService.web3Signer!);

            const verifyDocumentResult = await ethNOS.verifyDocument(this.documentHash);
            // console.log(verifyDocumentResult);

            this.certificationState = verifyDocumentResult.certificationState;
            // console.log('certificationState', CertificationState[this.certificationState as number]);

            this.submitter =
                verifyDocumentResult.submitter != ethers.constants.AddressZero
                    ? verifyDocumentResult.submitter
                    : null;
            // console.log('submitter', this.submitter);

            this.submissionTime = this.parseTimeStamp(verifyDocumentResult.currentCertification.submissionTime);
            // console.log('submissionTime', this.submissionTime);

            //--

            // TODO: extract time conversion?
            this.certificationTime =
                verifyDocumentResult.currentCertification.certificationTime != 0
                    ? new Date(verifyDocumentResult.currentCertification.certificationTime * 1000)
                    : null;
            console.log('certificationTime', this.certificationTime); // TODO: display

            this.signatories = [];

            for (let signatory of verifyDocumentResult.currentCertification.requiredSignatories) {

                let signTime: Date | null = null;

                for (let signature of verifyDocumentResult.signatures) {
                    if (signature.signatory == signatory) {
                        // TODO: extract time conversion?
                        signTime =
                            signature.signTime != 0
                                ? new Date(signature.signTime * 1000)
                                : null;
                        break;
                    }
                }

                this.signatories.push(
                    new SigningInfo(
                        signatory as string,
                        signTime
                    ));
            }
            console.log('signatories', this.signatories); // TODO: display

            this.isBusy = false;
        }
        catch (err) {
            console.log("Error querying document", err);
            this.snackBar.open("Unexpected Error: Cannot query document!", undefined, { duration: 5000, panelClass: ["snackBar", "snackBarError"] });
            this.router.navigateByUrl('/');
        }
    }

    ngOnDestroy() {
        this.ethereumConnectionContextServiceSubscription.unsubscribe();
    }

    private parseTimeStamp(ts: any) : Date | null {
        return ts != 0
            ? new Date(ts * 1000)
            : null;
    }
}
