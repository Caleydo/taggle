import 'file-loader?name=lineup.html!extract-loader!html-loader?interpolate!./index.html';
import '../style.scss';
import 'font-awesome/scss/font-awesome.scss';
import App from './LineUp';


const app = new App(document.body.querySelector('div')!);
app.update();
