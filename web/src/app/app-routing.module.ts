import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocumentInputComponent } from './document-input/document-input.component';
import { DocumentDetailComponent } from './document-detail/document-detail.component';

const routes: Routes =
    [
        { path: '', component: DocumentInputComponent },
        { path: 'document/:documentHash', component: DocumentDetailComponent },
    ];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
