import 'file-loader?name=index.html!extract-loader!html-loader?interpolate!./index.html';
import './style.scss';
import 'font-awesome/scss/font-awesome.scss';
import App from './App';


const app = new App(document.body.querySelector('div')!);
app.update();


