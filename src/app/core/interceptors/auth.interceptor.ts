import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PharmacyStore } from '../state/pharmacy-store';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private store = inject(PharmacyStore);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.store.jwtToken();
    let authReq = req;
    if (token && req.url.startsWith('/api')) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
    }
    return next.handle(authReq);
  }
}
