import { TestBed } from '@angular/core/testing';

import { EthereumConnectionContextService } from './ethereum-connection-context.service';

describe('EthereumConnectionContextService', () => {
    let service: EthereumConnectionContextService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(EthereumConnectionContextService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
