import { environment } from './../../../../../../environments/environment';
import { Script } from './../../../../../shared/services/script.service';
import { PremadeCalcsService } from './../../../services/premade-calcs.service';
import { Datatable } from './../../../../../shared/interfaces/datatable.interface';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { AdminService } from './../../../../../shared/services/admin.service';
declare var jQuery: any;
declare var moment: any;
declare var bootbox: any;
declare var window:any;

@Component({
  selector: 'all-premades',
  templateUrl: './all-premades.component.html',
  styleUrls: ['./all-premades.component.css', './../../../../../site/components/+analytics/assets/css/daterangepicker.css']
})
export class AllPremadesComponent extends Datatable implements OnInit {

  loading: boolean;
  edit: boolean;
  selectedItem: any;
  calculatorForm: FormGroup;
  calculators: any = [];
  rejectedCalcs: any = [];
  $subscription;
  errorMessage = '';;
  loader = false;
  mt = moment;
  modalSelected = 'premadeCalc';
  domain = '';
  fetchedApps = [];
  allApps;
  @ViewChild('fileUpload') fileUpload: any;
  industries:any= [];
  templates = [];
  // templates= [
  //   ['one-page-card-new','Chicago'],
  //   ['sound-cloud-v3','Londoner'],
  //   ['template-seven','Seattle'],
  //   ['inline-temp-new','Greek'],
  //   ['experian','Tokyo'],
  //   ['template-five','Madrid'],
  //   ['template-six','Stockholm'],
  //   ['template-eight',]
  // ];
  scriptLoaded = false;
  constructor(private _fb: FormBuilder,
    private _calculatorService: PremadeCalcsService,
    private _adminService: AdminService,
    private _script: Script) {
    super();
  }

