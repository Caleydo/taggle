import 'file-loader?name=index.html!extract-loader!html-loader?interpolate!./index.html';
import './style.scss';
import 'font-awesome/scss/font-awesome.scss';
import {create} from './lineup';

create(document.body.querySelector('div')!);
