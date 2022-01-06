import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard'
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { ethers } from 'ethers'
import { EthereumConnectionContextService } from '../ethereum-connection-context.service';

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

    private documentHash: string | null = null;

    shortenedDocumentHash: string | null = null;
    certificationState: CertificationState | null = null;
    submitter: string | null = null;
    submissionTime: Date | null = null;
    certificationTime: Date | null = null;
    signatories: SigningInfo[] = [];

    isBusy: boolean = true;

    constructor(
        private route: ActivatedRoute,
        private ethereumConnectionContextService: EthereumConnectionContextService,
        private clipboard: Clipboard,
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
            this.shortenedDocumentHash = this.documentHash!.substring(0, 10)
                + '.....' + this.documentHash!.substring(this.documentHash!.length - 10);

            const chainId =
                (await this.ethereumConnectionContextService.web3Provider!.getNetwork()).chainId;

            if (!isKeyof(EthNOS.networks, chainId))
                throw new Error(`Unsupported Chain ID (${chainId})`);

            const contractAddress = (EthNOS.networks[chainId] as INetwork).address;

            // console.log('contractAddress', contractAddress);

            const ethNOS = new ethers.Contract(
                contractAddress,
                EthNOS.abi,
                this.ethereumConnectionContextService.web3Signer!);

            //--

            const verifyDocumentResult = await ethNOS.verifyDocument(this.documentHash);
            console.log(verifyDocumentResult); // TODO: remove

            this.certificationState = verifyDocumentResult.certificationState;
            console.log('certificationState', CertificationState[this.certificationState as number]); // TODO: display

            this.submitter =
                verifyDocumentResult.submitter != ethers.constants.AddressZero
                    ? verifyDocumentResult.submitter
                    : null;
            console.log('submitter', this.submitter); // TODO: display

            // TODO: extract time conversion?
            this.submissionTime =
                verifyDocumentResult.currentCertification.submissionTime != 0
                    ? new Date(verifyDocumentResult.currentCertification.submissionTime * 1000)
                    : null;
            console.log('submissionTime', this.submissionTime); // TODO: display

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

    copyDocumentHashToClipboard() {
        this.clipboard.copy(this.documentHash!);
        this.snackBar.open("Document hash was copied to clipboard.", undefined, { duration: 2000, panelClass: "snackBar" });
    }

    ngOnDestroy() {
        this.ethereumConnectionContextServiceSubscription.unsubscribe();
    }
}