  ngOnInit() {

    this.calculatorForm = this._calculatorService.getForm();
    this.getCalculators();
  }
  ngAfterViewInit() {
    this._script.load('daterangepicker')
      .then((data) => {
        console.log(data);
        this.scriptLoaded = true;
      })
  }
  getCalculators() {
    this.loading = true;
    let obj = {
      limit: this.current_limit,
      page: this.current_page - 1,
      searchKey: this.search
    };
    this._calculatorService.getCalculators(obj).subscribe((response) => {
      this.loading = false;
      this.total_pages = Math.ceil(response.count / this.current_limit);
      this.calculators = response.calculators;
      this.errorMessage = '';
      this.templates = this._adminService.availableTemplates;
      this.industries = this.addNewEntries([...this.industries,...response.industries]);
    }, error => {
      this.loading = false;
      this.errorMessage = error.message;
      console.log("Error: ", error);
    })
  }
  addCalculator(data, btn) {
    if(data['otherIndustry'] && data['otherIndustry'].trim().toLowerCase() === 'other'){
      window.toastNotification(`Please change industry name other than other`)
      return;
    }
    if(data['otherIndustry'] && data['industry']==='other'){
      data['industry'] = this.getIndustry(this.industries,data['otherIndustry'].trim());
    }

    let calculatorData = Object.assign(data, this.extractData(data['live_url']));
    if (calculatorData['subdomain'] && calculatorData['calcName']) {
      this.requestToAdd([calculatorData], false, btn);
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Not Valid urls..';
    }
  }
  updateCalculator(data, btnRef) {
    btnRef && this.changeButtonProps(btnRef, { textContent: 'Please wait...', disabled: true });
    if(data['otherIndustry'] && data['otherIndustry'].trim().toLowerCase() === 'other'){
      window.toastNotification(`Please change industry name other than other`)
      return;
    }
    if(data['otherIndustry'] && data['industry']==='other'){
      data['industry'] = this.getIndustry(this.industries,data['otherIndustry'].trim());
    }
    this.$subscription = this._calculatorService.updateCalculator(Object.assign({}, this.selectedItem, data, this.extractData(data['live_url'])))
      .subscribe((response) => {
        console.log("Response", response);
        if (Object.keys(response).length == 0) {
          this.calculatorRejected();
          return;
        }
        else
          this.calculatorAdded();
        this.getCalculators();
        btnRef && this.changeButtonProps(btnRef, { textContent: 'Update', disabled: false });

      }, error => {
        this.errorMessage = error.error.err_message;
        btnRef && this.changeButtonProps(btnRef, { textContent: 'Update', disabled: false });

      });

  }
  calculatorRejected() {
    this.errorMessage = 'This calculator does not exists';
    this.calculatorForm.get('live_url').setValue('');
  }
  calculatorAdded() {
    jQuery("#add-calc").modal('hide');
    this.errorMessage = '';
  }
  requestToAdd(calculators, multi = false, btnRef: any = '') {
    if (calculators.length > 0) {
      (btnRef) &&
        this.changeButtonProps(btnRef, { textContent: 'Please wait...', disabled: true });
      this.$subscription = this._calculatorService.addPremadeCalc(calculators).subscribe((response) => {
        console.log(response['not_created'])
        let rejects = response['not_created'].map(obj => {
          return obj['live_url'];
        })
        this.rejectedCalcs = [...this.rejectedCalcs, ...rejects];
        if (!multi && rejects.length > 0) {
          this.calculatorRejected();
          (btnRef) &&
          this.changeButtonProps(btnRef, { textContent: 'Add' });
          return;
        }
        if (!multi && response['created'].length == 1) {
          this.calculatorAdded();
          this.rejectedCalcs = [];
        };
        this.calculatorForm.reset();
        this.getCalculators();
        (btnRef) &&
          this.changeButtonProps(btnRef, { textContent: 'Add' });
      }, error => {
        this.errorMessage = error.error.message;
        this.changeButtonProps(btnRef, { textContent: 'Add' });
      })
      this.errorMessage = '';
    } else {
      this.errorMessage = 'There is no calculators to add';
    }
  }
  changeButtonProps(ref, prop = {}) {
    Object.keys(prop).forEach(key => {
      ref[key] = prop[key];
    })
  }
  fileChange(event) {
    this.rejectedCalcs = [];
    let files: FileList = event.target.files;
    if (files && files.length > 0) {
      let file: File = files.item(0);
      if (file.type == 'text/csv') {
        let reader: FileReader = new FileReader();
        reader.readAsText(file);
        reader.onload = (e) => {
          let csv: string = reader.result;
          this.csvToCalculators(csv);
        }
        this.errorMessage = '';
      } else this.errorMessage = 'Only Csv files are allowed...';

    } else this.errorMessage = 'No file selected..';

  }
  csvToCalculators(csv) {
    let lines = csv.split('\n');
    if (lines.length > 0) {
      let calculators = lines.reduce((acc, line) => {
        let row = line.split(',');
        if (row[1] && !this.testliveUrl(row[1])) {
          this.rejectedCalcs.push(row[1]);
          return acc;
        }
        if (!row[1]) return acc;
        let template = this.getTemplateType(row[4], 'name');
        let obj = {
          title: row[0],
          live_url: row[1],
          media: row[2],
          type: (typeof (row[3]) == 'string' || row[3]) ? (row[3].trim() ? row[3] : 'Calculator') : 'Calculator',
          template: template,
          industry: (typeof (row[5]) == 'string' || row[5]) ? (row[5].trim() ? row[5] : 'Auto') : 'Auto',
          tier: (typeof (row[6]) == 'string' || row[6]) ? (row[6].trim() ? row[6] : 'standard') : 'standard',
          description: row[7]
        };
        obj = Object.assign(obj, this.extractData(obj['live_url']));
        if (obj['subdomain'] && obj['calcName']) acc.push(obj);
        else if (obj && Object.keys(obj).length > 1) {
          this.rejectedCalcs.push(row[1]);
        }
        return acc;
      }, []);
      this.errorMessage = '';
      console.log(calculators);
      this.requestToAdd(calculators, true);
    } else {
      this.errorMessage = "No data in this file";
    }
  }
  extractData(value) {
    if (!value) return {};
    let obj = {};
    value = value.replace(/^(http|https|ftp)?(:\/\/)/igm, '');
    let arr = value.split('/');
    obj['calcName'] = arr[1];
    obj['subdomain'] = arr[0] ? arr[0].split('.')[0] : null;
    return obj;
  }
  testliveUrl(url) {
    return (/^(http|https|ftp)?(:\/\/)?([a-zA-Z0-9]+){3,}(\.)(outgrow|rely)(\.)(local|us|co|co.in)\/([a-zA-Z0-9_-]+)$/.test(url));
  }

  dateFormat(date: any) {
    let d = new Date(date);
    return d.toString().split('GMT')[0];
  }

  paging(num: number) {
    super.paging(num);
    this.getCalculators();
  }

  limitChange(event: any) {
    super.limitChange(event);
    this.getCalculators();
  }

  previous() {
    super.previous();
    this.getCalculators();
  }

  next() {
    super.next();
    this.getCalculators();
  }

