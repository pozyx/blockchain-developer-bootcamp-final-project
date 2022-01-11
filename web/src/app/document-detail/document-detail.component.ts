import { Component, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { Subscription } from 'rxjs';
import { ethers } from 'ethers';
import { RelayProvider } from '@opengsn/provider/dist';
import { EthereumConnectionContextService } from '../ethereum-connection-context.service';
import { Mode as AddressOrHashMode } from '../address-or-hash/address-or-hash.component';
import { ProviderRpcError } from '../common-types';

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
    selector: 'submit-document-confirmation',
    templateUrl: 'submit-document-confirmation.html',
    styleUrls: ['./confirmation.scss']
})
export class SubmitDocumentConfirmationDialog {
    constructor(@Inject(MAT_DIALOG_DATA) public data: string[]) { }
}

@Component({
    selector: 'sign-document-confirmation',
    templateUrl: 'sign-document-confirmation.html',
    styleUrls: ['./confirmation.scss']
})
export class SignDocumentConfirmationDialog {
    constructor(@Inject(MAT_DIALOG_DATA) public data: boolean) { }
}

@Component({
    selector: 'fund-signing-confirmation',
    templateUrl: 'fund-signing-confirmation.html',
    styleUrls: ['./confirmation.scss']
})
export class FundSigningConfirmationDialog {
    constructor(
        private dialogRef: MatDialogRef<FundSigningConfirmationDialog>,
        @Inject(MAT_DIALOG_DATA) public data: number) { }

    amountFormControl = new FormControl('', [Validators.required, Validators.min(0.000000000000000001)]);

    setResult() {
        this.dialogRef.close(this.amountFormControl.value);
    }
}

@Component({
    selector: 'withdraw-signing-balance-confirmation',
    templateUrl: 'withdraw-signing-balance-confirmation.html',
    styleUrls: ['./confirmation.scss']
})
export class WithdrawSigningBalanceConfirmationDialog {
    constructor(@Inject(MAT_DIALOG_DATA) public data: string[]) { }
}

@Component({
    selector: 'app-document-detail',
    templateUrl: './document-detail.component.html',
    styleUrls: ['./document-detail.component.scss']
})
export class DocumentDetailComponent implements OnInit {

    private static readonly considerEventNewWhenReceivedAfterMs: number = 1000;

    private ethereumConnectionContextServiceSubscription: Subscription;

    readonly signatoriesSeparatorKeysCodes = [ENTER, COMMA, SPACE] as const;

    CertificationState = CertificationState;
    AddressOrHash = AddressOrHashMode;

    documentHash: string | null = null;
    certificationState: CertificationState | null = null;
    submitter: string | null = null;
    submissionTime: Date | null = null;
    certificationTime: Date | null = null;
    signatories: SigningInfo[] = [];
    signingBalance: bigint | null = null;
    formattedSigningBalance: string | null = null;
    private supportsEtherlessSigning: boolean | null = null;
    private selectedAddress: string | null = null;

    signatoriesToSubmit: string[] = [];

    private ethNOS: ethers.Contract | null = null;
    private paymasterContractAddress: string | null = null;
    isBusy: boolean = false;

