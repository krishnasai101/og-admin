import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { BaseService } from '../../../shared/services/base.service';
@Injectable()
export class LocaleService extends BaseService {

  constructor(public _http: Http) {
    super();
  }

  /* returns all langCode and names list (langCode == undefined) */
  get(langCode?: any): Observable<any> {
    return this._http.get(this._url + '/locale/get_locale/' + (langCode || ''), this.get_options())
      .map(this.extractData)
      .catch(this.handleError);
  }

  add(data: any): Observable<any> {
    return this._http.post(this._url + '/locale/add_locale', data , this.post_options())
      .map(this.extractData)
      .catch(this.handleError);
  }

  update(data: any): Observable<any> {
    return this._http.post(this._url + '/locale/update_locale', data, this.post_options())
      .map(this.extractData)
      .catch(this.handleError);
  }

  remove(langCode: any): Observable<any> {
    return this._http.post(this._url + '/locale/remove_locale', {langCode:langCode}, this.post_options())
      .map(this.extractData)
      .catch(this.handleError);
  }
}
