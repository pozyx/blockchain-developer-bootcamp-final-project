import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { NgxFileDropModule } from 'ngx-file-drop';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TopBarComponent } from './top-bar/top-bar.component';
import { DocumentInputComponent } from './document-input/document-input.component';
import { DocumentDetailComponent, SubmitDocumentConfirmationDialog } from './document-detail/document-detail.component';
import { NotConnectedComponent } from './not-connected/not-connected.component';
import { AddressOrHashComponent } from './address-or-hash/address-or-hash.component';

@NgModule({
    declarations: [
        AppComponent,
        TopBarComponent,
        DocumentInputComponent,
        DocumentDetailComponent,
        NotConnectedComponent,
        AddressOrHashComponent,
        SubmitDocumentConfirmationDialog
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        NgxFileDropModule,
        MatToolbarModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatButtonModule,
        MatTooltipModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatCardModule,
        MatTableModule,
        MatChipsModule,
        MatDialogModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
