import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { ethers } from 'ethers'
import { EthereumConnectionContextService } from '../ethereum-connection-context.service';
import { Mode as AddressOrHashMode } from '../address-or-hash/address-or-hash.component';

import EthNOS from '../EthNOS.json';

enum CertificationState {
    NotSubmitted = 0,
    CertificationPending = 1,
    Certified = 2
}

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

function isKeyof<T extends object>(
    obj: T,
    possibleKey: keyof any)
    : possibleKey is keyof T {
    return possibleKey in obj;
}

interface INetwork {
    address: string;
}

@Component({
    selector: 'app-document-detail',
    templateUrl: './document-detail.component.html',
    styleUrls: ['./document-detail.component.scss']
})
export class DocumentDetailComponent implements OnInit {

    private static readonly considerEventNewWhenReceivedAfterMs: number = 1000;

    private ethereumConnectionContextServiceSubscription: Subscription;

    private signingBalance: bigint | null = null;

    CertificationState = CertificationState;
    AddressOrHash = AddressOrHashMode;

    documentHash: string | null = null;
    certificationState: CertificationState | null = null;
    submitter: string | null = null;
    submissionTime: Date | null = null;
    certificationTime: Date | null = null;
    signatories: SigningInfo[] = [];
    formattedSigningBalance : string | null = null;
    supportsEtherlessSigning : boolean | null = null;

    ethNOS: ethers.Contract | null = null;
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

            if (this.ethNOS != null) this.ethNOS.removeAllListeners();
            const ethNOS = new ethers.Contract(
                contractAddress,
                EthNOS.abi,
                this.ethereumConnectionContextService.web3Signer!);
            this.ethNOS = ethNOS;

            const paymasterContractAddress = await ethNOS.ethNOSPaymaster();
            // console.log('paymasterContractAddress', paymasterContractAddress);
            this.supportsEtherlessSigning = paymasterContractAddress != ethers.constants.AddressZero;

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

            this.certificationTime = this.parseTimeStamp(verifyDocumentResult.currentCertification.certificationTime);
            // console.log('certificationTime', this.certificationTime);

            this.signatories = [];

            for (let signatory of verifyDocumentResult.currentCertification.requiredSignatories) {

                let signTime: Date | null = null;

                for (let signature of verifyDocumentResult.signatures) {
                    if (signature.signatory == signatory) {
                        signTime = this.parseTimeStamp(signature.signTime);
                        break;
                    }
                }

                this.signatories.push(
                    new SigningInfo(
                        signatory as string,
                        signTime
                    ));
            }
            // console.log('signatories', this.signatories);

            if (this.supportsEtherlessSigning)
            {
                this.signingBalance = (await ethNOS.getDocumentSigningBalance(this.documentHash)).toBigInt() as bigint;
                // console.log('signingBalance', this.signingBalance);
                this.formattedSigningBalance = ethers.utils.formatUnits(this.signingBalance);
            }

            const eventsSubscriptionTime = new Date();
            const isEventNew = function() : boolean {
                const eventTime = new Date();
                return (eventTime.getTime() - eventsSubscriptionTime.getTime() >
                    DocumentDetailComponent.considerEventNewWhenReceivedAfterMs);
            }

            ethNOS.on(
                ethNOS.filters.DocumentSubmitted(this.documentHash),
                (documentHash, event) => {
                // console.log('DocumentSubmitted', documentHash, event);
                if (!isEventNew()) return;
                this.snackBar.open('Document submitted.', undefined, { duration: 2000, panelClass: 'snackBar' });
                this.loadDocument();
            });

            ethNOS.on(
                ethNOS.filters.DocumentSubmissionAmended(this.documentHash),
                (documentHash, event) => {
                // console.log('DocumentSubmissionAmended', documentHash, event);
                if (!isEventNew()) return;
                this.snackBar.open('Document submission amended.', undefined, { duration: 2000, panelClass: 'snackBar' });
                this.loadDocument();
            });

            ethNOS.on(
                ethNOS.filters.DocumentSubmissionDeleted(this.documentHash),
                (documentHash, event) => {
                // console.log('DocumentSubmissionDeleted', documentHash, event);
                if (!isEventNew()) return;
                this.snackBar.open('Document submission deleted.', undefined, { duration: 2000, panelClass: 'snackBar' });
                this.loadDocument();
            });

            ethNOS.on(
                ethNOS.filters.DocumentSigningFunded(this.documentHash),
                (documentHash, amount, event) => {
                // console.log('DocumentSigningFunded', documentHash, amount, event);
                if (!isEventNew()) return;
                this.snackBar.open(`Document signing funded (${ethers.utils.formatUnits(amount)} ETH).`, undefined, { duration: 2000, panelClass: 'snackBar' });
                this.loadDocument();
            });

            ethNOS.on(
                ethNOS.filters.DocumentSigningBalanceWithdrawn(this.documentHash),
                (documentHash, amount, event) => {
                // console.log('DocumentSigningBalanceWithdrawn', documentHash, amount, event);
                if (!isEventNew()) return;
                this.snackBar.open(`Document signing balance withdrawn (${ethers.utils.formatUnits(amount)} ETH).`, undefined, { duration: 2000, panelClass: 'snackBar' });
                this.loadDocument();
            });

            ethNOS.on(
                ethNOS.filters.DocumentSigned(this.documentHash),
                (documentHash, signatory, event) => {
                // console.log('DocumentSigned', documentHash, signatory, event);
                if (!isEventNew()) return;
                this.snackBar.open(`Document signed by ${signatory}.`, undefined, { duration: 2000, panelClass: 'snackBar' });
                this.loadDocument();
            });

            ethNOS.on(
                ethNOS.filters.DocumentSigningCharged(this.documentHash),
                (documentHash, amount, event) => {
                // console.log('DocumentSigningCharged', documentHash, amount, event);
                if (!isEventNew()) return;
                // not showing for now
                // this.snackBar.open(`Document signing charged (${ethers.utils.formatUnits(amount)} ETH).`, undefined, { duration: 2000, panelClass: 'snackBar' });
                this.loadDocument();
            });

            ethNOS.on(
                ethNOS.filters.DocumentCertified(this.documentHash),
                (documentHash, event) => {
                // console.log('DocumentCertified', documentHash, event);
                if (!isEventNew()) return;
                this.snackBar.open('Document certified.', undefined, { duration: 2000, panelClass: 'snackBar' });
                this.loadDocument();
            });

            this.isBusy = false;
        }
        catch (err) {
            if (this.ethNOS != null) this.ethNOS.removeAllListeners();
            this.ethNOS = null;
            console.log('Error querying document', err);
            this.snackBar.open('Unexpected Error: Cannot query document!', undefined, { duration: 5000, panelClass: ['snackBar', 'snackBarError'] });
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
