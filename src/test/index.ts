import 'file-loader?name=test.html!extract-loader!html-loader?interpolate!./index.html';
import '../style.scss';
import 'font-awesome/scss/font-awesome.scss';
import App from '../App';
import TestRenderer from './TestRenderer';


const app = new App(document.body.querySelector('div')!, TestRenderer);
app.update();