  searchData() {
    super.searchData();
    this.getCalculators();
  }
  removeCalculator(id) {
    this._calculatorService.removeCalculator(id).subscribe((data) => {
      this.getCalculators();
    })
  }
  getTemplateType(name, prop) {
    if (!name) return this.templates[0][(prop == 'selector') ? 'name' : 'selector'];
    let item = this.templates.find((value) => {
      if (prop == 'name') {
        return value[prop] == `The ${name}`
      }
      return value[prop] == name;
    })
    return item[(prop == 'selector') ? 'name' : 'selector'];
  }
  editCalculator(index) {
    console.log(this.calculators[index]);
    this.selectedItem = this.calculators[index];
    console.log(this.selectedItem);
    this._calculatorService.setForm(this.selectedItem);
    setTimeout(() => {
      this.selectedItem['launch_date'] && (jQuery('.input-daterange-datepicker').data('daterangepicker').setStartDate(moment(this.selectedItem['launch_date']).utc().add(0, 'days').format('MM/DD/YYYY')),
        jQuery('.input-daterange-datepicker').data('daterangepicker').setEndDate(moment(this.selectedItem['launch_date']).utc().add(0, 'days').format('MM/DD/YYYY')));
      this.selectedItem['launch_date'] || (jQuery('.input-daterange-datepicker').data('daterangepicker').setStartDate(moment(new Date()).utc().add(0, 'days').format('MM/DD/YYYY')),
        jQuery('.input-daterange-datepicker').data('daterangepicker').setEndDate(moment(new Date()).utc().add(0, 'days').format('MM/DD/YYYY'))
      );
    }, 100);


    this.edit = true;
    this.errorMessage = '';
    this.loader = false;
  }
  upload(files: FileList, imgSrc: any) {
    console.log(files);
    let file: File = files.item(0);
    // console.log(file);
    if (file.type.startsWith('image/')) {
      if (file.size < 2097152) {
        this.loader = true;
        this.uploadImageToServer(file);
      } else {
        this.callBootBox(`File Size should be less than 2 Mb`);
      }
    }
  }
  uploadImageToServer(url) {
    this._adminService.uploadGif(url).subscribe((data) => {
      this.loader = false;
      console.log(data);
      this.calculatorForm.get('media').setValue(data);
    }, error => {
      this.loader = false;
      this.calculatorForm.get('media').setValue('');
      console.log(error.error);
      this.errorMessage = error.error.err_message;
    })
  }
  setLaunchDate(date) {
    console.log(date);
    this.calculatorForm.get('launch_date').setValue(date['start_date']);
  }
  fetchApps(id) {
    setTimeout(() => {
      jQuery('#appCountPicker .input-daterange-datepicker').data('daterangepicker').setStartDate(moment(new Date()).utc().add(0, 'days').format('MM/DD/YYYY'));
      jQuery('#appCountPicker .input-daterange-datepicker').data('daterangepicker').setEndDate(moment(new Date()).utc().add(0, 'days').format('MM/DD/YYYY'));

    }, 100);

    this.allApps = undefined;
    this.fetchedApps = [];
    this._adminService.getAppsCreatedByPremade(id).subscribe(res => {
      this.fetchedApps = res;
      this.allApps = res;
      // this.domain=this.getDomain();
    }, error => {

    })
  }
  getLink(sub_domain, url) {
    return `${environment.PROTOCOL}${sub_domain}.${environment.LIVE_EXTENSION}/${url}`;
  }
  callBootBox(message) {
    bootbox.dialog({
      closeButton: false,
      message: `<button type="button" class="bootbox-close-button close" data-dismiss="modal"
                                 aria-hidden="true" style="margin-top: -10px;">
                                 <i class="material-icons">close</i></button>
                              <div class="bootbox-body-left">
                                    <div class="mat-icon">
                                      <i class="material-icons">error</i>
                                    </div>
                                </div>
                                <div class="bootbox-body-right">
                                  <p>${message}</p>
                                </div>
                    `,
      buttons: {
        success: {
          label: "OK",
          className: "btn btn-ok btn-hover",
          callback: function () {
          }
        }
      }
    });
  }
  // filterApps(date){
  //     console.log(date);
  //     if(this.allApps){
  //       this.fetchedApps=this.allApps.filter(app=>{
  //           let startDateMs = moment(`${date['start_date']} 0.00`, "YYYY-MM-DD H:mm").valueOf();
  //           let endDateMs = moment(`${date['end_date']} 0.00`, "YYYY-MM-DD H:mm").valueOf();
  //           let appcreateMs = moment(app.createdAt).valueOf();
  //           return (startDateMs<=appcreateMs && appcreateMs<=endDateMs);
  //       })
  //     }
  // }
  addNewEntries(industries){
    const arr = new Set(industries);
    return Array.from(arr);
  }
  getIndustry(industries,newIndustry){
    let lowerCaseIndustries = industries.map(ind => ind.toLowerCase());
    if(lowerCaseIndustries.includes(newIndustry.toLowerCase())){
      return industries[lowerCaseIndustries.findIndex(ind => (ind === newIndustry.toLowerCase()))];
    }
    return newIndustry;
  }
}