    constructor(
        private route: ActivatedRoute,
        private ethereumConnectionContextService: EthereumConnectionContextService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialog: MatDialog) {
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

    private async loadDocument() {
        try {
            if (this.isBusy) return;
            this.isBusy = true;

            this.documentHash = this.route.snapshot.params['documentHash'];
            // console.log('documentHash', this.documentHash);

            this.selectedAddress = await this.ethereumConnectionContextService.web3Signer!.getAddress();

            const chainId =
                (await this.ethereumConnectionContextService.web3Provider!.getNetwork()).chainId;
            // console.log('chainId', chainId);
            if (!isKeyof(EthNOS.networks, chainId))
                throw new Error(`Unsupported Chain ID (${chainId})`);

            const contractAddress = (EthNOS.networks[chainId] as INetwork).address;
            // console.log('contractAddress', contractAddress);

            if (this.ethNOS != null) this.ethNOS.removeAllListeners();
            this.ethNOS = await new ethers.Contract(
                contractAddress,
                EthNOS.abi,
                this.ethereumConnectionContextService.web3Signer!);

            this.paymasterContractAddress = await this.ethNOS.ethNOSPaymaster() as string;
            // console.log('paymasterContractAddress', this.paymasterContractAddress);
            this.supportsEtherlessSigning = this.paymasterContractAddress != ethers.constants.AddressZero;

            const verifyDocumentResult = await this.ethNOS.verifyDocument(this.documentHash);
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

            if (this.supportsEtherlessSigning) {
                this.signingBalance = (await this.ethNOS.getDocumentSigningBalance(this.documentHash)).toBigInt() as bigint;
                // console.log('signingBalance', this.signingBalance);
                this.formattedSigningBalance = ethers.utils.formatUnits(this.signingBalance);
            }

            this.subscribeToContractEvents(this.ethNOS);

            this.isBusy = false;
        }
        catch (err) {
            if (this.ethNOS != null) this.ethNOS.removeAllListeners();
            this.ethNOS = null;
            this.showMessage('Cannot query document!', err);
            this.router.navigateByUrl('/');
        }
    }

    private subscribeToContractEvents(ethNOS: ethers.Contract): void {
        const eventsSubscriptionTime = new Date();
        const isEventNew = function (): boolean {
            const eventTime = new Date();
            return (eventTime.getTime() - eventsSubscriptionTime.getTime() >
            DocumentDetailComponent.considerEventNewWhenReceivedAfterMs);
        }

        ethNOS.on(
            ethNOS.filters.DocumentSubmitted(this.documentHash),
            (documentHash, event) => {
                // console.log('DocumentSubmitted', documentHash, event);
                if (!isEventNew()) return;
                this.showMessage('Document submitted.');
                this.loadDocument();
            });

        ethNOS.on(
            ethNOS.filters.DocumentSubmissionAmended(this.documentHash),
            (documentHash, event) => {
                // console.log('DocumentSubmissionAmended', documentHash, event);
                if (!isEventNew()) return;
                this.showMessage('Document submission amended.');
                this.loadDocument();
            });

        ethNOS.on(
            ethNOS.filters.DocumentSubmissionDeleted(this.documentHash),
            (documentHash, event) => {
                // console.log('DocumentSubmissionDeleted', documentHash, event);
                if (!isEventNew()) return;
                this.showMessage('Document submission deleted.');
                this.loadDocument();
            });

        ethNOS.on(
            ethNOS.filters.DocumentSigningFunded(this.documentHash),
            (documentHash, amount, event) => {
                // console.log('DocumentSigningFunded', documentHash, amount, event);
                if (!isEventNew()) return;
                this.showMessage(`Document signing funded (${ethers.utils.formatUnits(amount)} ETH).`);
                this.loadDocument();
            });

        ethNOS.on(
            ethNOS.filters.DocumentSigningBalanceWithdrawn(this.documentHash),
            (documentHash, amount, event) => {
                // console.log('DocumentSigningBalanceWithdrawn', documentHash, amount, event);
                if (!isEventNew()) return;
                this.showMessage(`Document signing balance withdrawn (${ethers.utils.formatUnits(amount)} ETH).`);
                this.loadDocument();
            });

        ethNOS.on(
            ethNOS.filters.DocumentSigned(this.documentHash),
            (documentHash, signatory, event) => {
                // console.log('DocumentSigned', documentHash, signatory, event);
                if (!isEventNew()) return;
                this.showMessage(`Document signed by ${signatory}.`);
                this.loadDocument();
            });

        ethNOS.on(
            ethNOS.filters.DocumentSigningCharged(this.documentHash),
            (documentHash, amount, event) => {
                // console.log('DocumentSigningCharged', documentHash, amount, event);
                if (!isEventNew()) return;
                // not showing for now
                //this.showMessage(`Document signing charged (${ethers.utils.formatUnits(amount)} ETH).`);
                this.loadDocument();
            });

        ethNOS.on(
            ethNOS.filters.DocumentCertified(this.documentHash),
            (documentHash, event) => {
                // console.log('DocumentCertified', documentHash, event);
                if (!isEventNew()) return;
                this.showMessage('Document certified.');
                this.loadDocument();
            });
    }

    addRequiredSignatory(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();

        if (value) {
            if (!ethers.utils.isAddress(value))
                this.showMessage('Invalid address!', value);
            else if (this.signatoriesToSubmit.indexOf(value) >= 0)
                this.showMessage('Cannot add duplicate signatory!', value);
            else
                this.signatoriesToSubmit.push(value);
        }

        event.chipInput!.clear();
    }

    removeRequiredSignatory(signatoryToSubmit: string): void {
        const index = this.signatoriesToSubmit.indexOf(signatoryToSubmit);

        if (index >= 0)
            this.signatoriesToSubmit.splice(index, 1);
    }

    submitDocument(): void {
        this.dialog.open(
            SubmitDocumentConfirmationDialog,
            { data: this.signatoriesToSubmit })
            .afterClosed()
            .subscribe(async result => {
                if (result) {
                    try {
                        // TODO: busy indication
                        await this.ethNOS!.submitDocument(
                            this.documentHash,
                            this.signatoriesToSubmit);

                        this.showMessage('Document submission transaction sent.');
                    }
                    catch (err) {
                        const errorCode = (err as ProviderRpcError).code;

                        if (errorCode == 4001) {
                            this.showMessage('Submission rejected by user.');
                        }
                        // TODO: handle other errors?
                        else {
                            this.showMessage('Cannot submit document!', err);
                        }
                    }
                }
            });
    }

    get isRequiredToSign(): boolean {
        return this.certificationState == CertificationState.CertificationPending &&
            this.signatories.some(s =>
                s.signatory == this.selectedAddress &&
                s.signTime == null);
    }

    signDocument(etherless: boolean): void {
        this.dialog.open(
            SignDocumentConfirmationDialog,
            { data: etherless })
            .afterClosed()
            .subscribe(async result => {
                if (result) {
                    try {
                        if (!etherless) {
                            // TODO: busy indication
                            await this.ethNOS!.signDocument(this.documentHash);
                        }
                        else {
                            const providerForGSNCalls = new ethers.providers.Web3Provider(
                                await(
                                    await RelayProvider.newProvider({
                                        provider: this.ethereumConnectionContextService.web3Provider!.provider as any,
                                        config: {
                                            paymasterAddress: this.paymasterContractAddress!,
                                            // gasPrice:  20000000000   // 20 Gwei  TODO: needed?
                                        }
                                    }))
                                    .init() as any);
                            await providerForGSNCalls.ready;

                            const ethNOSForGSNCalls = await new ethers.Contract(
                                this.ethNOS!.address,
                                EthNOS.abi,
                                providerForGSNCalls.getSigner(
                                    this.selectedAddress!));

                            const transaction = await ethNOSForGSNCalls.signDocument(this.documentHash);
                            // TODO: busy indication (or wait())
                            // await providerForGSNCalls.waitForTransaction(transaction.hash);
                        }

                        this.showMessage('Document signing transaction sent.');
                    }
                    catch (err) {
                        const errorCode = (err as ProviderRpcError).code;

                        if (errorCode == 4001) {
                            this.showMessage('Signing rejected by user.');
                        }
                        // TODO: handle other errors?
                        else {
                            this.showMessage('Cannot sign document!', err);
                        }
                    }
                }
            });
    }

    get canManageFunding(): boolean {
        return this.submitter == this.selectedAddress &&
            this.supportsEtherlessSigning! &&
            (this.certificationState == CertificationState.CertificationPending || this.signingBalance! > 0);
    }

    fundSigning(): void {
        this.dialog.open(
            FundSigningConfirmationDialog)
            .afterClosed()
            .subscribe(async result => {
                if (result) {
                    try {
                        // TODO: busy indication
                        await this.ethNOS!.fundDocumentSigning(
                            this.documentHash,
                            { value: ethers.utils.parseUnits(result.toString())});

                        this.showMessage('Document signing funding transaction sent.');
                    }
                    catch (err) {
                        const errorCode = (err as ProviderRpcError).code;

                        if (errorCode == 4001) {
                            this.showMessage('Funding document signing rejected by user.');
                        }
                        //--
                        // TODO: handle other errors?
                        else {
                            this.showMessage('Cannot fund document signing!', err);
                        }
                    }
                }
            });
    }

    withdrawSigningBalance(): void {
        this.dialog.open(
            WithdrawSigningBalanceConfirmationDialog,
            { data: this.formattedSigningBalance })
            .afterClosed()
            .subscribe(async result => {
                if (result) {
                    try {
                        // TODO: busy indication
                        await this.ethNOS!.withdrawDocumentSigningBalance(this.documentHash);

                        this.showMessage('Withdrawal of document signing balance transaction sent.');
                    }
                    catch (err) {
                        const errorCode = (err as ProviderRpcError).code;

                        if (errorCode == 4001) {
                            this.showMessage('Withdrawal of document signing balance rejected by user.');
                        }
                        // TODO: handle other errors?
                        else {
                            this.showMessage('Cannot withdraw document signing balance!', err);
                        }
                    }
                }
            });
    }

    ngOnDestroy() {
        this.ethereumConnectionContextServiceSubscription.unsubscribe();
    }

    private showMessage(
        message: string,
        err: unknown | null = null): void {
        if (err) {
            console.error(`Error: ${message}`, err);
            this.snackBar.open(`Error: ${message}`, undefined, { duration: 5000, panelClass: ['snackBar', 'snackBarError'] });
        }
        else {
            this.snackBar.open(message, undefined, { duration: 2000, panelClass: ['snackBar'] });
        }
    }

    private parseTimeStamp(ts: any): Date | null {
        return ts != 0
            ? new Date(ts * 1000)
            : null;
    }
}
