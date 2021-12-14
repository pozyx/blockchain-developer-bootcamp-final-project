import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ethers } from 'ethers'
import { EthereumConnectionContextService } from '../ethereum-connection-context.service';

import EthNOSabi from '../EthNOS-abi.json'; // TODO: keep up to date
// import EthNOS from '../../../../build/contracts/EthNOS.json'; // TODO: or like this?

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

@Component({
    selector: 'app-document-detail',
    templateUrl: './document-detail.component.html',
    styleUrls: ['./document-detail.component.css']
})
export class DocumentDetailComponent implements OnInit {

    // TODO: keep up to date
    private readonly ethNOScontractAddress: string = '0xB225e7bDC888d4dD407Ff9487b0d5d2ccc98823c';

    private ethereumConnectionContextServiceSubscription: Subscription;

    documentHash: string | null = null;
    certificationState: CertificationState | null = null;
    submitter: string | null = null;
    submissionTime: Date | null = null;
    certificationTime: Date | null = null;
    signatories: SigningInfo[] = [];

    constructor(
        private route: ActivatedRoute,
        private ethereumConnectionContextService: EthereumConnectionContextService) {
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

    // TODO: test with submitted document
    // TODO: error handling
    // TODO: busy indicator? check on testnet if it is slow
    async loadDocument() {

        this.documentHash = this.route.snapshot.params['documentHash'];
        console.log('documentHash', this.documentHash); // TODO: display

        const ethNOS = new ethers.Contract(
            this.ethNOScontractAddress,
            EthNOSabi, // TODO: EthNOS.abi - or like this?
            this.ethereumConnectionContextService.web3Signer!);

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
    }

    ngOnDestroy() {
        this.ethereumConnectionContextServiceSubscription.unsubscribe();
    }
}
